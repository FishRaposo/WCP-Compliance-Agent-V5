"""WC-02: rate provenance and safe abstention.

Missing or ambiguous governing rates must never silently become verified
coverage: unknown trades stay FAIL, unmapped localities stay WARNING, and an
approximate (fuzzy) trade match is flagged for review rather than substituted
silently.
"""
from datetime import date

import pytest

from wcp_compliance.dbwd_matching.rate_lookup import (
    get_dbwd_rate,
    get_dbwd_rate_with_provenance,
)
from wcp_compliance.models.enums import CheckStatus
from wcp_compliance.models.schemas import (
    ContractorInfo,
    EmployeeRecord,
    ExtractedWCP,
    ProjectInfo,
)
from wcp_compliance.rules.engine import run_rule_engine


def _extracted(trade: str, location: str = "Washington, DC") -> ExtractedWCP:
    return ExtractedWCP(
        job_id="prov-job-001",
        contractor=ContractorInfo(name="ABC Construction", address="123 Main St", ein="12-3456789"),
        project=ProjectInfo(
            name="Federal Building Renovation",
            location=location,
            contract_number="CTR-2025-001",
            wage_determination_number="DC-2025-001",
        ),
        employees=[
            EmployeeRecord(
                name="Worker One",
                trade_classification=trade,
                hours_worked=40.0,
                overtime_hours=0.0,
                hourly_wage=55.00,
                fringe_benefits=1400.00,
                gross_earnings=2200.00,
                deductions=150.00,
                net_wages=2050.00,
            )
        ],
        certification_date=date(2025, 6, 15),
        payroll_number=1,
        week_ending=date(2025, 6, 14),
    )


@pytest.mark.asyncio
async def test_exact_match_reports_exact_provenance():
    record, kind = await get_dbwd_rate_with_provenance(
        "Electrician", "Washington, DC", "2025-06-01"
    )
    assert kind == "exact"
    assert record.trade == "Electrician"
    assert record.wage_determination_number == "DC-2025-001"


@pytest.mark.asyncio
async def test_fuzzy_match_is_flagged_not_silent():
    record, kind = await get_dbwd_rate_with_provenance(
        "Electriciann", "Washington, DC", "2025-06-01"
    )
    assert kind == "fuzzy"
    assert record.trade == "Electrician"

    report = await run_rule_engine(_extracted("Electriciann"))
    flags = [
        c for c in report.checks
        if c.check_type.value == "classification" and c.status == CheckStatus.WARNING
        and "approximately" in c.message
    ]
    assert len(flags) == 1
    assert "Electrician" in flags[0].message


@pytest.mark.asyncio
async def test_missing_trade_stays_fail_not_approved():
    report = await run_rule_engine(_extracted("Zzz No Trade"))
    assert any(
        c.check_type.value == "classification" and c.status == CheckStatus.FAIL
        for c in report.checks
    )
    assert report.overall_status.value == "fail"


@pytest.mark.asyncio
async def test_unmapped_locality_warns_and_abstains():
    report = await run_rule_engine(_extracted("Electrician", location="Nowhere, ZZ"))
    assert any(c.status == CheckStatus.WARNING for c in report.checks)
    assert report.overall_status.value == "warnings"


@pytest.mark.asyncio
async def test_get_dbwd_rate_preserves_legacy_signature():
    record = await get_dbwd_rate("Plumber", "Washington, DC", "2025-06-01")
    assert record.trade == "Plumber"
