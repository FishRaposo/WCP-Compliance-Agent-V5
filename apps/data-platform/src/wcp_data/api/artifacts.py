from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.repositories.artifact_repo import (
    get_artifact_metadata,
    store_artifact_metadata,
)

router = APIRouter()


@router.post("")
async def create_artifact(
    artifact_id: str,
    metadata: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await store_artifact_metadata(session, artifact_id, metadata)


@router.get("/{artifact_id}")
async def get_artifact(
    artifact_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any] | None:
    result = await get_artifact_metadata(session, artifact_id)
    if result is None:
        return {"error": "not found"}
    return result
