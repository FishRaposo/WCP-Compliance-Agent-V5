"""Integration tests: Redis cache layer for DBWD lookups.

Tests exercise the cache key format and fall-through graceful behaviour.
When Redis is not reachable, all cache functions silently return None/0.
"""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


def test_cache_key_format():
    """dbwd_cache_key() produces a deterministic, normalised key."""
    from wcp_data.services.redis_cache import dbwd_cache_key

    key1 = dbwd_cache_key("Electrician", "Washington, DC", "2025-01-01")
    key2 = dbwd_cache_key("Electrician", "Washington, DC", "2025-01-01")
    key3 = dbwd_cache_key("Plumber", "Washington, DC", "2025-01-01")

    assert key1 == key2
    assert key1 != key3
    assert "electrician" in key1
    assert "washington" in key1
    assert "2025-01-01" in key1


def test_cache_key_is_lowercase():
    """dbwd_cache_key() lowercases trade and locality."""
    from wcp_data.services.redis_cache import dbwd_cache_key
    key = dbwd_cache_key("ELECTRICIAN", "WASHINGTON, DC", "2025-01-01")
    assert key == key.lower()


async def test_cache_get_returns_none_when_redis_unavailable():
    """cache_get() returns None gracefully when Redis is not reachable."""
    from wcp_data.services.redis_cache import cache_get
    result = await cache_get("test:key:unreachable")
    assert result is None


async def test_cache_set_does_not_raise_when_redis_unavailable():
    """cache_set() does not raise when Redis is not reachable."""
    from wcp_data.services.redis_cache import cache_set
    await cache_set("test:key:unreachable", {"v": 1}, ttl=10)


async def test_cache_invalidate_pattern_does_not_raise_when_redis_unavailable():
    """cache_invalidate_pattern() returns 0 gracefully when Redis unavailable."""
    from wcp_data.services.redis_cache import cache_invalidate_pattern
    count = await cache_invalidate_pattern("test:*")
    assert count == 0
