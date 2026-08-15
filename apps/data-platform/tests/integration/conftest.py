"""Integration test conftest — spins up an in-memory SQLite-backed async session
and an in-process ASGI TestClient so tests run without Docker.

For full-stack tests with real PostgreSQL + Redis, use:
    docker compose -f infra/docker-compose.test.yml up -d
    DATABASE_URL=postgresql+asyncpg://wcp:wcp_test_password@localhost:5433/wcp_test \
    REDIS_URL=redis://localhost:6380 \
    poetry run pytest tests/integration -v
"""
import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("SKIP_DB_STARTUP", "true")

from wcp_data.models.tables import metadata  # noqa: E402
from wcp_data.main import create_app  # noqa: E402
from wcp_data.db.session import get_session  # noqa: E402


def _engine_options(db_url: str) -> dict[str, object]:
    if db_url.startswith("sqlite"):
        return {
            "connect_args": {"check_same_thread": False},
            "poolclass": StaticPool,
        }
    return {}


@pytest_asyncio.fixture()
async def engine():
    db_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    eng = create_async_engine(db_url, echo=False, **_engine_options(db_url))
    async with eng.begin() as conn:
        await conn.run_sync(metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture()
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture()
async def client(engine) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with Session() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()
