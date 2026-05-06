from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import ContractCreate
from wcp_data.services.contract_service import create_contract


@pytest.mark.unit
async def test_contract_service_create_returns_response():
    from unittest.mock import patch

    mock_response = MagicMock()
    mock_response.contract_number = "SVC-001"
    mock_response.id = "test-id"

    with patch("wcp_data.services.contract_service._create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response
        session = AsyncMock()
        data = ContractCreate(
            contract_number="SVC-001",
            project_name="Service Test",
            contractor_name="Test Contractor",
            locality="Test Locality",
            start_date="2026-01-01",
        )
        result = await create_contract(session, data)
        assert result.contract_number == "SVC-001"
        mock_create.assert_called_once_with(session, data)


@pytest.mark.unit
async def test_contract_service_create_with_optional_fields():
    from unittest.mock import patch

    mock_response = MagicMock()
    mock_response.contract_number = "FULL-001"
    mock_response.id = "full-id"
    mock_response.contractor_ein = "12-3456789"
    mock_response.agency = "GSA"

    with patch("wcp_data.services.contract_service._create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response
        session = AsyncMock()
        data = ContractCreate(
            contract_number="FULL-001",
            project_name="Full Project",
            contractor_name="Full Contractor",
            contractor_ein="12-3456789",
            agency="GSA",
            locality="Washington, DC",
            start_date="2026-01-01",
            end_date="2026-12-31",
            source="manual",
        )
        result = await create_contract(session, data)
        assert result.contract_number == "FULL-001"
        assert result.contractor_ein == "12-3456789"


@pytest.mark.unit
async def test_contract_service_create_detects_duplicate():
    from unittest.mock import patch

    with patch("wcp_data.services.contract_service._create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = ValueError("Contract number already exists")
        session = AsyncMock()
        data = ContractCreate(
            contract_number="DUP-002",
            project_name="Dup Project",
            contractor_name="Dup Contractor",
            locality="DC",
            start_date="2026-01-01",
        )
        with pytest.raises(ValueError, match="already exists"):
            await create_contract(session, data)
