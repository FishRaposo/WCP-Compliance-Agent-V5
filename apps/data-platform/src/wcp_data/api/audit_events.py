from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import AuditEventCreate, AuditEventResponse
from wcp_data.services.audit_service import create_event, get_events

router = APIRouter()


@router.post("", response_model=AuditEventResponse, status_code=201)
async def create_audit_event(
    body: AuditEventCreate,
    session: AsyncSession = Depends(get_session),
) -> AuditEventResponse:
    return await create_event(session, body)


@router.get("", response_model=list[AuditEventResponse])
async def list_audit_events(
    job_id: str | None = Query(default=None),
    event_type: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> list[AuditEventResponse]:
    return await get_events(session, job_id, event_type, limit, offset)
