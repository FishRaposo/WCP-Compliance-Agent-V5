from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import PayrollFilters, PayrollRecordCreate
from wcp_data.repositories.payroll_repo import bulk_insert_payrolls, get_payroll, list_payrolls


@pytest.mark.unit
async def test_bulk_insert_payrolls_empty():
    session = AsyncMock()
    session.commit = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock())
    result = await bulk_insert_payrolls(session, "ctr-001", [])
    assert result == []


@pytest.mark.unit
async def test_bulk_insert_payrolls_single_record():
    from decimal import Decimal
    from datetime import date

    session = AsyncMock()
    session.commit = AsyncMock()
    mock_result = MagicMock()
    row_mock = MagicMock()
    row_mock._mapping = {
        "id": "pay-001",
        "contract_id": "ctr-001",
        "employee_name": "John Doe",
        "employee_id_hash": None,
        "trade_code": "ELEC",
        "locality_code": "DC",
        "week_ending": date(2025, 1, 12),
        "hours_monday": None,
        "hours_tuesday": None,
        "hours_wednesday": None,
        "hours_thursday": None,
        "hours_friday": None,
        "hours_saturday": None,
        "hours_sunday": None,
        "total_hours": Decimal("40"),
        "hourly_rate": Decimal("55.00"),
        "gross_pay": Decimal("2200.00"),
        "fringe_rate": None,
        "fringe_total": None,
        "overtime_hours": Decimal("0"),
        "overtime_pay": Decimal("0"),
        "decision_id": None,
        "source_file": None,
        "ingestion_job_id": None,
        "created_at": "2025-01-01T00:00:00Z",
    }
    # PERF-02: Batch insert uses fetchall() instead of first()
    mock_result.fetchall.return_value = [row_mock]
    session.execute = AsyncMock(return_value=mock_result)
    record = PayrollRecordCreate(
        employee_name="John Doe",
        trade_code="ELEC",
        locality_code="DC",
        week_ending=date(2025, 1, 12),
        total_hours=Decimal("40"),
        hourly_rate=Decimal("55.00"),
        gross_pay=Decimal("2200.00"),
    )
    result = await bulk_insert_payrolls(session, "ctr-001", [record])
    assert len(result) == 1
    assert result[0].employee_name == "John Doe"


@pytest.mark.unit
async def test_list_payrolls_empty():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 0
    mock_list_result = MagicMock()
    mock_list_result.fetchall.return_value = []
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_list_result])
    filters = PayrollFilters()
    items, total = await list_payrolls(session, filters)
    assert items == []
    assert total == 0


@pytest.mark.unit
async def test_list_payrolls_with_contract_filter():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 0
    mock_list_result = MagicMock()
    mock_list_result.fetchall.return_value = []
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_list_result])
    filters = PayrollFilters(contract_id="ctr-001")
    items, total = await list_payrolls(session, filters)
    assert items == []


@pytest.mark.unit
async def test_get_payroll_not_found():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = None
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_payroll(session, "nonexistent", "ctr-001")
    assert result is None
