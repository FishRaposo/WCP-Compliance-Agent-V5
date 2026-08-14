"""DuckDB analytics store with PostgreSQL scanner.

Connects to DuckDB, attaches PostgreSQL tables via postgres_scanner,
and creates parquet views for analytics queries.
"""

import hashlib
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path("data/analytics.duckdb")


def build_archive_manifest(archive_path: str | Path, row_count: int) -> dict[str, Any]:
    """Create a portable checksum receipt for an already-exported Parquet file."""
    artifact = Path(archive_path)
    return {
        "schema_version": 1,
        "artifact": artifact.name,
        "format": "parquet",
        "row_count": row_count,
        "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
    }


class DuckDBStore:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self._conn: Any = None

    @property
    def conn(self) -> Any:
        if self._conn is None:
            raise RuntimeError("DuckDB not connected. Call connect() first.")
        return self._conn

    def connect(self, postgres_dsn: str | None = None) -> None:
        try:
            import duckdb
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            self._conn = duckdb.connect(str(self.db_path))

            if postgres_dsn:
                self._conn.execute("INSTALL postgres_scanner; LOAD postgres_scanner;")
                self._conn.execute(
                    f"ATTACH '{postgres_dsn}' AS pg (TYPE POSTGRES, READ_ONLY);"
                )
                logger.info("DuckDB attached to PostgreSQL at %s", postgres_dsn)

            logger.info("DuckDB analytics store opened at %s", self.db_path)
        except ImportError:
            logger.warning("duckdb not installed, analytics store unavailable")
        except Exception:
            logger.warning("DuckDB connection failed", exc_info=True)

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    def execute(self, query: str) -> list[dict[str, Any]]:
        if not self._conn:
            return []
        result = self._conn.execute(query)
        columns = [col[0] for col in result.description]
        return [dict(zip(columns, row)) for row in result.fetchall()]

    def register_postgres_view(self, view_name: str, table_name: str, schema: str = "public") -> None:
        """Register a PostgreSQL table as a DuckDB view."""
        if not self._conn:
            return
        try:
            self._conn.execute(f"""
                CREATE OR REPLACE VIEW {view_name} AS
                SELECT * FROM pg.{schema}.{table_name}
            """)
            logger.info("Registered view %s for pg.%s.%s", view_name, schema, table_name)
        except Exception as exc:
            logger.warning("Failed to register view %s: %s", view_name, exc)

    def export_to_parquet(self, table_or_view: str, output_path: str) -> str:
        """Export a table or view to Parquet format."""
        if not self._conn:
            logger.warning("Cannot export: DuckDB not connected")
            return ""
        try:
            import importlib.util
            if importlib.util.find_spec("pyarrow") is None:
                logger.warning("pyarrow not installed for Parquet export")
                return ""
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            self._conn.execute(f"COPY {table_or_view} TO '{output_file}' (FORMAT PARQUET);")
            logger.info("Exported %s to %s", table_or_view, output_file)
            return str(output_file)
        except Exception as exc:
            logger.warning("Failed to export %s to Parquet: %s", table_or_view, exc)
            return ""

    def export_to_parquet_with_manifest(
        self,
        table_or_view: str,
        output_path: str,
    ) -> dict[str, Any] | None:
        """Export a Parquet archive and return its checksum-backed receipt.

        This is additive to ``export_to_parquet`` so existing callers retain their
        string response while evidence tooling can verify a concrete artifact.
        """
        archive = self.export_to_parquet(table_or_view, output_path)
        if not archive or not self._conn:
            return None
        row_count = int(self._conn.execute(f"SELECT COUNT(*) FROM {table_or_view}").fetchone()[0])
        return build_archive_manifest(archive, row_count)

    def query_analytics(self, query: str) -> list[dict[str, Any]]:
        """Execute an analytics query and return results."""
        return self.execute(query)


_analytics_store = DuckDBStore()


def get_analytics_store() -> DuckDBStore:
    """Get the global analytics store instance."""
    return _analytics_store
