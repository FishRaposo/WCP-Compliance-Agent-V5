import json
import logging
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def store_artifact_metadata(
    session: AsyncSession, artifact_id: str, metadata: dict[str, Any]
) -> dict[str, Any]:
    await session.execute(
        text("""
            INSERT INTO artifacts (id, metadata)
            VALUES (:id, :metadata::jsonb)
            ON CONFLICT (id) DO UPDATE SET metadata = :metadata::jsonb
        """),
        {"id": artifact_id, "metadata": json.dumps(metadata)},
    )
    await session.commit()
    logger.info("Artifact stored: %s", artifact_id)
    return {"artifact_id": artifact_id, "status": "stored"}


async def get_artifact_metadata(
    session: AsyncSession, artifact_id: str
) -> dict[str, Any] | None:
    result = await session.execute(
        text("SELECT metadata FROM artifacts WHERE id = :id"),
        {"id": artifact_id},
    )
    row = result.fetchone()
    if row is None:
        return None
    metadata = row.metadata
    if isinstance(metadata, str):
        return json.loads(metadata)
    return metadata or {}
