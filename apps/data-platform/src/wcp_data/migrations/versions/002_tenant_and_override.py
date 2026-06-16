"""Tenant isolation + decision override review columns.

Additive, back-compat migration:
  * ``tenant_id`` on every persisted record (defaults to ``'default'`` so all
    pre-existing rows belong to the implicit default tenant).
  * Human-review override columns on ``decisions``
    (``review_status``/``reviewed_by``/``review_note``/``reviewed_at``), all
    nullable — an un-reviewed decision simply carries NULLs.

Every column is nullable or server-defaulted, so the migration is safe to apply
to a populated database and earlier code paths continue to work unchanged.
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

_TENANT_TABLES = ("users", "contracts", "decisions", "audit_events", "ingestion_jobs")


def upgrade() -> None:
    for table in _TENANT_TABLES:
        op.add_column(
            table,
            sa.Column("tenant_id", sa.Text(), nullable=False, server_default="default"),
        )

    op.create_index("ix_contracts_tenant", "contracts", ["tenant_id"])
    op.create_index("ix_decisions_tenant", "decisions", ["tenant_id"])
    op.create_index("ix_audit_events_tenant", "audit_events", ["tenant_id"])
    op.create_index("ix_ingestion_tenant", "ingestion_jobs", ["tenant_id"])

    # Decision override / human-review columns (all nullable for back-compat).
    op.add_column("decisions", sa.Column("review_status", sa.Text(), nullable=True))
    op.add_column("decisions", sa.Column("reviewed_by", sa.Text(), nullable=True))
    op.add_column("decisions", sa.Column("review_note", sa.Text(), nullable=True))
    op.add_column(
        "decisions",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_decisions_review_status", "decisions", ["review_status"])


def downgrade() -> None:
    op.drop_index("ix_decisions_review_status", table_name="decisions")
    op.drop_column("decisions", "reviewed_at")
    op.drop_column("decisions", "review_note")
    op.drop_column("decisions", "reviewed_by")
    op.drop_column("decisions", "review_status")

    op.drop_index("ix_ingestion_tenant", table_name="ingestion_jobs")
    op.drop_index("ix_audit_events_tenant", table_name="audit_events")
    op.drop_index("ix_decisions_tenant", table_name="decisions")
    op.drop_index("ix_contracts_tenant", table_name="contracts")

    for table in reversed(_TENANT_TABLES):
        op.drop_column(table, "tenant_id")
