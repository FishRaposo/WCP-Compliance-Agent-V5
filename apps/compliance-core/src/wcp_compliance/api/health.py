from fastapi import APIRouter
from pydantic import BaseModel

from wcp_compliance import __version__

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    service: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        service="wcp-compliance-core",
    )
