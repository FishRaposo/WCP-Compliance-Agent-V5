from __future__ import annotations

import asyncio

from wcp_compliance.checks import _slugify
from wcp_compliance.checks.fringe_check import check_fringe
from wcp_compliance.checks.overtime_check import check_overtime
from wcp_compliance.checks.signature_check import check_signature
from wcp_compliance.checks.total_check import check_totals
from wcp_compliance.checks.wage_check import check_wage
from wcp_compliance.dbwd_matching.rate_lookup import get_dbwd_rate
from wcp_compliance.models.enums import CheckStatus, CheckType, OverallStatus, VerdictStatus
from wcp_compliance.models.schemas import (
    ComplianceCheck,
    DBWDRateRecord,
    DeterministicReport,
    EmployeeRecord,
    ExtractedWCP,
    LLMVerdict,
)


async def run_rule_engine(extracted: ExtractedWCP) -> DeterministicReport:
    checks: list[ComplianceCheck] = []
    dbwd_rates: list[DBWDRateRecord] = []

    unique_trades = {e.trade_classification for e in extracted.employees}
    trade_to_rate: dict[str, DBWDRateRecord] = {}
    effective_date = extracted.week_ending.isoformat() if extracted.week_ending else "2026-01-01"
    locality = extracted.project.location or "Washington, DC"

    rate_tasks = [
        _fetch_dbwd_rate(trade, locality, effective_date)
        for trade in unique_trades
    ]
    rate_results = await asyncio.gather(*rate_tasks, return_exceptions=True)

    for trade, result in zip(unique_trades, rate_results):
        if isinstance(result, DBWDRateRecord):
            dbwd_rates.append(result)
            trade_to_rate[trade] = result
        else:
            error_msg = str(result)
            # Decide WARNING vs FAIL purely from the error semantics, never from
            # the shape of the locality string. A locality lookup miss is a
            # warning (rates may simply be unmapped for that area); a
            # trade-not-found error is a real compliance gap (wage/fringe checks
            # are skipped for that employee) and must stay a FAIL.
            is_locality_warning = "locality" in error_msg.lower()
            checks.append(
                ComplianceCheck(
                    check_id=f"classification_{trade.lower().replace(' ', '_')}",
                    check_type=CheckType.CLASSIFICATION,
                    employee_name="_multiple_",
                    status=CheckStatus.WARNING if is_locality_warning else CheckStatus.FAIL,
                    expected_value=None,
                    actual_value=None,
                    variance=None,
                    regulation_cite="29 C.F.R. § 5.5(a)(3)(i)",
                    message=(
                        f"{result}; "
                        "prevailing wage compliance was not verified"
                    ),
                )
            )

    for employee in extracted.employees:
        rate = trade_to_rate.get(employee.trade_classification)

        if rate:
            checks.append(check_wage(employee, rate))
            checks.append(check_fringe(employee, rate))

        checks.append(check_overtime(employee))
        checks.append(check_totals(employee))
        checks.extend(_check_data_integrity(employee))
        checks.append(_check_minimum_wage_sanity(employee))

    checks.append(check_signature(extracted))

    violation_count = sum(1 for c in checks if c.status == CheckStatus.FAIL)
    warning_count = sum(1 for c in checks if c.status == CheckStatus.WARNING)
    passed_count = sum(1 for c in checks if c.status == CheckStatus.PASS)

    if violation_count > 0:
        overall_status = OverallStatus.FAIL
    elif warning_count > 0:
        overall_status = OverallStatus.WARNINGS
    else:
        overall_status = OverallStatus.PASS

    return DeterministicReport(
        job_id=extracted.job_id,
        report_id=extracted.report_id,
        artifact_id=extracted.artifact_id,
        checks=checks,
        overall_status=overall_status,
        violation_count=violation_count,
        warning_count=warning_count,
        passed_count=passed_count,
        dbwd_rates_used=dbwd_rates,
    )


async def _fetch_dbwd_rate(trade: str, locality: str, effective_date: str) -> DBWDRateRecord:
    return await get_dbwd_rate(trade, locality, effective_date)


