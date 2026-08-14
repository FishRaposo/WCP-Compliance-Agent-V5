from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from wcp_data.models.schemas import PayrollBulkImportRequest, PayrollRecordCreate
from wcp_data.services import payroll_service

pytestmark = pytest.mark.unit


@pytest.mark.asyncio
async def test_bulk_import_does_not_persist_records_that_fail_revalidation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    valid = PayrollRecordCreate(
        employee_name="Valid Worker",
        trade_code="ELEC",
        locality_code="DC",
        week_ending=date(2025, 1, 12),
        total_hours=Decimal(40),
        hourly_rate=Decimal(55),
        gross_pay=Decimal(2200),
    )
    # Simulates a value loaded by a permissive source adapter before the service
    # boundary. The service must still not insert it.
    invalid = PayrollRecordCreate.model_construct(
        employee_name="Invalid Worker",
        trade_code="ELEC",
        locality_code="DC",
        week_ending=date(2025, 1, 12),
        total_hours=Decimal(40),
        hourly_rate=Decimal(55),
        gross_pay=Decimal(2200),
        hours_monday=Decimal(25),
    )
    request = PayrollBulkImportRequest.model_construct(
        contract_id="contract-1", records=[valid, invalid], source="csv"
    )
    captured: list[PayrollRecordCreate] = []

    async def insert(_session, _contract_id, records, ingestion_job_id=None):
        captured.extend(records)
        return []

    monkeypatch.setattr(payroll_service, "_bulk_insert", AsyncMock(side_effect=insert))

    result = await payroll_service.bulk_import_payrolls(AsyncMock(), request)

    assert [record.employee_name for record in captured] == ["Valid Worker"]
    assert result.failed == 1
    assert result.created == 0
