import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from wcp_compliance.dbwd_matching.rate_lookup import get_dbwd_rate

logger = logging.getLogger(__name__)
router = APIRouter()


class DBWDRateResponse(BaseModel):
    trade: str
    locality: str
    rate: float
    fringe: float
    effective_date: str
    wage_determination_number: str


@router.get("/{trade}/{locality}/{effective_date}", response_model=DBWDRateResponse)
async def lookup_dbwd_rate(
    trade: str,
    locality: str,
    effective_date: str,
) -> DBWDRateResponse:
    try:
        record = await get_dbwd_rate(trade, locality, effective_date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    return DBWDRateResponse(
        trade=record.trade,
        locality=record.locality,
        rate=record.rate,
        fringe=record.fringe,
        effective_date=record.effective_date.isoformat(),
        wage_determination_number=record.wage_determination_number,
    )
