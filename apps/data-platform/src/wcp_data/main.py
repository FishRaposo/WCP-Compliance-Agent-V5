from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from wcp_data.api.router import router
from wcp_data.config import settings
from wcp_data.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if not settings.skip_db_startup:
        await init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="WCP Data Platform",
        version="5.0.0",
        description="Persistence and data management for WCP Compliance Agent V5",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


app = create_app()
