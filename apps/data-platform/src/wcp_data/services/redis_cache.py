"""Redis caching layer for DBWD rate lookups.

24-hour TTL cache for DBWD rates keyed by (trade, locality, date).
"""

import json
import logging
from typing import Any

from wcp_data.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TTL = 86400  # 24 hours


def dbwd_cache_key(trade: str, locality: str, effective_date: str) -> str:
    return f"dbwd:{trade.lower()}:{locality.lower()}:{effective_date}"


async def cache_get(key: str) -> dict[str, Any] | None:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        value = await r.get(key)
        await r.close()
        if value:
            return json.loads(value)
    except Exception:
        logger.debug("Redis cache miss: %s", key)
    return None


async def cache_set(key: str, value: dict[str, Any], ttl: int = DEFAULT_TTL) -> None:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        await r.setex(key, ttl, json.dumps(value, default=str))
        await r.close()
    except Exception:
        logger.debug("Redis cache set failed: %s", key)


async def cache_invalidate_pattern(pattern: str) -> int:
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
        await r.close()
        return len(keys)
    except Exception:
        return 0
