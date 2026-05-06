from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import DBWDRateResponse
from wcp_data.models.tables import dbwd_rates_table


async def get_rates(
    session: AsyncSession,
    trade: str | None = None,
    locality: str | None = None,
    limit: int = 100,
) -> list[DBWDRateResponse]:
    query = select(dbwd_rates_table)
    if trade:
        query = query.where(dbwd_rates_table.c.trade == trade)
    if locality:
        query = query.where(dbwd_rates_table.c.locality == locality)
    query = query.order_by(dbwd_rates_table.c.effective_date.desc()).limit(limit)
    result = await session.execute(query)
    items = []
    for row in result.fetchall():
        data = dict(row._mapping)
        data["id"] = str(data["id"])
        items.append(DBWDRateResponse.model_validate(data))
    return items


async def get_rate_by_trade_locality(
    session: AsyncSession,
    trade: str,
    locality: str,
) -> DBWDRateResponse | None:
    result = await session.execute(
        select(dbwd_rates_table)
        .where(dbwd_rates_table.c.trade == trade, dbwd_rates_table.c.locality == locality)
        .order_by(dbwd_rates_table.c.effective_date.desc())
        .limit(1)
    )
    row = result.first()
    if row is None:
        return None
    data = dict(row._mapping)
    data["id"] = str(data["id"])
    return DBWDRateResponse.model_validate(data)
