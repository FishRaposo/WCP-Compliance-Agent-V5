from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import AuditEventCreate, AuditEventResponse
from wcp_data.repositories.audit_repo import append_audit_event as _append
from wcp_data.repositories.audit_repo import get_audit_events as _get_events


async def create_event(
    session: AsyncSession,
    event: AuditEventCreate,
) -> AuditEventResponse:
    return await _append(session, event)


async def get_events(
    session: AsyncSession,
    job_id: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditEventResponse]:
    return await _get_events(session, job_id, event_type, limit, offset)
