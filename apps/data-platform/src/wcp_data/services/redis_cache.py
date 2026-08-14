"""Redis caching layer for DBWD rate lookups.

24-hour TTL cache for DBWD rates keyed by (trade, locality, date).
"""

import json
import logging
import time
from collections.abc import Callable
from typing import Any, cast

from wcp_data.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TTL = 86400  # 24 hours

# HIGH-05 Fix: Module-level Redis connection pool to prevent connection leaks
_redis_pool: Any | None = None


class InMemoryCache:
    """A deterministic process-local fallback for optional Redis caching.

    The cache deliberately has the same best-effort semantics as Redis: losing an
    entry only causes the repository query to run again.  A clock can be injected
    by tests so expiry behavior never depends on wall-clock timing.
    """

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._entries: dict[str, tuple[float, dict[str, Any]]] = {}

    def get(self, key: str) -> dict[str, Any] | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if self._clock() >= expires_at:
            self._entries.pop(key, None)
            return None
        # JSON round-trip keeps cached values isolated from caller mutation.
        return cast(dict[str, Any], json.loads(json.dumps(value, default=str)))

    def set(self, key: str, value: dict[str, Any], ttl: int = DEFAULT_TTL) -> None:
        self._entries[key] = (
            self._clock() + max(ttl, 0),
            json.loads(json.dumps(value, default=str)),
        )

    def invalidate_pattern(self, pattern: str) -> int:
        prefix = pattern.rstrip("*")
        keys = [key for key in self._entries if key.startswith(prefix)]
        for key in keys:
            self._entries.pop(key, None)
        return len(keys)

    def clear(self) -> None:
        self._entries.clear()


_memory_cache = InMemoryCache()


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
            try:
                return cast(dict[str, Any], json.loads(value))
            except json.JSONDecodeError:
                # Corrupt entry — drop it so a future write can repopulate.
                logger.warning("Corrupt JSON in cache key %s; deleting", key)
                try:
                    await r.delete(key)
                except Exception as exc:  # noqa: BLE001 - cache cleanup is best-effort
                    logger.debug("Failed to delete corrupt cache key %s: %s", key, exc)
                return _memory_cache.get(key)
    except Exception:
        logger.warning("Redis cache unavailable for key %s", key)
    return _memory_cache.get(key)


async def cache_set(key: str, value: dict[str, Any], ttl: int = DEFAULT_TTL) -> None:
    try:
        r = await _get_redis()
        await r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        logger.debug("Redis cache set failed: %s", key)
    finally:
        # Keep a small local copy so an optional Redis outage does not change
        # rate lookup behavior for an already-running offline demo.
        _memory_cache.set(key, value, ttl)


async def cache_invalidate_pattern(pattern: str) -> int:
    try:
        r = await _get_redis()
        keys = []
        async for key in r.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await r.delete(*keys)
        _memory_cache.invalidate_pattern(pattern)
        return len(keys)
    except Exception:
        return _memory_cache.invalidate_pattern(pattern)
