"""Seed DBWD rates into PostgreSQL.

Port of the 20-trade corpus from compliance-core's in-memory fallback.
Usage: cd apps/data-platform && poetry run python scripts/seed_dbwd.py
"""
import asyncio
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from wcp_data.db.session import engine
from wcp_data.models.tables import dbwd_rates_table

FALLBACK_CORPUS = [
    ("Electrician", "Washington, DC", 51.69, 34.63, "2025-01-01", "DC-2025-001"),
    ("Plumber", "Washington, DC", 47.85, 28.42, "2025-01-01", "DC-2025-001"),
    ("Carpenter", "Washington, DC", 43.20, 25.10, "2025-01-01", "DC-2025-001"),
    ("Laborer", "Washington, DC", 28.50, 15.75, "2025-01-01", "DC-2025-001"),
    ("Ironworker", "Washington, DC", 52.30, 30.15, "2025-01-01", "DC-2025-001"),
    ("Equipment Operator", "Washington, DC", 44.60, 22.80, "2025-01-01", "DC-2025-001"),
    ("Painter", "Washington, DC", 38.90, 18.50, "2025-01-01", "DC-2025-001"),
    ("Sheet Metal Worker", "Washington, DC", 46.75, 27.30, "2025-01-01", "DC-2025-001"),
    ("HVAC Technician", "Washington, DC", 49.10, 29.45, "2025-01-01", "DC-2025-001"),
    ("Welder", "Washington, DC", 48.25, 26.90, "2025-01-01", "DC-2025-001"),
    ("Mason", "Washington, DC", 42.15, 23.60, "2025-01-01", "DC-2025-001"),
    ("Roofer", "Washington, DC", 39.50, 19.25, "2025-01-01", "DC-2025-001"),
    ("Glazier", "Washington, DC", 41.80, 22.40, "2025-01-01", "DC-2025-001"),
    ("Insulation Worker", "Washington, DC", 37.60, 20.15, "2025-01-01", "DC-2025-001"),
    ("Tile Setter", "Washington, DC", 40.25, 21.80, "2025-01-01", "DC-2025-001"),
    ("Drywall Installer", "Washington, DC", 35.90, 17.65, "2025-01-01", "DC-2025-001"),
    ("Concrete Finisher", "Washington, DC", 38.40, 19.90, "2025-01-01", "DC-2025-001"),
    ("Surveyor", "Washington, DC", 45.30, 24.50, "2025-01-01", "DC-2025-001"),
    ("Flagger", "Washington, DC", 22.75, 12.30, "2025-01-01", "DC-2025-001"),
    ("Truck Driver", "Washington, DC", 30.20, 16.45, "2025-01-01", "DC-2025-001"),
]


async def main() -> None:
    async with engine.begin() as conn:
        for trade, locality, rate, fringe, effective, wd_num in FALLBACK_CORPUS:
            await conn.execute(
                dbwd_rates_table.insert().values(
                    trade=trade,
                    locality=locality,
                    rate=rate,
                    fringe=fringe,
                    effective_date=date.fromisoformat(effective),
                    wage_determination_number=wd_num,
                )
            )

    print(f"Seeded {len(FALLBACK_CORPUS)} DBWD rates into PostgreSQL.")


if __name__ == "__main__":
    asyncio.run(main())
