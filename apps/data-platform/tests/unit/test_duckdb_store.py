"""Unit tests for DuckDBStore — connect, execute, register views, close."""
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit


def _make_store(tmp_path: Path):
    from wcp_data.analytics.duckdb_store import DuckDBStore
    return DuckDBStore(db_path=tmp_path / "test.duckdb")


def test_store_not_connected_raises(tmp_path):
    store = _make_store(tmp_path)
    with pytest.raises(RuntimeError, match="not connected"):
        _ = store.conn


def test_connect_without_postgres(tmp_path):
    """connect() with no DSN opens an in-process DuckDB."""
    try:
        import duckdb  # noqa: F401
    except ImportError:
        pytest.skip("duckdb not installed")
    store = _make_store(tmp_path)
    store.connect(postgres_dsn=None)
    assert store._conn is not None
    store.close()


def test_execute_returns_list(tmp_path):
    """execute() returns a list of dicts for a simple query."""
    try:
        import duckdb  # noqa: F401
    except ImportError:
        pytest.skip("duckdb not installed")
    store = _make_store(tmp_path)
    store.connect()
    result = store.execute("SELECT 1 AS n, 'hello' AS s")
    assert result == [{"n": 1, "s": "hello"}]
    store.close()


def test_execute_returns_empty_list_when_not_connected(tmp_path):
    """execute() returns [] gracefully when DuckDB is not connected."""
    from wcp_data.analytics.duckdb_store import DuckDBStore
    store = DuckDBStore.__new__(DuckDBStore)
    store._conn = None
    result = store.execute("SELECT 1")
    assert result == []


def test_close_idempotent(tmp_path):
    """close() can be called multiple times without error."""
    try:
        import duckdb  # noqa: F401
    except ImportError:
        pytest.skip("duckdb not installed")
    store = _make_store(tmp_path)
    store.connect()
    store.close()
    store.close()
    assert store._conn is None


def test_register_postgres_view_noop_when_not_connected(tmp_path):
    """register_postgres_view() is a no-op when DuckDB not connected."""
    from wcp_data.analytics.duckdb_store import DuckDBStore
    store = DuckDBStore.__new__(DuckDBStore)
    store._conn = None
    store.register_postgres_view("v", "t")


def test_get_analytics_store_returns_singleton():
    """get_analytics_store() returns the same instance on repeated calls."""
    from wcp_data.analytics.duckdb_store import get_analytics_store
    s1 = get_analytics_store()
    s2 = get_analytics_store()
    assert s1 is s2


def test_query_analytics_delegates_to_execute(tmp_path):
    """query_analytics() is an alias for execute()."""
    try:
        import duckdb  # noqa: F401
    except ImportError:
        pytest.skip("duckdb not installed")
    store = _make_store(tmp_path)
    store.connect()
    r1 = store.execute("SELECT 42 AS x")
    r2 = store.query_analytics("SELECT 42 AS x")
    assert r1 == r2
    store.close()


def test_export_with_manifest_preserves_export_path_and_checksum(tmp_path):
    """The additive manifest wrapper must not bypass the existing Parquet export."""
    pytest.importorskip("duckdb")
    pytest.importorskip("pyarrow")
    store = _make_store(tmp_path)
    store.connect()
    store.conn.execute("CREATE TABLE rates AS SELECT 51.69 AS rate")

    manifest = store.export_to_parquet_with_manifest("rates", str(tmp_path / "rates.parquet"))

    assert manifest is not None
    assert (tmp_path / "rates.parquet").exists()
    assert manifest["artifact"] == "rates.parquet"
    assert manifest["row_count"] == 1
    assert len(manifest["sha256"]) == 64
    store.close()
