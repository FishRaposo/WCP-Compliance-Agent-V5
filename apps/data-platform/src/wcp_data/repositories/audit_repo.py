import json

from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import AuditEventCreate, AuditEventResponse
from wcp_data.models.tables import audit_events_table


async def append_audit_event(session: AsyncSession, event: AuditEventCreate) -> AuditEventResponse:
    result = await session.execute(
        text("""
            INSERT INTO audit_events (
                job_id, event_type, actor, payload,
                regulation_references, trace_id
            ) VALUES (
                :job_id, :event_type, :actor, :payload::jsonb,
                :regulation_references, :trace_id
            )
            RETURNING id, job_id, event_type, actor, payload,
                      regulation_references, trace_id, created_at
        """),
        {
            "job_id": event.job_id,
            "event_type": event.event_type,
            "actor": event.actor,
            "payload": json.dumps(event.payload),
            "regulation_references": event.regulation_references or [],
            "trace_id": event.trace_id,
        },
    )
    row = result.fetchone()
    if row is None:
        raise RuntimeError("INSERT INTO audit_events did not return a row")
    await session.commit()

    return AuditEventResponse(
        id=str(row.id),
        job_id=row.job_id,
        event_type=row.event_type,
        actor=row.actor,
        payload=row.payload,
        regulation_references=row.regulation_references or [],
        trace_id=row.trace_id or "",
        created_at=row.created_at,
    )


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
