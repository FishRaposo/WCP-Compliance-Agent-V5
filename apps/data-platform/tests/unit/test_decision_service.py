from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import DecisionCreate
from wcp_data.services.decision_service import create_decision


def _make_audit_row():
    row = MagicMock()
    row.id = "evt-001"
    row.job_id = "job-001"
    row.event_type = "decision_created"
    row.actor = "agent"
    row.payload = {"verdict": "approved"}
    row.regulation_references = []
    row.trace_id = "trace-001"
    row.created_at = "2025-01-01T00:00:00Z"
    return row


def _make_decision_row():
    from datetime import datetime

    mock_get = MagicMock()
    mock_get._mapping = {
        "id": "dec-001",
        "job_id": "job-001",
        "verdict": "approved",
        "trust_score": 0.95,
        "trust_band": "auto_approve",
        "requires_human_review": False,
        "violation_count": 0,
        "warning_count": 0,
        "reasoning_summary": "All good",
        "citations": [],
        "cost_usd": 0.01,
        "latency_ms": 500,
        "phoenix_trace_id": "",
        "contract_id": None,
        "created_at": datetime(2025, 1, 1),
    }
    return mock_get


@pytest.mark.unit
async def test_create_decision_returns_response():
    session = AsyncMock()
    session.commit = AsyncMock()

    # persist_decision result
    persist_result = MagicMock()
    persist_row = MagicMock()
    persist_row.id = "dec-001"
    persist_result.fetchone.return_value = persist_row

    # audit event result
    audit_result = MagicMock()
    audit_result.fetchone.return_value = _make_audit_row()

    # get_decision result
    get_result = MagicMock()
    get_result.first.return_value = _make_decision_row()

    # 4 calls: persist_decision, append_audit, get_decision (2 internal calls)
    session.execute = AsyncMock(side_effect=[persist_result, audit_result, MagicMock(), get_result])

    draft = DecisionCreate(
        job_id="job-001",
        verdict="approved",
        trust_score=0.95,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="All good",
        citations=[],
    )
    result = await create_decision(session, draft, trace_id="trace-001")
    assert result.id == "dec-001"
    assert result.verdict == "approved"


@pytest.mark.unit
async def test_create_decision_with_human_review_flag():
    from datetime import datetime

    session = AsyncMock()
    session.commit = AsyncMock()

    persist_result = MagicMock()
    persist_row = MagicMock()
    persist_row.id = "dec-002"
    persist_result.fetchone.return_value = persist_row

    audit_result = MagicMock()
    audit_result.fetchone.return_value = _make_audit_row()

    # decision with human review flag
    mock_d_row = MagicMock()
    mock_d_row._mapping = {
        "id": "dec-002",
        "job_id": "job-002",
        "verdict": "needs_review",
        "trust_score": 0.45,
        "trust_band": "require_human_review",
        "requires_human_review": True,
        "violation_count": 3,
        "warning_count": 1,
        "reasoning_summary": "Multiple issues found",
        "citations": [],
        "cost_usd": 0.02,
        "latency_ms": 800,
        "phoenix_trace_id": "",
        "contract_id": None,
        "created_at": datetime(2025, 1, 1),
    }
    get_result = MagicMock()
    get_result.first.return_value = mock_d_row

    # 5 calls: persist, audit1, audit2, get_decision (2 internal)
    session.execute = AsyncMock(side_effect=[
        persist_result, audit_result, audit_result, MagicMock(), get_result,
    ])

    draft = DecisionCreate(
        job_id="job-002",
        verdict="needs_review",
        trust_score=0.45,
        trust_band="require_human_review",
        requires_human_review=True,
        violation_count=3,
        warning_count=1,
        reasoning_summary="Multiple issues found",
        citations=[],
    )
    result = await create_decision(session, draft, trace_id="trace-002")
    assert result.id == "dec-002"
    assert result.requires_human_review is True


@pytest.mark.unit
async def test_create_decision_persists_with_contract_id():
    from datetime import datetime

    session = AsyncMock()
    session.commit = AsyncMock()

    persist_result = MagicMock()
    persist_row = MagicMock()
    persist_row.id = "dec-003"
    persist_result.fetchone.return_value = persist_row

    audit_result = MagicMock()
    audit_result.fetchone.return_value = _make_audit_row()

    mock_d_row = MagicMock()
    mock_d_row._mapping = {
        "id": "dec-003",
        "job_id": "job-003",
        "verdict": "approved",
        "trust_score": 0.85,
        "trust_band": "auto_approve",
        "requires_human_review": False,
        "violation_count": 0,
        "warning_count": 0,
        "reasoning_summary": "Clean",
        "citations": [],
        "cost_usd": 0.0,
        "latency_ms": 300,
        "phoenix_trace_id": "",
        "contract_id": "ctr-001",
        "created_at": datetime(2025, 1, 1),
    }
    get_result = MagicMock()
    get_result.first.return_value = mock_d_row

    # 4 calls: persist_decision, append_audit, get_decision (2 internal calls)
    session.execute = AsyncMock(side_effect=[persist_result, audit_result, MagicMock(), get_result])

    draft = DecisionCreate(
        job_id="job-003",
        verdict="approved",
        trust_score=0.85,
        trust_band="auto_approve",
        contract_id="ctr-001",
    )
    result = await create_decision(session, draft, trace_id="trace-003")
    assert result.contract_id == "ctr-001"
