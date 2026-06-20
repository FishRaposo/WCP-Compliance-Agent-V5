"""Redis caching layer for DBWD rate lookups.

24-hour TTL cache for DBWD rates keyed by (trade, locality, date).
"""

import json
import logging
from typing import Any

from wcp_data.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TTL = 86400  # 24 hours

# HIGH-05 Fix: Module-level Redis connection pool to prevent connection leaks
_redis_pool: Any | None = None


async def _get_redis() -> Any:
    """Get or create the shared Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        import redis.asyncio as aioredis

        _redis_pool = aioredis.from_url(
            settings.redis_url,
            max_connections=10,
            decode_responses=True,
        )
    return _redis_pool


def dbwd_cache_key(trade: str, locality: str, effective_date: str) -> str:
    return f"dbwd:{trade.lower()}:{locality.lower()}:{effective_date}"


async def cache_get(key: str) -> dict[str, Any] | None:
    try:
        r = await _get_redis()
        value = await r.get(key)
        if value:
            from typing import cast
            try:
                return cast(dict[str, Any], json.loads(value))
            except json.JSONDecodeError:
                # Corrupt entry — drop it so a future write can repopulate.
                logger.warning("Corrupt JSON in cache key %s; deleting", key)
                try:
                    await r.delete(key)
                except Exception:
                    pass
                return None
    except Exception:
        logger.warning("Redis cache unavailable for key %s", key)
    return None


async def cache_set(key: str, value: dict[str, Any], ttl: int = DEFAULT_TTL) -> None:
    try:
        r = await _get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        logger.debug("Redis cache set failed: %s", key)


async def cache_invalidate_pattern(pattern: str) -> int:
    try:
        r = await _get_redis()
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
        return len(keys)
    except Exception:
        return 0
