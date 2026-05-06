from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import ContractCreate, ContractFilters, ContractUpdate
from wcp_data.repositories.contract_repo import (
    create_contract,
    get_contract,
    list_contracts,
    update_contract,
)


@pytest.mark.unit
async def test_create_contract_raises_on_duplicate():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar.return_value = 1
    session.execute = AsyncMock(return_value=mock_count_result)
    data = ContractCreate(
        contract_number="DUP-001",
        project_name="Test Project",
        contractor_name="Test Contractor",
        locality="Test Locality",
        start_date="2026-01-01",
    )
    with pytest.raises(ValueError, match="already exists"):
        await create_contract(session, data)


@pytest.mark.unit
async def test_create_contract_success():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar.return_value = 0
    mock_insert_result = MagicMock()
    row_mock = MagicMock()
    row_mock._mapping = {
        "id": "abc-123",
        "contract_number": "NEW-001",
        "project_name": "Test Project",
        "contractor_name": "Test Contractor",
        "contractor_ein": None,
        "agency": None,
        "locality": "Test Locality",
        "start_date": "2026-01-01",
        "end_date": None,
        "total_value": None,
        "status": "active",
        "source": "manual",
        "source_reference": None,
        "metadata": {},
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_insert_result.first.return_value = row_mock
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_insert_result])
    session.commit = AsyncMock()
    data = ContractCreate(
        contract_number="NEW-001",
        project_name="Test Project",
        contractor_name="Test Contractor",
        locality="Test Locality",
        start_date="2026-01-01",
    )
    result = await create_contract(session, data)
    assert result.contract_number == "NEW-001"


@pytest.mark.unit
async def test_get_contract_not_found():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = None
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_contract(session, "nonexistent")
    assert result is None


@pytest.mark.unit
async def test_list_contracts_empty():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 0
    mock_list_result = MagicMock()
    mock_list_result.fetchall.return_value = []
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_list_result])
    filters = ContractFilters()
    items, total = await list_contracts(session, filters)
    assert items == []
    assert total == 0


@pytest.mark.unit
async def test_list_contracts_with_status_filter():
    session = AsyncMock()
    mock_count_result = MagicMock()
    mock_count_result.scalar_one.return_value = 1
    mock_list_result = MagicMock()
    row_mock = MagicMock()
    row_mock._mapping = {
        "id": "ctr-001",
        "contract_number": "ACTIVE-001",
        "project_name": "Active Project",
        "contractor_name": "TestCo",
        "contractor_ein": None,
        "agency": None,
        "locality": "DC",
        "start_date": "2026-01-01",
        "end_date": None,
        "total_value": None,
        "status": "active",
        "source": "manual",
        "source_reference": None,
        "metadata": {},
        "decision_count": 0,
        "payroll_record_count": 0,
        "latest_decision_at": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_list_result.fetchall.return_value = [row_mock]
    session.execute = AsyncMock(side_effect=[mock_count_result, mock_list_result])
    filters = ContractFilters(status="active")
    items, total = await list_contracts(session, filters)
    assert total == 1
    assert items[0].status == "active"


@pytest.mark.unit
async def test_update_contract_success():
    session = AsyncMock()
    session.commit = AsyncMock()
    mock_result = MagicMock()
    row_mock = MagicMock()
    row_mock._mapping = {
        "id": "ctr-001",
        "contract_number": "UPD-001",
        "project_name": "Updated Project",
        "contractor_name": "TestCo",
        "contractor_ein": None,
        "agency": None,
        "locality": "DC",
        "start_date": "2026-01-01",
        "end_date": None,
        "total_value": None,
        "status": "active",
        "source": "manual",
        "source_reference": None,
        "metadata": {},
        "decision_count": 0,
        "payroll_record_count": 0,
        "latest_decision_at": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    mock_result.first.return_value = row_mock
    session.execute = AsyncMock(return_value=mock_result)
    data = ContractUpdate(project_name="Updated Project")
    result = await update_contract(session, "ctr-001", data)
    assert result is not None
    assert result.project_name == "Updated Project"
