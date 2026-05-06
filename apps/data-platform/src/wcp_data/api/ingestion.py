from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import IngestionJobResponse
from wcp_data.models.tables import ingestion_jobs_table

router = APIRouter()


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
    data = dict(row._mapping)
    data["job_id"] = data.pop("id")
    return IngestionJobResponse.model_validate(data)


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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    data = dict(row._mapping)
    data["job_id"] = data.pop("id")
    return IngestionJobResponse.model_validate(data)
