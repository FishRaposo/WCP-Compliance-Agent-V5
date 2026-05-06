"""DuckDB analytics store with PostgreSQL scanner.

Connects to DuckDB, attaches PostgreSQL tables via postgres_scanner,
and creates parquet views for analytics queries.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path("data/analytics.duckdb")


class DuckDBStore:
    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = None

    @property
    def conn(self):
        if self._conn is None:
            raise RuntimeError("DuckDB not connected. Call connect() first.")
        return self._conn

    def connect(self, postgres_dsn: str | None = None) -> None:
        try:
            import duckdb
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

    def execute(self, query: str) -> list[dict]:
        if not self._conn:
            return []
        result = self._conn.execute(query)
        columns = [col[0] for col in result.description]
        return [dict(zip(columns, row)) for row in result.fetchall()]


_analytics_store = DuckDBStore()
