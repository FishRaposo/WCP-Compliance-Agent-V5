from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    DecisionCreate,
    DecisionResponse,
)
from wcp_data.models.tables import decisions_table


async def persist_decision(session: AsyncSession, decision: DecisionCreate) -> str:
    """Insert a decision idempotently on job_id.

    A duplicate job_id updates the existing row and returns its id rather than
    raising IntegrityError. Does NOT commit — the caller owns the transaction so
    the decision and its audit events persist atomically.
    """
    values = {
        "job_id": decision.job_id,
        "verdict": decision.verdict,
        "trust_score": decision.trust_score,
        "trust_band": decision.trust_band,
        "requires_human_review": decision.requires_human_review,
        "violation_count": decision.violation_count,
        "warning_count": decision.warning_count,
        "reasoning_summary": decision.reasoning_summary,
        "citations": [c.model_dump() for c in (decision.citations or [])],
        "cost_usd": decision.cost_usd,
        "latency_ms": decision.latency_ms,
        "phoenix_trace_id": decision.phoenix_trace_id,
        "contract_id": decision.contract_id,
    }
    bind = session.get_bind()
    insert_fn = (
        sqlite_insert
        if bind is not None and bind.dialect.name == "sqlite"
        else pg_insert
    )
    stmt = insert_fn(decisions_table).values(**values)
    update_cols = {k: stmt.excluded[k] for k in values if k != "job_id"}
    stmt = stmt.on_conflict_do_update(
        index_elements=[decisions_table.c.job_id],
        set_=update_cols,
    ).returning(decisions_table.c.id)
    result = await session.execute(stmt)
    row = result.fetchone()
    if row is None:
        raise RuntimeError("INSERT INTO decisions did not return an id")
    await session.flush()
    return str(row.id)


async def override_decision(
    session: AsyncSession,
    decision_id: str,
    *,
    verdict: str,
    reasoning_summary: str,
) -> str | None:
    """Apply a human-review override to a decision (verdict + cleared review flag + reasoning).

    Returns the decision id, or None if no decision matches. Does NOT commit — the caller
    owns the transaction so the override and its audit event persist atomically.
    """
    stmt = (
        update(decisions_table)
        .where(decisions_table.c.id == decision_id)
        .values(
            verdict=verdict,
            requires_human_review=False,
            reasoning_summary=reasoning_summary,
        )
        .returning(decisions_table.c.id)
    )
    result = await session.execute(stmt)
    row = result.fetchone()
    if row is None:
        return None
    await session.flush()
    return str(row.id)


async def get_decision(session: AsyncSession, decision_id: str) -> DecisionResponse | None:
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
