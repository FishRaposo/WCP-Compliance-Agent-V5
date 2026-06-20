from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.events.producer import event_producer
from wcp_data.events.schemas import DecisionEvent
from wcp_data.models.schemas import (
    AuditEventCreate,
    DecisionCreate,
    DecisionOverrideRequest,
    DecisionResponse,
)
from wcp_data.repositories.audit_repo import append_audit_event
from wcp_data.repositories.decision_repo import get_decision as _get_decision
from wcp_data.repositories.decision_repo import list_decisions as _list_decisions
from wcp_data.repositories.decision_repo import override_decision as _override_decision
from wcp_data.repositories.decision_repo import persist_decision


async def create_decision(
    session: AsyncSession,
    draft: DecisionCreate,
    trace_id: str = "",
) -> DecisionResponse:
    # Persist the decision and its audit events as a single atomic transaction.
    # The repositories flush (not commit); we commit once here after all inserts
    # succeed so a failure rolls the whole operation back.
    try:
        decision_id = await persist_decision(session, draft)

        await append_audit_event(session, AuditEventCreate(
            job_id=draft.job_id,
            event_type="decision_persisted",
            actor="agent",
            payload={
                "decision_id": decision_id,
                "verdict": draft.verdict,
                "trust_score": draft.trust_score,
                "trust_band": draft.trust_band,
                "requires_human_review": draft.requires_human_review,
            },
            regulation_references=[c.regulation for c in draft.citations if c.regulation],
            trace_id=trace_id,
        ))

        if draft.requires_human_review:
            await append_audit_event(session, AuditEventCreate(
                job_id=draft.job_id,
                event_type="human_review_queued",
                actor="system",
                payload={
                    "decision_id": decision_id,
                    "trust_score": draft.trust_score,
                    "trust_band": draft.trust_band,
                },
                trace_id=trace_id,
            ))

        await session.commit()
    except Exception:
        await session.rollback()
        raise

    # Publish decision event to Redis Streams only after the commit succeeds
    # (fire-and-forget — a publish failure must not undo the persisted record).
    try:
        await event_producer.publish_decision(
            DecisionEvent(
                decision_id=decision_id,
                job_id=draft.job_id,
                verdict=draft.verdict,
                trust_score=draft.trust_score,
                trust_band=draft.trust_band,
                requires_human_review=draft.requires_human_review,
                violation_count=draft.violation_count,
                warning_count=draft.warning_count,
                trace_id=trace_id,
            )
        )
    except Exception:
        pass

    result = await _get_decision(session, decision_id)
    if result is None:
        raise RuntimeError(f"Decision {decision_id} not found after insert")
    return result


async def override_decision(
    session: AsyncSession,
    decision_id: str,
    override: DecisionOverrideRequest,
    trace_id: str = "",
) -> DecisionResponse | None:
    """Apply a human reviewer's override and record it as a human_review_complete audit event.

    The decision update and the audit event are committed as a single atomic transaction
    (mirroring create_decision). Returns the updated decision, or None if not found.
    """
    current = await _get_decision(session, decision_id)
    if current is None:
        return None

    previous_verdict = current.verdict
    note_suffix = f" — {override.note}" if override.note else ""
    base = (current.reasoning_summary or "").strip()
    new_reasoning = (
        f"{base} [Human review by {override.reviewer}: {override.verdict}{note_suffix}]"
    ).strip()

    try:
        updated_id = await _override_decision(
            session,
            decision_id,
            verdict=override.verdict,
            reasoning_summary=new_reasoning,
        )
        if updated_id is None:
            await session.rollback()
            return None

        await append_audit_event(session, AuditEventCreate(
            job_id=current.job_id,
            event_type="human_review_complete",
            actor=override.reviewer,
            payload={
                "decision_id": decision_id,
                "previous_verdict": previous_verdict,
                "new_verdict": override.verdict,
                "note": override.note,
            },
            trace_id=trace_id,
        ))

        await session.commit()
    except Exception:
        await session.rollback()
        raise

    return await _get_decision(session, decision_id)


async def get_decision(session: AsyncSession, decision_id: str) -> DecisionResponse | None:
    return await _get_decision(session, decision_id)


async def list_decisions(
    session: AsyncSession,
    contract_id: str | None = None,
    verdict: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[DecisionResponse]:
    return await _list_decisions(session, contract_id, verdict, limit, offset)
