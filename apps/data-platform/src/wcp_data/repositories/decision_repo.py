from typing import Any, Literal

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    DecisionCreate,
    DecisionResponse,
)
from wcp_data.models.tables import decisions_table

PersistStatus = Literal["created", "duplicate", "conflict"]

# Fields that define the logical decision payload for idempotency. Call
# metadata (latency, cost, trace ids) legitimately varies across retries and
# is deliberately excluded from the identical/conflicting comparison.
_PAYLOAD_FIELDS = (
    "verdict",
    "trust_score",
    "trust_band",
    "requires_human_review",
    "violation_count",
    "warning_count",
    "reasoning_summary",
    "citations",
    "contract_id",
)


def _decision_values(decision: DecisionCreate) -> dict[str, Any]:
    return {
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


async def persist_decision(
    session: AsyncSession, decision: DecisionCreate
) -> tuple[str, PersistStatus]:
    """Insert a decision idempotently on job_id.

    Returns ``(decision_id, status)`` where status is ``created`` for a new
    row, ``duplicate`` when an identical payload was already persisted for the
    same job_id (retry-safe replay), or ``conflict`` when the same job_id
    carries a different payload — the caller must reject that case rather than
    silently overwrite the official record. Does NOT commit — the caller owns
    the transaction so the decision and its audit events persist atomically.
    """
    values = _decision_values(decision)
    bind = session.get_bind()
    insert_fn = (
        sqlite_insert
        if bind is not None and bind.dialect.name == "sqlite"
        else pg_insert
    )
    stmt: Any = (
        insert_fn(decisions_table)
        .values(**values)
        .on_conflict_do_nothing(index_elements=[decisions_table.c.job_id])
        .returning(decisions_table.c.id)
    )
    result = await session.execute(stmt)
    row = result.fetchone()
    if row is not None:
        await session.flush()
        return str(row.id), "created"

    result = await session.execute(
        select(decisions_table).where(decisions_table.c.job_id == decision.job_id)
    )
    existing = result.first()
    if existing is None:
        raise RuntimeError("INSERT INTO decisions did not return an id")
    data = dict(existing._mapping)
    identical = all(
        _canonical(data[field]) == _canonical(values[field]) for field in _PAYLOAD_FIELDS
    )
    return str(data["id"]), "duplicate" if identical else "conflict"


def _canonical(value: Any) -> Any:
    if isinstance(value, list):
        return [_canonical(v) for v in value]
    if isinstance(value, dict):
        return {k: _canonical(v) for k, v in sorted(value.items())}
    if isinstance(value, float) or value is None:
        return value
    return value


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
