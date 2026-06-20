from uuid import uuid4
from typing import Any

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.types import TypeEngine

metadata = MetaData()


def _new_id() -> str:
    return str(uuid4())


def _uuid_type() -> TypeEngine[Any]:
    return PgUUID(as_uuid=False).with_variant(String(36), "sqlite")


def _json_type() -> TypeEngine[Any]:
    return JSONB().with_variant(JSON(), "sqlite")


def _text_array_type() -> TypeEngine[Any]:
    return ARRAY(Text()).with_variant(JSON(), "sqlite")

decisions_table = Table(
    "decisions",
    metadata,
    Column("id", _uuid_type(), primary_key=True, default=_new_id),
    Column("job_id", Text(), nullable=False, unique=True),
    Column("verdict", Text(), nullable=False),
    Column("trust_score", Float(), nullable=False),
    Column("trust_band", Text(), nullable=False),
    Column("requires_human_review", Boolean(), nullable=False, server_default="false"),
    Column("violation_count", Integer(), nullable=False, server_default="0"),
    Column("warning_count", Integer(), nullable=False, server_default="0"),
    Column("reasoning_summary", Text(), nullable=True),
    Column("citations", _json_type(), nullable=True, default=list),
    Column("cost_usd", Float(), nullable=True),
    Column("latency_ms", Integer(), nullable=True),
    Column("phoenix_trace_id", Text(), nullable=True),
    Column("contract_id", Text(), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

audit_events_table = Table(
    "audit_events",
    metadata,
    Column("id", _uuid_type(), primary_key=True, default=_new_id),
    Column("job_id", Text(), nullable=False),
    Column("event_type", Text(), nullable=False),
    Column("actor", Text(), nullable=False, server_default="system"),
    Column("payload", _json_type(), nullable=True, default=dict),
    Column("regulation_references", _text_array_type(), nullable=True, default=list),
    Column("trace_id", Text(), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

contracts_table = Table(
    "contracts",
    metadata,
    Column("id", Text(), primary_key=True, default=_new_id),
    Column("contract_number", Text(), nullable=False, unique=True),
    Column("project_name", Text(), nullable=False),
    Column("contractor_name", Text(), nullable=False),
    Column("contractor_ein", Text(), nullable=True),
    Column("agency", Text(), nullable=True),
    Column("locality", Text(), nullable=False),
    Column("start_date", Date(), nullable=False),
    Column("end_date", Date(), nullable=True),
    Column("total_value", Numeric(14, 2), nullable=True),
    Column("status", Text(), nullable=False, server_default="active"),
    Column("source", Text(), nullable=False, server_default="manual"),
    Column("source_reference", Text(), nullable=True),
    Column("metadata", _json_type(), nullable=False, default=dict),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

payroll_records_table = Table(
    "payroll_records",
    metadata,
    Column("id", _uuid_type(), primary_key=True, default=_new_id),
    Column("contract_id", Text(), ForeignKey("contracts.id"), primary_key=True),
    Column("employee_name", Text(), nullable=False),
    Column("employee_id_hash", Text(), nullable=True),
    Column("trade_code", Text(), nullable=False),
    Column("locality_code", Text(), nullable=False),
    Column("week_ending", Date(), nullable=False),
    Column("hours_monday", Numeric(4, 1), nullable=True),
    Column("hours_tuesday", Numeric(4, 1), nullable=True),
    Column("hours_wednesday", Numeric(4, 1), nullable=True),
    Column("hours_thursday", Numeric(4, 1), nullable=True),
    Column("hours_friday", Numeric(4, 1), nullable=True),
    Column("hours_saturday", Numeric(4, 1), nullable=True),
    Column("hours_sunday", Numeric(4, 1), nullable=True),
    Column("total_hours", Numeric(5, 1), nullable=False),
    Column("hourly_rate", Numeric(8, 2), nullable=False),
    Column("gross_pay", Numeric(10, 2), nullable=False),
    Column("fringe_rate", Numeric(8, 2), nullable=True),
    Column("fringe_total", Numeric(10, 2), nullable=True),
    Column("overtime_hours", Numeric(5, 1), nullable=True, server_default="0"),
    Column("overtime_pay", Numeric(10, 2), nullable=True, server_default="0"),
    Column("decision_id", Text(), nullable=True),
    Column("source_file", Text(), nullable=True),
    Column("ingestion_job_id", Text(), ForeignKey("ingestion_jobs.id"), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

ingestion_jobs_table = Table(
    "ingestion_jobs",
    metadata,
    Column("id", Text(), primary_key=True, default=_new_id),
    Column("type", Text(), nullable=False),
    Column("status", Text(), nullable=False, server_default="pending"),
    Column("source_type", Text(), nullable=False),
    Column("source_reference", Text(), nullable=True),
    Column("contract_id", Text(), ForeignKey("contracts.id"), nullable=True),
    Column("total_records", Integer(), nullable=False, server_default="0"),
    Column("processed_records", Integer(), nullable=False, server_default="0"),
    Column("failed_records", Integer(), nullable=False, server_default="0"),
    Column("error_details", _json_type(), nullable=False, default=list),
    Column("started_at", DateTime(timezone=True), nullable=True),
    Column("completed_at", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

dbwd_rates_table = Table(
    "dbwd_rates",
    metadata,
    Column("id", _uuid_type(), primary_key=True, default=_new_id),
    Column("trade", Text(), nullable=False),
    Column("locality", Text(), nullable=False),
    Column("rate", Float(), nullable=False),
    Column("fringe", Float(), nullable=False, server_default="0"),
    Column("effective_date", Date(), nullable=False),
    Column("wage_determination_number", Text(), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

users_table = Table(
    "users",
    metadata,
    Column("id", _uuid_type(), primary_key=True, default=_new_id),
    Column("email", Text(), nullable=False, unique=True),
    Column("password_hash", Text(), nullable=False),
    Column("role", Text(), nullable=False, server_default="analyst"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
