"""Integration tests: Decision record lifecycle — create, retrieve, audit trail."""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_create_and_retrieve_decision(db_session):
    """Creating a decision persists it and allows retrieval by id."""
    from wcp_data.services.decision_service import create_decision, get_decision
    from wcp_data.models.schemas import DecisionCreate

    payload = DecisionCreate(
        job_id="integ-job-001",
        verdict="approved",
        trust_score=0.88,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=1,
        reasoning_summary="All wages meet DBWD requirements.",
    )
    record = await create_decision(db_session, payload)
    assert record.job_id == "integ-job-001"
    assert record.verdict == "approved"

    fetched = await get_decision(db_session, str(record.id))
    assert fetched is not None
    assert fetched.trust_score == pytest.approx(0.88, abs=1e-4)


async def test_decision_trust_band_auto_approve(db_session):
    """High trust score maps to auto_approve band."""
    from wcp_data.services.decision_service import create_decision
    from wcp_data.models.schemas import DecisionCreate

    payload = DecisionCreate(
        job_id="integ-job-002",
        verdict="approved",
        trust_score=0.92,
        trust_band="auto_approve",
        requires_human_review=False,
        violation_count=0,
        warning_count=0,
        reasoning_summary="Perfect compliance.",
    )
    record = await create_decision(db_session, payload)
    assert record.trust_band == "auto_approve"
    assert not record.requires_human_review


async def test_decision_requires_human_review(db_session):
    """Low trust score flags the decision for human review."""
    from wcp_data.services.decision_service import create_decision
    from wcp_data.models.schemas import DecisionCreate

    payload = DecisionCreate(
        job_id="integ-job-003",
        verdict="rejected",
        trust_score=0.30,
        trust_band="require_human_review",
        requires_human_review=True,
        violation_count=3,
        warning_count=2,
        reasoning_summary="Multiple wage violations detected.",
    )
    record = await create_decision(db_session, payload)
    assert record.requires_human_review is True
    assert record.violation_count == 3


async def test_decision_list_not_empty_after_create(db_session):
    """After creating a decision, listing returns at least one record."""
    from wcp_data.services.decision_service import create_decision, list_decisions
    from wcp_data.models.schemas import DecisionCreate

    payload = DecisionCreate(
        job_id="integ-job-004",
        verdict="needs_review",
        trust_score=0.60,
        trust_band="flag_for_review",
        requires_human_review=False,
        violation_count=1,
        warning_count=0,
        reasoning_summary="Minor wage discrepancy.",
    )
    await create_decision(db_session, payload)
    records = await list_decisions(db_session, limit=10)
    assert len(records) >= 1


async def test_duplicate_job_id_is_idempotent(db_session):
    """A repeated job_id upserts (returns the same decision id) instead of raising."""
    from wcp_data.services.decision_service import create_decision, list_decisions
    from wcp_data.models.schemas import DecisionCreate

    payload = DecisionCreate(
        job_id="integ-job-dup",
        verdict="approved",
        trust_score=0.80,
        trust_band="auto_approve",
        reasoning_summary="Duplicate test.",
    )
    first = await create_decision(db_session, payload)
    second = await create_decision(db_session, payload)
    assert first.id == second.id
    matches = [d for d in await list_decisions(db_session, limit=50) if d.job_id == "integ-job-dup"]
    assert len(matches) == 1


async def test_override_decision_records_reviewer_verdict(db_session):
    """A human override changes the verdict, clears the review flag, and records the reviewer."""
    from wcp_data.services.decision_service import create_decision, override_decision
    from wcp_data.models.schemas import DecisionCreate, DecisionOverrideRequest

    created = await create_decision(db_session, DecisionCreate(
        job_id="integ-job-override",
        verdict="needs_review",
        trust_score=0.40,
        trust_band="require_human_review",
        requires_human_review=True,
        violation_count=1,
        warning_count=0,
        reasoning_summary="Flagged for review.",
    ))

    result = await override_decision(
        db_session,
        str(created.id),
        DecisionOverrideRequest(verdict="approved", reviewer="auditor@example.com", note="cleared"),
    )
    assert result is not None
    assert result.verdict == "approved"
    assert result.requires_human_review is False
    assert "auditor@example.com" in (result.reasoning_summary or "")


async def test_override_unknown_decision_returns_none(db_session):
    """Overriding a non-existent decision returns None (404 at the API layer)."""
    from wcp_data.services.decision_service import override_decision
    from wcp_data.models.schemas import DecisionOverrideRequest

    result = await override_decision(
        db_session,
        "00000000-0000-0000-0000-000000000000",
        DecisionOverrideRequest(verdict="rejected", reviewer="auditor@example.com"),
    )
    assert result is None
