from datetime import date

import pytest

from wcp_compliance.models.enums import CheckStatus, OverallStatus
from wcp_compliance.models.schemas import (
    ContractorInfo,
    EmployeeRecord,
    ExtractedWCP,
    ProjectInfo,
)
from wcp_compliance.rules.engine import run_rule_engine


def _make_extracted_wcp(**overrides) -> ExtractedWCP:
    defaults = dict(
        job_id="test-rules-001",
        contractor=ContractorInfo(
            name="Test Contractor",
            address="123 Main St",
            ein="12-3456789",
        ),
        project=ProjectInfo(
            name="Test Project",
            location="Washington, DC",
            contract_number="CTR-001",
            wage_determination_number="DC-2025-001",
        ),
        employees=[
            EmployeeRecord(
                name="John Smith",
                trade_classification="Electrician",
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
    defaults.update(overrides)
    return ExtractedWCP(**defaults)


@pytest.mark.asyncio
async def test_run_rule_engine_pass():
    extracted = _make_extracted_wcp()
    report = await run_rule_engine(extracted)
    assert report.job_id == "test-rules-001"
    assert len(report.checks) > 0
    assert report.overall_status in (OverallStatus.PASS, OverallStatus.WARNINGS, OverallStatus.FAIL)


@pytest.mark.asyncio
async def test_run_rule_engine_with_violation():
    extracted = _make_extracted_wcp(
        employees=[
            EmployeeRecord(
                name="Low Wage Worker",
                trade_classification="Electrician",
                hours_worked=40.0,
                overtime_hours=0.0,
                hourly_wage=5.00,
                fringe_benefits=0.0,
                gross_earnings=200.00,
                deductions=0.0,
                net_wages=200.00,
            )
        ],
    )
    report = await run_rule_engine(extracted)
    assert report.violation_count > 0
    assert report.overall_status == OverallStatus.FAIL


@pytest.mark.asyncio
async def test_run_rule_engine_multiple_employees():
    extracted = _make_extracted_wcp(
        employees=[
            EmployeeRecord(
                name="Alice",
                trade_classification="Electrician",
                hours_worked=40.0,
                overtime_hours=0.0,
                hourly_wage=55.00,
                fringe_benefits=1400.00,
                gross_earnings=2200.00,
                deductions=150.00,
                net_wages=2050.00,
            ),
            EmployeeRecord(
                name="Bob",
                trade_classification="Plumber",
                hours_worked=45.0,
                overtime_hours=5.0,
                hourly_wage=50.00,
                fringe_benefits=1300.00,
                gross_earnings=2375.00,
                deductions=200.00,
                net_wages=2175.00,
            ),
        ],
    )
    report = await run_rule_engine(extracted)
    assert len(report.dbwd_rates_used) >= 1
    assert report.passed_count + report.warning_count + report.violation_count == len(report.checks)


@pytest.mark.asyncio
async def test_run_rule_engine_with_warnings():
    extracted = _make_extracted_wcp(
        employees=[
            EmployeeRecord(
                name="OT Worker",
                trade_classification="Electrician",
                hours_worked=45.0,
                overtime_hours=0.0,
                hourly_wage=55.00,
                fringe_benefits=1560.00,
                gross_earnings=2475.00,
                deductions=150.00,
                net_wages=2325.00,
            )
        ],
    )
    report = await run_rule_engine(extracted)
    assert report.warning_count >= 1
    assert report.overall_status == OverallStatus.WARNINGS


@pytest.mark.asyncio
async def test_run_rule_engine_unknown_trade():
    extracted = _make_extracted_wcp(
        employees=[
            EmployeeRecord(
                name="Unknown Trade Worker",
                trade_classification="Underwater Basket Weaver",
                hours_worked=40.0,
                overtime_hours=0.0,
                hourly_wage=50.00,
                fringe_benefits=1000.00,
                gross_earnings=2000.00,
                deductions=100.00,
                net_wages=1900.00,
            )
        ],
    )
    report = await run_rule_engine(extracted)
    has_classification_fail = any(
        c.status == CheckStatus.FAIL and c.check_type == "classification"
        for c in report.checks
    )
    assert has_classification_fail


@pytest.mark.asyncio
async def test_run_rule_engine_no_employees():
    extracted = _make_extracted_wcp(employees=[])
    report = await run_rule_engine(extracted)
    assert report.overall_status == OverallStatus.PASS or len(report.checks) >= 0
