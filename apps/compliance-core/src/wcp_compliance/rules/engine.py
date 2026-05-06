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
            checks.append(
                ComplianceCheck(
                    check_id=f"classification_{trade.lower().replace(' ', '_')}",
                    check_type=CheckType.CLASSIFICATION,
                    employee_name="_multiple_",
                    status=CheckStatus.FAIL,
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
        checks.append(_check_data_integrity(employee))
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


def _check_data_integrity(employee: EmployeeRecord) -> ComplianceCheck:
    issues = []

    if employee.hourly_wage <= 0:
        issues.append("hourly wage must be positive")
    if employee.hours_worked < 0:
        issues.append("hours worked cannot be negative")
    if employee.hours_worked > 168:
        issues.append("hours worked exceeds 168 (impossible)")
    if (employee.deductions or 0) > employee.gross_earnings:
        issues.append("deductions exceed gross earnings")
    if employee.net_wages < 0:
        issues.append("net wages cannot be negative")

    if issues:
        return ComplianceCheck(
            check_id=f"integrity_{_slugify(employee.name)}",
            check_type=CheckType.DATA_INTEGRITY,
            employee_name=employee.name,
            status=CheckStatus.FAIL,
            expected_value=None,
            actual_value=None,
            variance=None,
            regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
            message=f"Data integrity issues: {'; '.join(issues)}",
        )

    return ComplianceCheck(
        check_id=f"integrity_{_slugify(employee.name)}",
        check_type=CheckType.DATA_INTEGRITY,
        employee_name=employee.name,
        status=CheckStatus.PASS,
        expected_value=None,
        actual_value=None,
        variance=None,
        regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)",
        message="Data integrity check passed",
    )


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
    classification_score = 0.95
    llm_score = llm_verdict.confidence
    agreement_score = _compute_agreement(deterministic, llm_verdict)

    return {
        "deterministic": 0.35 * deterministic_score,
        "classification": 0.25 * classification_score,
        "llm_self": 0.20 * llm_score,
        "agreement": 0.20 * agreement_score,
    }


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
