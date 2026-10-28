from datetime import date

import pytest

from wcp_compliance.models.schemas import ContractorInfo, EmployeeRecord, ExtractedWCP, ProjectInfo


@pytest.mark.asyncio
async def test_actual_validation_abstains_when_rate_scope_is_missing():
    from wcp_compliance.api.validate import validate_wcp

    x = ExtractedWCP(
        job_id="audit-scope",
        contractor=ContractorInfo(name="Synthetic"),
        project=ProjectInfo(name="Synthetic", location=""),
        employees=[
            EmployeeRecord(
                name="Audit Employee",
                trade_classification="Electrician",
                hours_worked=40,
                hourly_wage=60,
                fringe_benefits=2000,
                gross_earnings=2400,
                net_wages=2400,
            )
        ],
        certification_date=date(2026, 1, 2),
    )
    report = await validate_wcp(x)
    assert report.overall_status != "pass"
    assert report.warning_count > 0


@pytest.mark.asyncio
async def test_http_extract_validate_reuses_completeness_authority():
    from wcp_compliance.api.validate import ExtractAndValidateRequest, extract_and_validate

    text = "\n".join([
        "Contractor: Audit Synthetic", "Project: Audit", "Certified: 2026-01-02",
        "Employee: Audit Employee", "Trade: Electrician", "Hours: 40",
        "Hourly wage: 60", "Fringe: 2000", "Gross: 2400", "Deductions: 0", "Net: 2400",
    ])
    report = await extract_and_validate(ExtractAndValidateRequest(text=text))
    assert report.overall_status != "pass"
    assert report.warning_count > 0


@pytest.mark.asyncio
async def test_unmatched_requested_determination_is_not_substituted():
    from wcp_compliance.rules.engine import run_rule_engine

    x = ExtractedWCP(
        job_id="audit-wd",
        contractor=ContractorInfo(name="Synthetic"),
        project=ProjectInfo(
            name="Synthetic", location="Washington, DC", wage_determination_number="DC-2099-999"
        ),
        employees=[
            EmployeeRecord(
                name="Audit Employee",
                trade_classification="Electrician",
                hours_worked=40,
                hourly_wage=60,
                fringe_benefits=2000,
                gross_earnings=2400,
                net_wages=2400,
            )
        ],
        certification_date=date(2026, 1, 2),
        week_ending=date(2026, 1, 1),
    )
    report = await run_rule_engine(x)
    assert not report.dbwd_rates_used
    assert report.warning_count > 0

@pytest.mark.asyncio
async def test_explicit_valid_no_work_matches_structured_validation_and_missing_data_does_not():
 from wcp_compliance.api.validate import (
     ExtractAndValidateRequest,
     extract_and_validate,
     validate_wcp,
 )
 from wcp_compliance.extraction import extract_from_text
 text='\n'.join([
    'Contractor: Review Synthetic',
    'Project: Review Synthetic',
    'Project location: Washington, DC',
    'Wage determination: DC-2025-001',
    'Week ending: 2026-01-10',
    'Certification date: 2026-01-15',
    'Payroll number: 1',
    'No Work Performed',
])
 structured=await validate_wcp(extract_from_text(text))
 actual=await extract_and_validate(ExtractAndValidateRequest(text=text))
 assert actual.overall_status==structured.overall_status=='pass'
 assert actual.warning_count==structured.warning_count==0
 missing=await extract_and_validate(
    ExtractAndValidateRequest(text=text.replace('No Work Performed','UNPARSEABLE TABLE'))
)
 assert missing.overall_status!='pass'
