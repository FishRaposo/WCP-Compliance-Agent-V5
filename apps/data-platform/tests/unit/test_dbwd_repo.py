from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.repositories.dbwd_repo import get_rate_by_trade_locality, get_rates


@pytest.mark.unit
async def test_get_rates_empty():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_rates(session)
    assert result == []


@pytest.mark.unit
async def test_get_rates_with_trade_filter():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_rates(session, trade="Electrician")
    assert result == []


@pytest.mark.unit
async def test_get_rate_by_trade_locality_not_found():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = None
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_rate_by_trade_locality(session, "Electrician", "Washington, DC")
    assert result is None
