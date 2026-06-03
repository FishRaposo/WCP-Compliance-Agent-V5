import json

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    DecisionCreate,
    DecisionResponse,
)


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


async def get_decision(session: AsyncSession, decision_id: str) -> DecisionResponse | None:
    # PERF-03: Remove duplicate query - keep only the proper SQLAlchemy query
    from wcp_data.models.tables import decisions_table

    result = await session.execute(
        select(decisions_table).where(decisions_table.c.id == decision_id)
    )
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
) -> list[DecisionResponse]:
    from wcp_data.models.tables import decisions_table

    query = select(decisions_table)
    if contract_id:
        query = query.where(decisions_table.c.contract_id == contract_id)
    if verdict:
        query = query.where(decisions_table.c.verdict == verdict)
    query = query.order_by(decisions_table.c.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(query)
    items = []
    for row in result.fetchall():
        data = dict(row._mapping)
        data["id"] = str(data["id"])
        items.append(DecisionResponse.model_validate(data))
    return items
