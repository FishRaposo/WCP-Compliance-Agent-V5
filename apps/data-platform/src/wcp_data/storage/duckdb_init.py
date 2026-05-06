"""Initialize DuckDB views over PostgreSQL tables and Parquet archives."""

import logging

from wcp_data.analytics.duckdb_store import DuckDBStore

logger = logging.getLogger(__name__)


def init_duckdb_views(
    store: DuckDBStore,
    postgres_dsn: str,
    parquet_dir: str = "exports",
) -> None:
    try:
        store.connect(postgres_dsn=postgres_dsn)

        store.execute("""
            CREATE OR REPLACE VIEW decisions_view AS
            SELECT * FROM pg.decisions
        """)

        store.execute("""
            CREATE OR REPLACE VIEW contracts_view AS
            SELECT * FROM pg.contracts
        """)

        store.execute("""
            CREATE OR REPLACE VIEW payroll_records_view AS
            SELECT * FROM pg.payroll_records
        """)

        store.execute(f"""
            CREATE OR REPLACE VIEW decision_archive AS
            SELECT * FROM read_parquet('{parquet_dir}/decisions_*.parquet')
        """)

        store.execute(f"""
            CREATE OR REPLACE VIEW payroll_archive AS
            SELECT * FROM read_parquet('{parquet_dir}/payrolls_*.parquet')
        """)

        logger.info("DuckDB views initialized: decisions, contracts, payrolls, archives")
    except Exception:
        logger.warning("DuckDB view initialization failed — views not created", exc_info=True)
