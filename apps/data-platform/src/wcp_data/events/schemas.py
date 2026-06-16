"""Event schemas for Redis Streams publishing."""

from datetime import datetime, timezone

from pydantic import BaseModel, Field


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    created_at: str = Field(default_factory=_now_iso)

    def to_stream_fields(self) -> dict[str, str]:
        """Render a Redis Stream entry the gateway SSE bridge understands.

        The bridge keys on a ``type`` discriminator and an ``event`` field that
        carries the full JSON payload (a DecisionSummary-compatible object).
        """
        return {"type": "decision.created", "event": self.model_dump_json()}


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
