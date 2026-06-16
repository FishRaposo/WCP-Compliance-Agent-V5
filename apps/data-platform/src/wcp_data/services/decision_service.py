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
    decision_id = await persist_decision(session, draft)

    await append_audit_event(session, AuditEventCreate(
        job_id=draft.job_id,
        event_type="decision_created",
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
            event_type="human_review_flagged",
            actor="system",
            payload={
                "decision_id": decision_id,
                "trust_score": draft.trust_score,
                "trust_band": draft.trust_band,
            },
            trace_id=trace_id,
        ))

    # Publish decision event to Redis Streams (fire-and-forget)
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


async def get_decision(
    session: AsyncSession,
    decision_id: str,
    tenant_id: str | None = None,
) -> DecisionResponse | None:
    return await _get_decision(session, decision_id, tenant_id=tenant_id)


async def list_decisions(
    session: AsyncSession,
    contract_id: str | None = None,
    verdict: str | None = None,
    limit: int = 50,
    offset: int = 0,
    tenant_id: str | None = None,
) -> list[DecisionResponse]:
    return await _list_decisions(
        session, contract_id, verdict, limit, offset, tenant_id=tenant_id
    )


async def override_decision(
    session: AsyncSession,
    decision_id: str,
    override: DecisionOverrideRequest,
    tenant_id: str | None = None,
) -> DecisionResponse | None:
    return await _override_decision(
        session,
        decision_id,
        review_status=override.review_status,
        reviewed_by=override.reviewed_by,
        review_note=override.review_note,
        tenant_id=tenant_id,
    )
