from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import DBWDRateResponse
from wcp_data.services.dbwd_service import get_rates, refresh_rates

router = APIRouter()


@router.get("/rates", response_model=list[DBWDRateResponse])
async def get_dbwd_rates(
    trade: str | None = Query(default=None),
    locality: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    session: AsyncSession = Depends(get_session),
) -> list[DBWDRateResponse]:
    return await get_rates(session, trade, locality, limit)


@router.post("/refresh")
async def refresh_dbwd_rates(
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    count = await refresh_rates(session)
    return {"refreshed": count}
