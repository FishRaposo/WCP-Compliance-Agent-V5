from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import (
    DecisionCreate,
    DecisionOverrideRequest,
    DecisionResponse,
)
from wcp_data.services.decision_service import (
    create_decision,
    get_decision,
    list_decisions,
    override_decision,
)

router = APIRouter()


@router.post("", response_model=DecisionResponse, status_code=201)
async def create_decision_endpoint(
    body: DecisionCreate,
    trace_id: str = Query(default=""),
    session: AsyncSession = Depends(get_session),
) -> DecisionResponse:
    return await create_decision(session, body, trace_id=trace_id)


@router.get("", response_model=list[DecisionResponse])
async def list_decisions_endpoint(
    contract_id: str | None = Query(default=None),
    verdict: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
    session: AsyncSession = Depends(get_session),
) -> list[DecisionResponse]:
    return await list_decisions(session, contract_id, verdict, limit, offset, tenant_id=tenant_id)


@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision_endpoint(
    decision_id: str,
    tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
    session: AsyncSession = Depends(get_session),
) -> DecisionResponse:
    result = await get_decision(session, decision_id, tenant_id=tenant_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    return result


@router.post("/{decision_id}/override", response_model=DecisionResponse)
async def override_decision_endpoint(
    decision_id: str,
    body: DecisionOverrideRequest,
    tenant_id: str | None = Header(default=None, alias="X-Tenant-Id"),
    session: AsyncSession = Depends(get_session),
) -> DecisionResponse:
    result = await override_decision(session, decision_id, body, tenant_id=tenant_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    return result
