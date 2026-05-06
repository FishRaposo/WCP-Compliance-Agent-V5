"""Seed a dev admin user into PostgreSQL.

Usage: cd apps/data-platform && poetry run python scripts/seed_user.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from wcp_data.models.tables import users_table

try:
    import bcrypt
except ImportError:
    bcrypt = None


async def main() -> None:
    from wcp_data.db.session import engine

    email = "admin@wcp.local"
    password = "admin123"
    role = "admin"

    if bcrypt:
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
    else:
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()

    async with engine.begin() as conn:
        existing = await conn.execute(
            users_table.select().where(users_table.c.email == email)
        )
        if existing.first():
            print(f"User '{email}' already exists. Skipping.")
            return

        await conn.execute(
            users_table.insert().values(
                email=email,
                password_hash=password_hash,
                role=role,
            )
        )

    print(f"Seeded user '{email}' with role '{role}'.")


if __name__ == "__main__":
    asyncio.run(main())
