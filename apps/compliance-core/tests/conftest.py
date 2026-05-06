from datetime import date

import pytest
from fastapi.testclient import TestClient

from wcp_compliance.main import create_app
from wcp_compliance.models.schemas import (
    ContractorInfo,
    DBWDRateRecord,
    EmployeeRecord,
    ExtractedWCP,
    ProjectInfo,
)


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


@pytest.fixture
def sample_extracted_wcp() -> ExtractedWCP:
    return ExtractedWCP(
        job_id="test-job-001",
        contractor=ContractorInfo(
            name="ABC Construction",
            address="123 Main St, Washington, DC",
            ein="12-3456789",
        ),
        project=ProjectInfo(
            name="Federal Building Renovation",
            location="Washington, DC",
            contract_number="CTR-2025-001",
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
            ),
            EmployeeRecord(
                name="Jane Doe",
                trade_classification="Plumber",
                hours_worked=45.0,
                overtime_hours=5.0,
                hourly_wage=50.00,
                fringe_benefits=1200.00,
                gross_earnings=2625.00,
                deductions=200.00,
                net_wages=2425.00,
            ),
        ],
        certification_date=date(2025, 6, 15),
        payroll_number=1,
        week_ending=date(2025, 6, 14),
    )


@pytest.fixture
def sample_dbwd_rate() -> DBWDRateRecord:
    return DBWDRateRecord(
        trade="Electrician",
        locality="Washington, DC",
        rate=51.69,
        fringe=34.63,
        effective_date=date(2025, 1, 1),
        wage_determination_number="DC-2025-001",
    )
