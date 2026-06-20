from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.models.schemas import AuditEventCreate
from wcp_data.repositories.audit_repo import append_audit_event, get_audit_events


@pytest.mark.unit
async def test_get_audit_events_returns_empty_list():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_audit_events(session, job_id="test-job")
    assert result == []


@pytest.mark.unit
async def test_get_audit_events_with_event_type_filter():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_audit_events(session, event_type="decision_persisted")
    assert result == []


@pytest.mark.unit
async def test_append_audit_event_returns_response():
    from datetime import datetime

    session = AsyncMock()
    session.flush = AsyncMock()
    mock_result = MagicMock()
    row_mock = MagicMock()
    row_mock.id = "evt-001"
    row_mock.job_id = "job-001"
    row_mock.event_type = "decision_persisted"
    row_mock.actor = "agent"
    row_mock.payload = {"verdict": "approved"}
    row_mock.regulation_references = ["40 U.S.C. § 3142"]
    row_mock.trace_id = "trace-001"
    row_mock.created_at = datetime(2025, 1, 1)
    mock_result.fetchone.return_value = row_mock
    session.execute = AsyncMock(return_value=mock_result)
    event = AuditEventCreate(
        job_id="job-001",
        event_type="decision_persisted",
        actor="agent",
        payload={"verdict": "approved"},
        regulation_references=["40 U.S.C. § 3142"],
        trace_id="trace-001",
    )
    result = await append_audit_event(session, event)
    assert result.id == "evt-001"
    assert result.event_type == "decision_persisted"
    assert result.trace_id == "trace-001"
    # append_audit_event no longer commits — the caller owns the transaction.
    assert session.flush.called


@pytest.mark.unit
async def test_get_audit_events_no_filters():
    session = AsyncMock()
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=mock_result)
    result = await get_audit_events(session)
    assert result == []
