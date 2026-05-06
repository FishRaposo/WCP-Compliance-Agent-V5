"""DBWD rate refresh pipeline — fetches rates from SAM.gov and upserts into dbwd_rates table."""

import logging

from wcp_data.pipelines.utils import import_safe_flow, retry

logger = logging.getLogger(__name__)


@import_safe_flow(name="dbwd-refresh")
@retry(max_attempts=2, delay_seconds=5.0)
async def refresh_dbwd_rates():
    """Refresh DBWD rates from available sources.

    Attempts SAM.gov API if configured, falls back to in-memory corpus.
    """
    try:
        from wcp_data.services.dbwd_service import refresh_rates as svc_refresh
        from wcp_data.db.session import async_session

        async with async_session() as session:
            count = await svc_refresh(session)
            logger.info("DBWD refresh complete: %d rates", count)
            return {"refreshed": count}
    except Exception:
        logger.warning("DBWD refresh failed", exc_info=True)
        return {"refreshed": 0, "error": "Refresh pipeline failed"}
