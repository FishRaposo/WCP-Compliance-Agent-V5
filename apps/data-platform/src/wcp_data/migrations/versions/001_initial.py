from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "contracts",
        sa.Column("id", sa.Text(), primary_key=True, server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("contract_number", sa.Text(), nullable=False, unique=True),
        sa.Column("project_name", sa.Text(), nullable=False),
        sa.Column("contractor_name", sa.Text(), nullable=False),
        sa.Column("contractor_ein", sa.Text(), nullable=True),
        sa.Column("agency", sa.Text(), nullable=True),
        sa.Column("locality", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("total_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("source", sa.Text(), nullable=False, server_default="manual"),
        sa.Column("source_reference", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_index("ix_contracts_contractor", "contracts", ["contractor_name"])
    op.create_index("ix_contracts_dates", "contracts", ["start_date", "end_date"])
    op.create_index("ix_contracts_locality", "contracts", ["locality"])
    op.create_index("ix_contracts_source", "contracts", ["source"])

    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", sa.Text(), nullable=False, unique=True),
        sa.Column("verdict", sa.Text(), nullable=False),
        sa.Column("trust_score", sa.Float(), nullable=False),
        sa.Column("trust_band", sa.Text(), nullable=False),
        sa.Column("requires_human_review", sa.Boolean(), nullable=False, server_default="FALSE"),
        sa.Column("violation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reasoning_summary", sa.Text(), nullable=True),
        sa.Column("citations", postgresql.JSONB(), nullable=True, server_default="[]"),
        sa.Column("cost_usd", sa.Float(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("phoenix_trace_id", sa.Text(), nullable=True),
        sa.Column("contract_id", sa.Text(), sa.ForeignKey("contracts.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_decisions_job_id", "decisions", ["job_id"])
    op.create_index("idx_decisions_created_at", "decisions", ["created_at"])
    op.create_index("ix_decisions_contract_id", "decisions", ["contract_id"])
    op.create_index("ix_decisions_contract_created", "decisions", ["contract_id", "created_at"])
    op.create_index("idx_decisions_date_verdict", "decisions", ["created_at", "verdict"])

    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("actor", sa.Text(), nullable=False, server_default="system"),
        sa.Column("payload", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column("regulation_references", postgresql.ARRAY(sa.Text()), nullable=True, server_default="{}"),
        sa.Column("trace_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_audit_events_job_id", "audit_events", ["job_id"])

    op.create_table(
        "ingestion_jobs",
        sa.Column("id", sa.Text(), primary_key=True, server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("source_reference", sa.Text(), nullable=True),
        sa.Column("contract_id", sa.Text(), sa.ForeignKey("contracts.id"), nullable=True),
        sa.Column("total_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_details", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_ingestion_status", "ingestion_jobs", ["status"])
    op.create_index("ix_ingestion_type", "ingestion_jobs", ["type"])
    op.create_index("ix_ingestion_contract", "ingestion_jobs", ["contract_id"])
    op.create_index("ix_ingestion_created", "ingestion_jobs", ["created_at"])

    op.execute(
        """
        CREATE TABLE payroll_records (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            contract_id TEXT NOT NULL REFERENCES contracts(id),
            employee_name TEXT NOT NULL,
            employee_id_hash TEXT,
            trade_code TEXT NOT NULL,
            locality_code TEXT NOT NULL,
            week_ending DATE NOT NULL,
            hours_monday NUMERIC(4,1),
            hours_tuesday NUMERIC(4,1),
            hours_wednesday NUMERIC(4,1),
            hours_thursday NUMERIC(4,1),
            hours_friday NUMERIC(4,1),
            hours_saturday NUMERIC(4,1),
            hours_sunday NUMERIC(4,1),
            total_hours NUMERIC(5,1) NOT NULL,
            hourly_rate NUMERIC(8,2) NOT NULL,
            gross_pay NUMERIC(10,2) NOT NULL,
            fringe_rate NUMERIC(8,2),
            fringe_total NUMERIC(10,2),
            overtime_hours NUMERIC(5,1) DEFAULT 0,
            overtime_pay NUMERIC(10,2) DEFAULT 0,
            decision_id TEXT,
            source_file TEXT,
            ingestion_job_id TEXT REFERENCES ingestion_jobs(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, contract_id)
        ) PARTITION BY LIST (contract_id)
        """
    )
    op.create_index("ix_payroll_week_ending", "payroll_records", ["week_ending"])
    op.create_index("ix_payroll_trade", "payroll_records", ["trade_code"])
    op.create_index("ix_payroll_employee", "payroll_records", ["employee_name"])
    op.create_index("ix_payroll_decision", "payroll_records", ["decision_id"])
    op.create_index("ix_payroll_contract_week", "payroll_records", ["contract_id", "week_ending"])

    op.create_table(
        "dbwd_rates",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trade", sa.Text(), nullable=False),
        sa.Column("locality", sa.Text(), nullable=False),
        sa.Column("rate", sa.Float(), nullable=False),
        sa.Column("fringe", sa.Float(), nullable=False, server_default="0"),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("wage_determination_number", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_unique_constraint(
        "uq_dbwd_rates_trade_locality_date",
        "dbwd_rates",
        ["trade", "locality", "effective_date"],
    )
    op.create_index("idx_dbwd_trade_locality", "dbwd_rates", ["trade", "locality"])
    op.create_index("idx_dbwd_effective_date", "dbwd_rates", ["effective_date"])

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False, server_default="analyst"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)

    op.create_table(
        "regulation_chunks",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chunk_id", sa.Text(), nullable=False, unique=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("trade", sa.Text(), nullable=True),
        sa.Column("locality", sa.Text(), nullable=True),
        sa.Column("regulation_cite", sa.Text(), nullable=True),
        sa.Column("wage_determination_number", sa.Text(), nullable=True),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.execute("ALTER TABLE regulation_chunks ALTER COLUMN embedding TYPE vector(384) USING embedding::vector")
    op.create_index("idx_chunks_trade_locality", "regulation_chunks", ["trade", "locality"])
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_chunks_embedding
        ON regulation_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )

    op.create_table(
        "artifacts",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("artifacts")
    op.drop_index("idx_chunks_embedding", table_name="regulation_chunks")
    op.drop_index("idx_chunks_trade_locality", table_name="regulation_chunks")
    op.drop_table("regulation_chunks")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("idx_dbwd_effective_date", table_name="dbwd_rates")
    op.drop_index("idx_dbwd_trade_locality", table_name="dbwd_rates")
    op.drop_constraint("uq_dbwd_rates_trade_locality_date", "dbwd_rates", type_="unique")
    op.drop_table("dbwd_rates")
    op.drop_index("ix_payroll_contract_week", table_name="payroll_records")
    op.drop_index("ix_payroll_decision", table_name="payroll_records")
    op.drop_index("ix_payroll_employee", table_name="payroll_records")
    op.drop_index("ix_payroll_trade", table_name="payroll_records")
    op.drop_index("ix_payroll_week_ending", table_name="payroll_records")
    op.execute("DROP TABLE IF EXISTS payroll_records")
    op.drop_index("ix_ingestion_created", table_name="ingestion_jobs")
    op.drop_index("ix_ingestion_contract", table_name="ingestion_jobs")
    op.drop_index("ix_ingestion_type", table_name="ingestion_jobs")
    op.drop_index("ix_ingestion_status", table_name="ingestion_jobs")
    op.drop_table("ingestion_jobs")
    op.drop_index("idx_audit_events_job_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("idx_decisions_date_verdict", table_name="decisions")
    op.drop_index("ix_decisions_contract_created", table_name="decisions")
    op.drop_index("ix_decisions_contract_id", table_name="decisions")
    op.drop_index("idx_decisions_created_at", table_name="decisions")
    op.drop_index("idx_decisions_job_id", table_name="decisions")
    op.drop_table("decisions")
    op.drop_index("ix_contracts_source", table_name="contracts")
    op.drop_index("ix_contracts_locality", table_name="contracts")
    op.drop_index("ix_contracts_dates", table_name="contracts")
    op.drop_index("ix_contracts_contractor", table_name="contracts")
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_table("contracts")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
