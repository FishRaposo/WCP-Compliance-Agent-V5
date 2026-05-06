"""Seed all data stores: DBWD rates + dev user + sample contract."""

import asyncio

from wcp_data.db.session import async_session
from wcp_data.services.dbwd_service import refresh_rates


async def seed_all():
    async with async_session() as session:
        print("Seeding DBWD rates...")
        count = await refresh_rates(session)
        print(f"  {count} rates seeded")

        print("Seeding dev user...")
        from sqlalchemy import select, text
        existing = await session.execute(
            select(text("1")).select_from(text("users")).where(text("email = 'dev@wcp.local'"))
        )
        if not existing.scalar():
            await session.execute(
                text(
                    "INSERT INTO users (email, password_hash, role) "
                    "VALUES ('dev@wcp.local', 'not-a-real-hash', 'admin')"
                )
            )
            await session.commit()
            print("  Dev user created (dev@wcp.local / dev)")
        else:
            print("  Dev user already exists")

        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed_all())
