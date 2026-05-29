"""Unit tests for SamGovClient — mocked aiohttp, all paths covered."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.unit


def _make_client(api_key: str = "test-key"):
    from wcp_data.connectors.sam_gov import SamGovClient
    return SamGovClient(api_key=api_key)


def _mock_response(status: int, json_data: dict):
    resp = AsyncMock()
    resp.status = status
    resp.json = AsyncMock(return_value=json_data)
    resp.__aenter__ = AsyncMock(return_value=resp)
    resp.__aexit__ = AsyncMock(return_value=False)
    return resp


def _mock_session(response):
    session = MagicMock()
    session.get = MagicMock(return_value=response)
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=False)
    return session


@pytest.mark.asyncio
async def test_search_wage_determinations_success():
    """200 response returns list of wage determinations."""
    client = _make_client()
    payload = {"wageDeterminations": [{"wdNumber": "DC-001"}, {"wdNumber": "DC-002"}]}
    resp = _mock_response(200, payload)
    sess = _mock_session(resp)

    with patch("aiohttp.ClientSession", return_value=sess):
        result = await client.search_wage_determinations(state="DC")

    assert len(result) == 2
    assert result[0]["wdNumber"] == "DC-001"


@pytest.mark.asyncio
async def test_search_wage_determinations_401_raises():
    """401 response raises SamGovError."""
    from wcp_data.connectors.sam_gov import SamGovError
    client = _make_client()
    resp = _mock_response(401, {})
    sess = _mock_session(resp)

    with patch("aiohttp.ClientSession", return_value=sess):
        with pytest.raises(SamGovError, match="Invalid SAM.gov API key"):
            await client.search_wage_determinations(state="DC")


@pytest.mark.asyncio
async def test_search_wage_determinations_429_raises():
    """429 response raises SamGovError rate limit."""
    from wcp_data.connectors.sam_gov import SamGovError
    client = _make_client()
    resp = _mock_response(429, {})
    sess = _mock_session(resp)

    with patch("aiohttp.ClientSession", return_value=sess):
        with pytest.raises(SamGovError, match="rate limit"):
            await client.search_wage_determinations(state="DC")


@pytest.mark.asyncio
async def test_search_wage_determinations_network_failure():
    """Network failure returns empty list without raising."""
    client = _make_client()
    with patch("aiohttp.ClientSession", side_effect=OSError("connection refused")):
        result = await client.search_wage_determinations(state="DC")
    assert result == []


def test_extract_rates_parses_classifications():
    """extract_rates() maps classification fields to rate dict."""
    client = _make_client()
    wd = {
        "wdNumber": "DC-2025-001",
        "state": "DC",
        "county": "Washington",
        "effectiveDate": "2025-01-01",
        "classifications": [
            {"code": "ELEC", "title": "Electrician", "basicHourlyRate": 51.69, "fringeBenefits": 34.63},
            {"code": "PLMB", "title": "Plumber", "basicHourlyRate": 47.85, "fringeBenefits": 28.42},
        ],
    }
    rates = client.extract_rates(wd)
    assert len(rates) == 2
    elec = next(r for r in rates if r["trade_title"] == "Electrician")
    assert elec["wage"] == pytest.approx(51.69)
    assert elec["fringe"] == pytest.approx(34.63)
    assert elec["wage_determination_number"] == "DC-2025-001"
    assert elec["source"] == "sam_gov"


def test_extract_rates_empty_classifications():
    """extract_rates() returns [] for WD with no classifications."""
    client = _make_client()
    wd = {"wdNumber": "DC-2025-001", "state": "DC", "effectiveDate": "2025-01-01", "classifications": []}
    assert client.extract_rates(wd) == []


@pytest.mark.asyncio
async def test_fetch_rates_for_locality_end_to_end():
    """fetch_rates_for_locality() calls search then detail, returns extracted rates."""
    client = _make_client()

    detail_payload = {
        "wdNumber": "DC-001", "state": "DC", "county": "Washington",
        "effectiveDate": "2025-01-01",
        "classifications": [
            {"code": "ELEC", "title": "Electrician", "basicHourlyRate": 51.69, "fringeBenefits": 34.63}
        ],
    }

    async def mock_search(*a, **kw):
        return [{"wdNumber": "DC-001"}]

    async def mock_detail(wd_number: str):
        return detail_payload

    client.search_wage_determinations = mock_search
    client.get_wage_determination = mock_detail

    result = await client.fetch_rates_for_locality(state="DC", county="Washington")
    assert len(result) == 1
    assert result[0]["trade_title"] == "Electrician"
