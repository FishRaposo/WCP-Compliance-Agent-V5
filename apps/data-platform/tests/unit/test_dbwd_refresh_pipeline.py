"""Unit tests for DBWD refresh pipeline — SAM.gov path + fallback + idempotency."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.unit

_SERVICE = "wcp_data.services.dbwd_service"


def _make_session():
    sess = AsyncMock()
    result = MagicMock()
    result.first.return_value = None
    sess.execute = AsyncMock(return_value=result)
    sess.commit = AsyncMock()
    return sess


@pytest.mark.asyncio
async def test_refresh_uses_fallback_when_no_api_key():
    """refresh_rates() uses fallback corpus when SAM_GOV_API_KEY is empty."""
    from wcp_data.services.dbwd_service import FALLBACK_CORPUS

    with patch(f"{_SERVICE}.settings") as mock_settings:
        mock_settings.sam_gov_api_key = ""
        sess = _make_session()
        from wcp_data.services.dbwd_service import refresh_rates
        count = await refresh_rates(sess, use_sam_gov=True)

    assert count == len(FALLBACK_CORPUS)
    sess.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_refresh_calls_sam_gov_when_api_key_set():
    """refresh_rates() calls SamGovClient when api_key is configured."""
    fake_rates = [
        {"trade_title": "Electrician", "locality_code": "DC", "wage": 51.69, "fringe": 34.63,
         "effective_date": "2025-01-01", "wage_determination_number": "DC-001"}
    ]
    mock_client = AsyncMock()
    mock_client.fetch_rates_for_locality = AsyncMock(return_value=fake_rates)

    with patch(f"{_SERVICE}.settings") as mock_settings, \
         patch(f"{_SERVICE}.SamGovClient", return_value=mock_client):
        mock_settings.sam_gov_api_key = "real-key"
        sess = _make_session()
        from wcp_data.services.dbwd_service import refresh_rates
        count = await refresh_rates(sess, use_sam_gov=True)

    assert count == 1
    mock_client.fetch_rates_for_locality.assert_awaited_once()


@pytest.mark.asyncio
async def test_refresh_falls_back_when_sam_gov_fails():
    """refresh_rates() falls back to corpus when SAM.gov raises SamGovError."""
    from wcp_data.connectors.sam_gov import SamGovError
    from wcp_data.services.dbwd_service import FALLBACK_CORPUS

    mock_client = AsyncMock()
    mock_client.fetch_rates_for_locality = AsyncMock(side_effect=SamGovError("network error"))

    with patch(f"{_SERVICE}.settings") as mock_settings, \
         patch(f"{_SERVICE}.SamGovClient", return_value=mock_client):
        mock_settings.sam_gov_api_key = "real-key"
        sess = _make_session()
        from wcp_data.services.dbwd_service import refresh_rates
        count = await refresh_rates(sess, use_sam_gov=True)

    assert count == len(FALLBACK_CORPUS)


@pytest.mark.asyncio
async def test_refresh_returns_upsert_count():
    """refresh_rates(use_sam_gov=False) returns count equal to FALLBACK_CORPUS length."""
    from wcp_data.services.dbwd_service import FALLBACK_CORPUS, refresh_rates

    with patch(f"{_SERVICE}.settings") as mock_settings:
        mock_settings.sam_gov_api_key = ""
        sess = _make_session()
        count = await refresh_rates(sess, use_sam_gov=False)

    assert count == len(FALLBACK_CORPUS)


@pytest.mark.asyncio
async def test_cache_invalidated_after_refresh():
    """refresh_rates() calls _cache_invalidate_pattern after successful upsert."""
    mock_invalidate = AsyncMock(return_value=0)
    with patch(f"{_SERVICE}.settings") as mock_settings, \
         patch(f"{_SERVICE}._cache_invalidate_pattern", mock_invalidate), \
         patch(f"{_SERVICE}._REDIS_AVAILABLE", True):
        mock_settings.sam_gov_api_key = ""
        sess = _make_session()
        from wcp_data.services.dbwd_service import refresh_rates
        await refresh_rates(sess, use_sam_gov=False)

    mock_invalidate.assert_awaited()
