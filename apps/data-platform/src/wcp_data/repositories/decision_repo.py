import json
from datetime import datetime, timezone

from sqlalchemy import insert, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    DecisionCreate,
    DecisionResponse,
)
from wcp_data.models.tables import audit_events_table, decisions_table


async def persist_decision(session: AsyncSession, decision: DecisionCreate) -> str:
    result = await session.execute(
        text("""
            INSERT INTO decisions (
                job_id, verdict, trust_score, trust_band,
                requires_human_review, violation_count, warning_count,
                reasoning_summary, citations, cost_usd, latency_ms,
                phoenix_trace_id, contract_id
            ) VALUES (
                :job_id, :verdict, :trust_score, :trust_band,
                :requires_human_review, :violation_count, :warning_count,
                :reasoning_summary, :citations::jsonb, :cost_usd, :latency_ms,
                :phoenix_trace_id, :contract_id
            )
            RETURNING id
        """),
        {
            "job_id": decision.job_id,
            "verdict": decision.verdict,
            "trust_score": decision.trust_score,
            "trust_band": decision.trust_band,
            "requires_human_review": decision.requires_human_review,
            "violation_count": decision.violation_count,
            "warning_count": decision.warning_count,
            "reasoning_summary": decision.reasoning_summary,
            "citations": json.dumps([c.model_dump() for c in (decision.citations or [])]),
            "cost_usd": decision.cost_usd,
            "latency_ms": decision.latency_ms,
            "phoenix_trace_id": decision.phoenix_trace_id,
            "contract_id": decision.contract_id,
        },
    )
    row = result.fetchone()
    if row is None:
        raise RuntimeError("INSERT INTO decisions did not return an id")
    await session.commit()
    return str(row.id)


async def get_decision(
    session: AsyncSession,
    decision_id: str,
    tenant_id: str | None = None,
) -> DecisionResponse | None:
    query = select(decisions_table).where(decisions_table.c.id == decision_id)
    if tenant_id is not None:
        query = query.where(decisions_table.c.tenant_id == tenant_id)
    result = await session.execute(query)
    row = result.first()
    if row is None:
        return None
    data = dict(row._mapping)
    data["id"] = str(data["id"])
    return DecisionResponse.model_validate(data)


async def list_decisions(
    session: AsyncSession,
    contract_id: str | None = None,
    verdict: str | None = None,
    limit: int = 50,
    offset: int = 0,
    tenant_id: str | None = None,
) -> list[DecisionResponse]:
    query = select(decisions_table)
    if contract_id:
        query = query.where(decisions_table.c.contract_id == contract_id)
    if verdict:
        query = query.where(decisions_table.c.verdict == verdict)
    if tenant_id is not None:
        query = query.where(decisions_table.c.tenant_id == tenant_id)
    query = query.order_by(decisions_table.c.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(query)
    items = []
    for row in result.fetchall():
        data = dict(row._mapping)
        data["id"] = str(data["id"])
        items.append(DecisionResponse.model_validate(data))
    return items


async def override_decision(
    session: AsyncSession,
    decision_id: str,
    *,
    review_status: str,
    reviewed_by: str,
    review_note: str = "",
    tenant_id: str | None = None,
) -> DecisionResponse | None:
    """Persist a human-review override and append a ``decision_override`` audit
    event in a single transaction.

    Uses dialect-agnostic SQLAlchemy ``update()``/``insert()`` (no raw Postgres
    SQL) so it can be unit-tested against a mocked session. Returns ``None``
    when the decision does not exist (or belongs to another tenant), without
    committing.
    """
    reviewed_at = datetime.now(timezone.utc)

    stmt = (
        update(decisions_table)
        .where(decisions_table.c.id == decision_id)
        .values(
            review_status=review_status,
            reviewed_by=reviewed_by,
            review_note=review_note,
            reviewed_at=reviewed_at,
        )
        .returning(decisions_table)
    )
    if tenant_id is not None:
        stmt = stmt.where(decisions_table.c.tenant_id == tenant_id)

    result = await session.execute(stmt)
    row = result.first()
    if row is None:
        return None

    data = dict(row._mapping)
    data["id"] = str(data["id"])

    await session.execute(
        insert(audit_events_table).values(
            job_id=data["job_id"],
            event_type="decision_override",
            actor=reviewed_by,
            payload={
                "decision_id": data["id"],
                "review_status": review_status,
                "review_note": review_note,
            },
            tenant_id=data.get("tenant_id") or "default",
        )
    )
    await session.commit()
    return DecisionResponse.model_validate(data)
