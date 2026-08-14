"""Offline-first reliability contracts for cache, rates, and archive evidence."""

from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def test_memory_cache_expires_using_injected_clock() -> None:
    from wcp_data.services.redis_cache import InMemoryCache

    now = [100.0]
    cache = InMemoryCache(clock=lambda: now[0])
    cache.set("dbwd:rate", {"rate": 51.69}, ttl=10)

    assert cache.get("dbwd:rate") == {"rate": 51.69}
    now[0] = 110.0
    assert cache.get("dbwd:rate") is None


@pytest.mark.asyncio
async def test_cache_uses_memory_when_redis_connection_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from wcp_data.services import redis_cache

    class UnavailableRedis:
        async def get(self, key: str) -> None:
            raise ConnectionError("offline")

        async def setex(self, key: str, ttl: int, value: str) -> None:
            raise ConnectionError("offline")

    redis_cache._memory_cache.clear()

    async def unavailable() -> UnavailableRedis:
        return UnavailableRedis()

    monkeypatch.setattr(redis_cache, "_get_redis", unavailable)
    await redis_cache.cache_set("dbwd:offline", {"rate": 28.5})

    assert await redis_cache.cache_get("dbwd:offline") == {"rate": 28.5}


def test_rate_snapshot_is_stable_across_input_order() -> None:
    from wcp_data.services.dbwd_service import build_rate_snapshot

    first = [
        {
            "trade": "Plumber",
            "locality": "Washington, DC",
            "rate": 47.85,
            "fringe": 28.42,
            "effective_date": "2025-01-01",
            "wage_determination_number": "DC-2025-001",
        },
        {
            "trade": "Electrician",
            "locality": "Washington, DC",
            "rate": 51.69,
            "fringe": 34.63,
            "effective_date": "2025-01-01",
            "wage_determination_number": "DC-2025-001",
        },
    ]

    assert build_rate_snapshot(first) == build_rate_snapshot(list(reversed(first)))


def test_archive_manifest_has_stable_checksum_and_relative_name(tmp_path: Path) -> None:
    from wcp_data.analytics.duckdb_store import build_archive_manifest

    archive = tmp_path / "rates.parquet"
    archive.write_bytes(b"deterministic parquet fixture")

    manifest = build_archive_manifest(archive, row_count=2)

    assert manifest == {
        "schema_version": 1,
        "artifact": "rates.parquet",
        "format": "parquet",
        "row_count": 2,
        "sha256": "19c7e38dc582009169a8cab6daa570df3a637afaccd02d95a896f69a36034ef3",
    }
