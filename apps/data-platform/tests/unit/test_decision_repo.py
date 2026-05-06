from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import DecisionCreate
from wcp_data.repositories.decision_repo import get_decision, list_decisions, persist_decision


@pytest.mark.unit
async def test_get_decision_returns_none_when_not_found():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = None
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_decision(session, "nonexistent-id")
    assert result is None


@pytest.mark.unit
async def test_list_decisions_returns_empty_list():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await list_decisions(session)
    assert result == []


@pytest.mark.unit
async def test_persist_decision_returns_id():
    session = AsyncMock()
    session.commit = AsyncMock()
    mock_result = MagicMock()
    row_mock = MagicMock()
    row_mock.id = "decision-abc-123"
    mock_result.fetchone.return_value = row_mock
    session.execute = AsyncMock(return_value=mock_result)
    decision = DecisionCreate(
        job_id="test-job-001",
        verdict="approved",
        trust_score=0.95,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="All checks passed",
        citations=[],
    )
    result = await persist_decision(session, decision)
    assert result == "decision-abc-123"
    assert session.commit.called


@pytest.mark.unit
async def test_list_decisions_with_verdict_filter():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await list_decisions(session, verdict="rejected", limit=10, offset=0)
    assert result == []
    # verify execute was called with verdict filter
    assert session.execute.called


@pytest.mark.unit
async def test_list_decisions_with_contract_id_filter():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await list_decisions(session, contract_id="ctr-001", limit=5, offset=0)
    assert result == []
    assert session.execute.called


@pytest.mark.unit
async def test_get_decision_returns_populated_row():
    from datetime import datetime

    session = AsyncMock()
    mock_row = MagicMock()
    mock_row._mapping = {
        "id": "dec-001",
        "job_id": "job-001",
        "verdict": "approved",
        "trust_score": 0.95,
        "trust_band": "auto_approve",
        "requires_human_review": False,
        "violation_count": 0,
        "warning_count": 0,
        "reasoning_summary": "Pass",
        "citations": [],
        "cost_usd": 0.01,
        "latency_ms": 500,
        "phoenix_trace_id": "trace-123",
        "contract_id": None,
        "created_at": datetime(2025, 1, 1),
    }
    mock_result = MagicMock()
    mock_result.first.return_value = mock_row
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_decision(session, "dec-001")
    assert result is not None
    assert result.id == "dec-001"
    assert result.verdict == "approved"
