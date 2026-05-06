import pytest

from wcp_compliance.dbwd_matching.rate_lookup import (
    _normalize_trade,
    get_dbwd_rate,
    reset_corpus_cache,
)


@pytest.fixture(autouse=True)
def _reset_cache():
    reset_corpus_cache()
    yield
    reset_corpus_cache()


@pytest.mark.asyncio
async def test_get_dbwd_rate_exact_match():
    rate = await get_dbwd_rate("Electrician", "Washington, DC", "2025-06-01")
    assert rate.trade == "Electrician"
    assert rate.rate == 51.69
    assert rate.fringe == 34.63


@pytest.mark.asyncio
async def test_get_dbwd_rate_alias():
    rate = await get_dbwd_rate("elec", "Washington, DC", "2025-06-01")
    assert rate.trade == "Electrician"


@pytest.mark.asyncio
async def test_get_dbwd_rate_plumber():
    rate = await get_dbwd_rate("Plumber", "Washington, DC", "2025-06-01")
    assert rate.trade == "Plumber"
    assert rate.rate == 47.85


@pytest.mark.asyncio
async def test_get_dbwd_rate_carpenter():
    rate = await get_dbwd_rate("Carpenter", "Washington, DC", "2025-06-01")
    assert rate.trade == "Carpenter"
    assert rate.rate == 43.20


@pytest.mark.asyncio
async def test_get_dbwd_rate_fuzzy_match():
    rate = await get_dbwd_rate("Eletrician", "Washington, DC", "2025-06-01")
    assert rate.trade == "Electrician"


@pytest.mark.asyncio
async def test_get_dbwd_rate_case_insensitive():
    rate = await get_dbwd_rate("ELECTRICIAN", "Washington, DC", "2025-06-01")
    assert rate.trade == "Electrician"


@pytest.mark.asyncio
async def test_get_dbwd_rate_not_found():
    with pytest.raises(ValueError, match="not found"):
        await get_dbwd_rate("Underwater Basket Weaver", "Washington, DC", "2025-06-01")


@pytest.mark.asyncio
async def test_get_dbwd_rate_invalid_date():
    with pytest.raises(ValueError, match="Invalid effective date"):
        await get_dbwd_rate("Electrician", "Washington, DC", "not-a-date")


@pytest.mark.asyncio
async def test_get_dbwd_rate_locality_not_found():
    with pytest.raises(ValueError, match="No DBWD rates found"):
        await get_dbwd_rate("Electrician", "Nowhere, ZZ", "2025-06-01")


def test_normalize_trade_removes_punctuation():
    result = _normalize_trade("Sheet Metal Worker")
    assert "sheet_metal_worker" in result or "sheet" in result


def test_normalize_trade_lowercase():
    result = _normalize_trade("ELECTRICIAN")
    assert result == "electrician"


def test_normalize_trade_strips_whitespace():
    result = _normalize_trade("  Electrician  ")
    assert "electrician" in result
