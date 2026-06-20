from sqlalchemy import desc, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import AuditEventCreate, AuditEventResponse
from wcp_data.models.tables import audit_events_table


def _audit_row_data(row: object) -> dict[str, object]:
    data = dict(getattr(row, "_mapping", {}) or {})
    if "id" in data:
        return data
    return {
        "id": getattr(row, "id"),
        "job_id": getattr(row, "job_id"),
        "event_type": getattr(row, "event_type"),
        "actor": getattr(row, "actor"),
        "payload": getattr(row, "payload"),
        "regulation_references": getattr(row, "regulation_references"),
        "trace_id": getattr(row, "trace_id"),
        "created_at": getattr(row, "created_at"),
    }


async def append_audit_event(session: AsyncSession, event: AuditEventCreate) -> AuditEventResponse:
    result = await session.execute(
        insert(audit_events_table)
        .values(
            job_id=event.job_id,
            event_type=event.event_type,
            actor=event.actor,
            payload=event.payload,
            regulation_references=event.regulation_references or [],
            trace_id=event.trace_id,
        )
        .returning(audit_events_table)
    )
    row = result.fetchone()
    if row is None:
        raise RuntimeError("INSERT INTO audit_events did not return a row")
    # No commit here — the caller owns the transaction so the decision and its
    # audit events persist atomically. flush() makes the generated row visible.
    await session.flush()

    data = _audit_row_data(row)
    data["id"] = str(data["id"])
    data["regulation_references"] = data["regulation_references"] or []
    data["trace_id"] = data["trace_id"] or ""
    return AuditEventResponse.model_validate(data)


async def get_audit_events(
    session: AsyncSession,
    job_id: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditEventResponse]:
    query = select(audit_events_table)
    if job_id:
        query = query.where(audit_events_table.c.job_id == job_id)
    if event_type:
        query = query.where(audit_events_table.c.event_type == event_type)
    query = query.order_by(desc(audit_events_table.c.created_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    items = []
    for row in result.fetchall():
        data = dict(row._mapping)
        data["id"] = str(data["id"])
        items.append(AuditEventResponse.model_validate(data))
    return items
