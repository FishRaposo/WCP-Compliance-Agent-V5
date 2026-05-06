"""Event schemas for Redis Streams publishing."""

from pydantic import BaseModel


class DecisionEvent(BaseModel):
    event_type: str = "decision_created"
    decision_id: str
    job_id: str
    verdict: str
    trust_score: float
    trust_band: str
    requires_human_review: bool = False
    violation_count: int = 0
    warning_count: int = 0
    trace_id: str = ""


class PayrollIngestedEvent(BaseModel):
    event_type: str = "payroll_ingested"
    contract_id: str
    record_count: int
    ingestion_job_id: str | None = None


class IngestionCompletedEvent(BaseModel):
    event_type: str = "ingestion_completed"
    job_id: str
    status: str
    total_records: int = 0
    processed_records: int = 0
    failed_records: int = 0
