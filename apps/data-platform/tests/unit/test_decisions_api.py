from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from wcp_data.api import decisions
from wcp_data.models.schemas import DecisionCreate, DecisionResponse


@pytest.mark.unit
async def test_create_decision_endpoint_uses_trace_header(monkeypatch):
    captured: dict[str, str] = {}

    async def fake_create_decision(session, body, trace_id=""):
        captured["trace_id"] = trace_id
        return DecisionResponse(
            id="dec-001",
            job_id=body.job_id,
            verdict=body.verdict,
            trust_score=body.trust_score,
            trust_band=body.trust_band,
            requires_human_review=body.requires_human_review,
            violation_count=body.violation_count,
            warning_count=body.warning_count,
            reasoning_summary=body.reasoning_summary,
            citations=body.citations,
            created_at=datetime(2025, 1, 1),
        )

    monkeypatch.setattr(decisions, "create_decision", fake_create_decision)

    body = DecisionCreate(
        job_id="job-001",
        verdict="approved",
        trust_score=0.95,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="All checks passed.",
        citations=[],
    )

    result = await decisions.create_decision_endpoint(
        body,
        trace_id="",
        x_trace_id="trace-header",
        session=AsyncMock(),
    )

    assert result.id == "dec-001"
    assert captured["trace_id"] == "trace-header"


@pytest.mark.unit
async def test_create_decision_endpoint_keeps_query_trace_id_fallback(monkeypatch):
    captured: dict[str, str] = {}

    async def fake_create_decision(session, body, trace_id=""):
        captured["trace_id"] = trace_id
        return DecisionResponse(
            id="dec-002",
            job_id=body.job_id,
            verdict=body.verdict,
            trust_score=body.trust_score,
            trust_band=body.trust_band,
            requires_human_review=body.requires_human_review,
            violation_count=body.violation_count,
            warning_count=body.warning_count,
            reasoning_summary=body.reasoning_summary,
            citations=body.citations,
            created_at=datetime(2025, 1, 1),
        )

    monkeypatch.setattr(decisions, "create_decision", fake_create_decision)

    body = DecisionCreate(
        job_id="job-002",
        verdict="approved",
        trust_score=0.95,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="All checks passed.",
        citations=[],
    )

    result = await decisions.create_decision_endpoint(
        body,
        trace_id="trace-query",
        x_trace_id="",
        session=AsyncMock(),
    )

    assert result.id == "dec-002"
    assert captured["trace_id"] == "trace-query"


@pytest.mark.unit
def test_decision_create_rejects_legacy_verdict_and_trust_band_values():
    with pytest.raises(ValueError):
        DecisionCreate(
            job_id="job-legacy",
            verdict="compliant",
            trust_score=0.95,
            trust_band="high",
            requires_human_review=False,
            violation_count=0,
            warning_count=0,
            reasoning_summary="Legacy values should not validate.",
            citations=[],
        )
