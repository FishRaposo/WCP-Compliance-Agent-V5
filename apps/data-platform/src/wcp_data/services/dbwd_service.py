import logging
from datetime import date

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import DBWDRateResponse
from wcp_data.models.tables import dbwd_rates_table
from wcp_data.repositories.dbwd_repo import get_rates as _get_rates

logger = logging.getLogger(__name__)

FALLBACK_CORPUS = [
    {"trade": "Electrician", "locality": "Washington, DC", "rate": 51.69, "fringe": 34.63, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Plumber", "locality": "Washington, DC", "rate": 47.85, "fringe": 28.42, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Carpenter", "locality": "Washington, DC", "rate": 43.20, "fringe": 25.10, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Laborer", "locality": "Washington, DC", "rate": 28.50, "fringe": 15.75, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Ironworker", "locality": "Washington, DC", "rate": 52.30, "fringe": 30.15, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Equipment Operator", "locality": "Washington, DC", "rate": 44.60, "fringe": 22.80, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Painter", "locality": "Washington, DC", "rate": 38.90, "fringe": 18.50, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Sheet Metal Worker", "locality": "Washington, DC", "rate": 46.75, "fringe": 27.30, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "HVAC Technician", "locality": "Washington, DC", "rate": 49.10, "fringe": 29.45, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Welder", "locality": "Washington, DC", "rate": 48.25, "fringe": 26.90, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Mason", "locality": "Washington, DC", "rate": 42.15, "fringe": 23.60, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Roofer", "locality": "Washington, DC", "rate": 39.50, "fringe": 19.25, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Glazier", "locality": "Washington, DC", "rate": 41.80, "fringe": 22.40, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Insulation Worker", "locality": "Washington, DC", "rate": 37.60, "fringe": 20.15, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Tile Setter", "locality": "Washington, DC", "rate": 40.25, "fringe": 21.80, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Drywall Installer", "locality": "Washington, DC", "rate": 35.90, "fringe": 17.65, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Concrete Finisher", "locality": "Washington, DC", "rate": 38.40, "fringe": 19.90, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Surveyor", "locality": "Washington, DC", "rate": 45.30, "fringe": 24.50, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Flagger", "locality": "Washington, DC", "rate": 22.75, "fringe": 12.30, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
    {"trade": "Truck Driver", "locality": "Washington, DC", "rate": 30.20, "fringe": 16.45, "effective_date": "2025-01-01", "wage_determination_number": "DC-2025-001"},
]


async def get_rates(
    session: AsyncSession,
    trade: str | None = None,
    locality: str | None = None,
    limit: int = 100,
) -> list[DBWDRateResponse]:
    return await _get_rates(session, trade, locality, limit)


async def refresh_rates(session: AsyncSession) -> int:
    count = 0
    for item in FALLBACK_CORPUS:
        existing = await session.execute(
            select(dbwd_rates_table).where(
                dbwd_rates_table.c.trade == item["trade"],
                dbwd_rates_table.c.locality == item["locality"],
            )
        )
        row = existing.first()

        if row:
            await session.execute(
                update(dbwd_rates_table)
                .where(dbwd_rates_table.c.trade == item["trade"])
                .where(dbwd_rates_table.c.locality == item["locality"])
                .values(
                    rate=item["rate"],
                    fringe=item["fringe"],
                    effective_date=date.fromisoformat(item["effective_date"]),
                    wage_determination_number=item["wage_determination_number"],
                )
            )
        else:
            await session.execute(
                insert(dbwd_rates_table).values(
                    trade=item["trade"],
                    locality=item["locality"],
                    rate=item["rate"],
                    fringe=item["fringe"],
                    effective_date=date.fromisoformat(item["effective_date"]),
                    wage_determination_number=item["wage_determination_number"],
                )
            )
        count += 1

    await session.commit()
    logger.info("DBWD rates refreshed: %d records", count)
    return count
