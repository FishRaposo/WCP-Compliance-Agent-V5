from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import IngestionJobResponse, IngestionJobUpdate
from wcp_data.models.tables import ingestion_jobs_table

router = APIRouter()


def _as_response(row: object) -> IngestionJobResponse:
    data = dict(getattr(row, "_mapping", {}) or {})
    data["job_id"] = data.pop("id")
    return IngestionJobResponse.model_validate(data)


@router.post("/jobs", response_model=IngestionJobResponse, status_code=201)
async def create_ingestion_job(
    body: dict[str, Any],
    session: AsyncSession = Depends(get_session),
) -> IngestionJobResponse:
    values = {
        "type": body.get("type", "unknown"),
        "source_type": body.get("source_type", "manual"),
        "source_reference": body.get("source_reference"),
        "contract_id": body.get("contract_id"),
        "total_records": body.get("total_records", 0),
    }
    result = await session.execute(
        insert(ingestion_jobs_table).values(**values).returning(ingestion_jobs_table)
    )
    row = result.first()
    await session.commit()
    if row is None:
        raise RuntimeError("Ingestion job insert failed")
    return _as_response(row)


@router.get("/jobs/{job_id}", response_model=IngestionJobResponse)
async def get_ingestion_job(
    job_id: str,
    session: AsyncSession = Depends(get_session),
) -> IngestionJobResponse:
    result = await session.execute(
        select(ingestion_jobs_table).where(ingestion_jobs_table.c.id == job_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return _as_response(row)


@router.patch("/jobs/{job_id}", response_model=IngestionJobResponse)
async def update_ingestion_job(
    job_id: str,
    body: IngestionJobUpdate,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> IngestionJobResponse:
    """Persist incremental progress without changing the original job response."""
    values = body.model_dump(exclude_none=True)
    if not values:
        raise HTTPException(status_code=422, detail="At least one ingestion job field is required")
    if values.get("status") == "running":
        values["started_at"] = func.coalesce(ingestion_jobs_table.c.started_at, func.now())
    elif values.get("status") in {"completed", "failed"}:
        values["completed_at"] = func.now()
    values["updated_at"] = func.now()
    result = await session.execute(
        update(ingestion_jobs_table)
        .where(ingestion_jobs_table.c.id == job_id)
        .values(**values)
        .returning(ingestion_jobs_table)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    await session.commit()
    return _as_response(row)