def _check_data_integrity(employee: EmployeeRecord) -> list[ComplianceCheck]:
    results = []

    # 1. Hourly wage check
    wage_ok = employee.hourly_wage > 0
    results.append(
        ComplianceCheck(
            check_id=f"integrity_wage_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.PASS if wage_ok else CheckStatus.FAIL,
            expected_value=None,
            actual_value=employee.hourly_wage,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=(
                "Data integrity: hourly wage is positive" if wage_ok
                else "Data integrity error: hourly wage must be positive"
            ),
        )
    )

    # 2. Hours negative check
    hours_non_negative = employee.hours_worked >= 0
    results.append(
        ComplianceCheck(
            check_id=f"integrity_hours_non_neg_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.PASS if hours_non_negative else CheckStatus.FAIL,
            expected_value=None,
            actual_value=employee.hours_worked,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=(
                "Data integrity: hours worked is non-negative" if hours_non_negative
                else "Data integrity error: hours worked cannot be negative"
            ),
        )
    )

    # 3. Hours max check
    hours_max_ok = employee.hours_worked <= 168
    results.append(
        ComplianceCheck(
            check_id=f"integrity_hours_max_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.PASS if hours_max_ok else CheckStatus.FAIL,
            expected_value=None,
            actual_value=employee.hours_worked,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=(
                "Data integrity: hours worked does not exceed 168" if hours_max_ok
                else "Data integrity error: hours worked exceeds 168 (impossible)"
            ),
        )
    )

    # 4. Deductions check: must be non-negative AND not exceed gross earnings.
    # Negative deductions would inflate net wages, so they are an integrity error.
    deductions_value = employee.deductions or 0.0
    deductions_negative = deductions_value < 0
    deductions_exceed_gross = deductions_value > employee.gross_earnings
    deductions_ok = not deductions_negative and not deductions_exceed_gross
    if deductions_ok:
        deductions_message = "Data integrity: deductions do not exceed gross earnings"
    elif deductions_negative:
        deductions_message = "Data integrity error: deductions cannot be negative"
    else:
        deductions_message = "Data integrity error: deductions exceed gross earnings"
    results.append(
        ComplianceCheck(
            check_id=f"integrity_deductions_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.PASS if deductions_ok else CheckStatus.FAIL,
            expected_value=None,
            actual_value=employee.deductions,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=deductions_message,
        )
    )

    # 5. Net wages check
    net_ok = employee.net_wages >= 0
    results.append(
        ComplianceCheck(
            check_id=f"integrity_net_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.PASS if net_ok else CheckStatus.FAIL,
            expected_value=None,
            actual_value=employee.net_wages,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=(
                "Data integrity: net wages is non-negative" if net_ok
                else "Data integrity error: net wages cannot be negative"
            ),
        )
    )

    return results


def _check_minimum_wage_sanity(employee: EmployeeRecord) -> ComplianceCheck:
    federal_minimum_wage = 7.25

    if employee.hourly_wage < federal_minimum_wage:
        return ComplianceCheck(
            check_id=f"minwage_{_slugify(employee.name)}",
            check_type=CheckType.MINIMUM_WAGE,
            employee_name=employee.name,
            status=CheckStatus.FAIL,
            expected_value=federal_minimum_wage,
            actual_value=employee.hourly_wage,
            variance=federal_minimum_wage - employee.hourly_wage,
            regulation_cite="29 U.S.C. \u00a7 206(a)(1)",
            message=(
                f"Hourly wage ${employee.hourly_wage:.2f} is below "
                f"federal minimum wage ${federal_minimum_wage:.2f}"
            ),
        )

    return ComplianceCheck(
        check_id=f"minwage_{_slugify(employee.name)}",
        check_type=CheckType.MINIMUM_WAGE,
        employee_name=employee.name,
        status=CheckStatus.PASS,
        expected_value=federal_minimum_wage,
        actual_value=employee.hourly_wage,
        variance=employee.hourly_wage - federal_minimum_wage,
        regulation_cite="29 U.S.C. \u00a7 206(a)(1)",
        message=(
            f"Hourly wage meets federal minimum "
            f"(${employee.hourly_wage:.2f} >= ${federal_minimum_wage:.2f})"
        ),
    )


def compute_trust_components(
    deterministic: DeterministicReport,
    llm_verdict: LLMVerdict,
) -> dict[str, float]:
    violation_ratio = deterministic.violation_count / max(len(deterministic.checks), 1)
    deterministic_score = 1.0 - violation_ratio
    classification_score = _compute_classification_score(deterministic)
    llm_score = llm_verdict.confidence
    agreement_score = _compute_agreement(deterministic, llm_verdict)

    return {
        "deterministic": 0.35 * deterministic_score,
        "classification": 0.25 * classification_score,
        "llm_self": 0.20 * llm_score,
        "agreement": 0.20 * agreement_score,
    }


def _compute_classification_score(deterministic: DeterministicReport) -> float:
    """Derive the classification confidence from the actual CLASSIFICATION and
    DATA_INTEGRITY check outcomes (ratio passed) rather than a hardcoded constant.

    A WARNING counts as a partial pass; only FAIL fully detracts. When no such
    checks exist, fall back to a neutral-high default so this component does not
    artificially penalize reports without classification/integrity checks.
    """
    relevant = [
        c
        for c in deterministic.checks
        if c.check_type in (CheckType.CLASSIFICATION, CheckType.DATA_INTEGRITY)
    ]
    if not relevant:
        return 0.95

    weight = 0.0
    for check in relevant:
        if check.status == CheckStatus.PASS:
            weight += 1.0
        elif check.status == CheckStatus.WARNING:
            weight += 0.5

    return weight / len(relevant)


def _compute_agreement(
    deterministic: DeterministicReport, llm_verdict: LLMVerdict
) -> float:
    has_violations = deterministic.violation_count > 0
    llm_approved = llm_verdict.verdict == VerdictStatus.APPROVED

    if has_violations and llm_approved:
        return 0.0
    elif not has_violations and llm_approved:
        return 1.0
    else:
        return 0.5
