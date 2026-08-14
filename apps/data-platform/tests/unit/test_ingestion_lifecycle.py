from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from wcp_data.api.ingestion import update_ingestion_job
from wcp_data.models.schemas import IngestionJobUpdate

pytestmark = pytest.mark.unit


def test_ingestion_job_update_accepts_canonical_partial_status() -> None:
    update = IngestionJobUpdate(status="partial")

    assert update.status == "partial"


@pytest.mark.asyncio
async def test_completed_ingestion_job_returns_updated_counters() -> None:
    session = AsyncMock()
    result = MagicMock()
    result.first.return_value = MagicMock(
        _mapping={
            "id": "job-1",
            "type": "payroll",
            "status": "completed",
            "source_type": "csv",
            "source_reference": "fixture.csv",
            "contract_id": None,
            "total_records": 2,
            "processed_records": 1,
            "failed_records": 1,
            "error_details": [{"row": 2, "error": "invalid"}],
            "started_at": datetime(2026, 8, 14, tzinfo=UTC),
            "completed_at": datetime(2026, 8, 14, tzinfo=UTC),
            "created_at": datetime(2026, 8, 14, tzinfo=UTC),
            "updated_at": datetime(2026, 8, 14, tzinfo=UTC),
        }
    )
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()

    response = await update_ingestion_job(
        "job-1",
        IngestionJobUpdate(
            status="completed",
            processed_records=1,
            failed_records=1,
            error_details=[{"row": 2, "error": "invalid"}],
        ),
        session,
    )

    assert response.job_id == "job-1"
    assert response.status == "completed"
    assert response.failed_records == 1
    session.commit.assert_awaited_once()
