from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.events.producer import event_producer
from wcp_data.events.schemas import DecisionEvent
from wcp_data.models.schemas import (
    AuditEventCreate,
    AuditEventResponse,
    DecisionCreate,
    DecisionOverrideRequest,
    DecisionResponse,
)
from wcp_data.repositories.audit_repo import append_audit_event
from wcp_data.repositories.audit_repo import get_audit_events as _get_audit_events
from wcp_data.repositories.decision_repo import get_decision as _get_decision
from wcp_data.repositories.decision_repo import list_decisions as _list_decisions
from wcp_data.repositories.decision_repo import override_decision as _override_decision
from wcp_data.repositories.decision_repo import persist_decision


class DecisionConflictError(Exception):
    """Raised when a logical submission/review key carries a conflicting payload."""


async def create_decision(
    session: AsyncSession,
    draft: DecisionCreate,
    trace_id: str = "",
) -> tuple[DecisionResponse, str]:
    """Create the official decision for a job, idempotently on job_id.

    Returns ``(decision, status)``: ``created`` persists the decision and its
    audit events in one atomic transaction; ``duplicate`` replays the existing
    record without adding events (identical retry); ``conflict`` raises
    :class:`DecisionConflictError` for a different payload on the same job_id.
    """
    # Persist the decision and its audit events as a single atomic transaction.
    # The repositories flush (not commit); we commit once here after all inserts
    # succeed so a failure rolls the whole operation back.
    decision_id, status = await persist_decision(session, draft)
    if status == "conflict":
        await session.rollback()
        raise DecisionConflictError(
            f"job_id {draft.job_id} already has a different decision payload"
        )
    if status == "duplicate":
        existing = await _get_decision(session, decision_id)
        if existing is None:
            raise RuntimeError(f"Decision {decision_id} not found after insert")
        return existing, "duplicate"

    try:

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
    # A failed publish is recorded as a durable audit event so the undelivered
    # notification remains recoverable instead of being silently dropped.
    publish_error: str | None = None
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
    except Exception as exc:  # noqa: BLE001 — recorded below, delivery is retryable
        publish_error = str(exc) or exc.__class__.__name__

    if publish_error is not None:
        await append_audit_event(session, AuditEventCreate(
            job_id=draft.job_id,
            event_type="decision_event_publish_failed",
            actor="system",
            payload={
                "decision_id": decision_id,
                "error": publish_error,
                "recoverable": True,
            },
            trace_id=trace_id,
        ))
        await session.commit()

    result = await _get_decision(session, decision_id)
    if result is None:
        raise RuntimeError(f"Decision {decision_id} not found after insert")
    return result, "created"


async def override_decision(
    session: AsyncSession,
    decision_id: str,
    override: DecisionOverrideRequest,
    trace_id: str = "",
) -> tuple[DecisionResponse | None, str]:
    """Apply a human reviewer's override and record it as a human_review_complete audit event.

    The decision update and the audit event are committed as a single atomic transaction
    (mirroring create_decision). Returns ``(decision, status)``: ``created`` for a new
    official review, ``duplicate`` when the same reviewer submits the identical verdict
    and note again, or ``(None, "not_found")`` when no decision matches. A conflicting
    second review on an already-finalized decision raises
    :class:`DecisionConflictError` — the original findings stay immutable.
    """
    current = await _get_decision(session, decision_id)
    if current is None:
        return None, "not_found"

    # Actionable = still awaiting a human outcome: the explicit flag or an
    # unresolved pending verdict (legacy rows predate the flag). Anything else
    # is finalized; only an identical replay of its recorded review returns.
    actionable = current.requires_human_review or current.verdict == "needs_review"
    if not actionable:
        prior = await _find_review_event(session, current.job_id, decision_id)
        if (
            prior is not None
            and prior.actor == override.reviewer
            and prior.payload.get("new_verdict") == override.verdict
            and prior.payload.get("note") == override.note
        ):
            return current, "duplicate"
        raise DecisionConflictError(
            f"decision {decision_id} already has a finalized review"
        )

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
            # The compare-and-swap lost to a committed reviewer. Re-read after
            # rollback so identical concurrent retries replay, conflicts reject.
            fresh = await _get_decision(session, decision_id)
            if fresh is None:
                return None, "not_found"
            prior = await _find_review_event(session, fresh.job_id, decision_id)
            if (
                prior is not None and prior.actor == override.reviewer
                and prior.payload.get("new_verdict") == override.verdict
                and prior.payload.get("note") == override.note
            ):
                return fresh, "duplicate"
            raise DecisionConflictError(f"decision {decision_id} already has a finalized review")

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

    result = await _get_decision(session, decision_id)
    return result, "created"


async def _find_review_event(
    session: AsyncSession, job_id: str, decision_id: str
) -> AuditEventResponse | None:
    events = await _get_audit_events(session, job_id=job_id, event_type="human_review_complete")
    for event in events:
        if event.payload.get("decision_id") == decision_id:
            return event
    return None


async def get_decision(session: AsyncSession, decision_id: str) -> DecisionResponse | None:
    return await _get_decision(session, decision_id)


async def list_decisions(
    session: AsyncSession,
    contract_id: str | None = None,
    verdict: str | None = None,
    limit: int = 50,
    offset: int = 0,
    *,
    trust_band: str | None = None,
    requires_human_review: bool | None = None,
) -> list[DecisionResponse]:
    return await _list_decisions(
        session, contract_id, verdict, limit, offset,
        trust_band=trust_band, requires_human_review=requires_human_review,
    )
