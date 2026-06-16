"""Tests for the Redis Streams decision event envelope (W2 SSE)."""

import json

import pytest

from wcp_data.events.producer import EventProducer
from wcp_data.events.schemas import DecisionEvent

# Fields the web DecisionSummary consumes from the SSE payload.
DECISION_SUMMARY_FIELDS = {
    "decision_id",
    "job_id",
    "verdict",
    "trust_score",
    "trust_band",
    "requires_human_review",
    "violation_count",
    "warning_count",
    "created_at",
}


def _make_event() -> DecisionEvent:
    return DecisionEvent(
        decision_id="dec-1",
        job_id="job-1",
        verdict="approved",
        trust_score=0.91,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        trace_id="trace-xyz",
    )


def test_to_stream_fields_shape():
    event = _make_event()
    fields = event.to_stream_fields()
    assert fields["type"] == "decision.created"
    # The bridge parses the single `event` field as JSON.
    payload = json.loads(fields["event"])
    assert DECISION_SUMMARY_FIELDS.issubset(payload.keys())
    assert isinstance(payload["trust_score"], float)
    assert isinstance(payload["requires_human_review"], bool)
    assert payload["created_at"]  # ISO timestamp present


def test_default_created_at_is_iso():
    event = _make_event()
    # Round-trips through datetime.fromisoformat without error.
    from datetime import datetime

    assert datetime.fromisoformat(event.created_at)


@pytest.mark.asyncio
async def test_publish_decision_noop_without_redis(monkeypatch):
    producer = EventProducer()

    async def _no_redis():
        return None

    monkeypatch.setattr(producer, "_get_redis", _no_redis)
    # Must not raise when Redis is unavailable (offline-safe).
    await producer.publish_decision(_make_event())
