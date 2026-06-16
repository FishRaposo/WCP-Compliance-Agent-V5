import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from wcp_compliance import __version__
from wcp_compliance.api.router import router
from wcp_compliance.config import settings
from wcp_compliance.observability.tracing import instrument_app, setup_tracing

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.skip_db_startup:
        logger.info("Skipping DB initialization due to SKIP_DB_STARTUP=True")
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )
    setup_tracing()
    instrument_app(app)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="WCP Compliance Core",
        version=__version__,
        description="Deterministic payroll compliance validation for Davis-Bacon Act",
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

    @app.get("/health")
    async def root_health() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    return app


app = create_app()
