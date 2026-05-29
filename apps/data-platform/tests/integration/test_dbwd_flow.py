"""Integration tests: DBWD rates API — Redis cache + SAM.gov fallback pipeline."""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_dbwd_refresh_uses_fallback(db_session):
    """refresh_rates() uses the fallback corpus when SAM.gov is not configured."""
    import os
    os.environ.pop("SAM_GOV_API_KEY", None)

    from wcp_data.services.dbwd_service import refresh_rates
    count = await refresh_rates(db_session, use_sam_gov=True)
    assert count > 0, "Should have upserted fallback DBWD rates"


async def test_dbwd_get_rates_returns_results(db_session):
    """get_rates() returns the refreshed rates from the DB."""
    from wcp_data.services.dbwd_service import get_rates, refresh_rates
    await refresh_rates(db_session, use_sam_gov=False)
    rates = await get_rates(db_session)
    assert len(rates) > 0


async def test_dbwd_get_rates_filter_by_trade(db_session):
    """get_rates() filters correctly by trade name."""
    from wcp_data.services.dbwd_service import get_rates, refresh_rates
    await refresh_rates(db_session, use_sam_gov=False)
    rates = await get_rates(db_session, trade="Electrician")
    assert all(r.trade == "Electrician" for r in rates)


async def test_dbwd_get_rates_filter_by_locality(db_session):
    """get_rates() filters correctly by locality."""
    from wcp_data.services.dbwd_service import get_rates, refresh_rates
    await refresh_rates(db_session, use_sam_gov=False)
    rates = await get_rates(db_session, locality="Washington, DC")
    assert all(r.locality == "Washington, DC" for r in rates)


async def test_dbwd_refresh_is_idempotent(db_session):
    """Calling refresh_rates() twice does not create duplicate rows."""
    from wcp_data.services.dbwd_service import get_rates, refresh_rates
    await refresh_rates(db_session, use_sam_gov=False)
    count1 = len(await get_rates(db_session))
    await refresh_rates(db_session, use_sam_gov=False)
    count2 = len(await get_rates(db_session))
    assert count1 == count2, "Duplicate rows created by re-refresh"
