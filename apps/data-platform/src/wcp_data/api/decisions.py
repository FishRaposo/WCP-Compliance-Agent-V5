from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import DecisionCreate, DecisionResponse
from wcp_data.services.decision_service import create_decision, get_decision, list_decisions

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
    session: AsyncSession = Depends(get_session),
) -> list[DecisionResponse]:
    return await list_decisions(session, contract_id, verdict, limit, offset)


@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision_endpoint(
    decision_id: str,
    session: AsyncSession = Depends(get_session),
) -> DecisionResponse:
    result = await get_decision(session, decision_id)
    if result is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Decision not found")
    return result
