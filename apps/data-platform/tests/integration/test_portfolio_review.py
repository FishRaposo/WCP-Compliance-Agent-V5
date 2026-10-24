"""Portfolio WC-04: durable, idempotent decision/review lifecycle.

Proves the official-record contract on the portable SQLite profile (no Docker):
identical retries replay, conflicting payloads are rejected, audit events are
not duplicated, publish failures leave a recoverable record, and committed
state survives an engine restart (file-backed database).
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from wcp_data.models.schemas import DecisionCreate
from wcp_data.models.tables import metadata

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


def _payload(job_id: str, verdict: str = "rejected", review: bool = True) -> DecisionCreate:
    return DecisionCreate(
        job_id=job_id,
        verdict=verdict,
        trust_score=0.42,
        trust_band="require_human_review",
        requires_human_review=review,
        violation_count=2,
        warning_count=1,
        reasoning_summary="Underpaid prevailing wage on 2 employees.",
        citations=[{"regulation": "Davis-Bacon", "quote": "Wage rate under determination"}],
    )


async def test_identical_retry_replays_without_duplicating_audit(client: AsyncClient):
    resp1 = await client.post("/internal/decisions", json=_payload("job-replay").model_dump())
    assert resp1.status_code == 201
    resp2 = await client.post("/internal/decisions", json=_payload("job-replay").model_dump())
    assert resp2.status_code == 200
    assert resp2.json()["id"] == resp1.json()["id"]

    audit = await client.get("/internal/audit-events", params={"job_id": "job-replay"})
    events = audit.json()
    assert sum(1 for e in events if e["event_type"] == "decision_persisted") == 1
    assert sum(1 for e in events if e["event_type"] == "human_review_queued") == 1


async def test_conflicting_payload_same_job_id_rejected(client: AsyncClient):
    await client.post("/internal/decisions", json=_payload("job-conflict").model_dump())
    conflicting = _payload("job-conflict").model_dump()
    conflicting["verdict"] = "approved"
    conflicting["violation_count"] = 0
    resp = await client.post("/internal/decisions", json=conflicting)
    assert resp.status_code == 409

    listed = await client.get("/internal/decisions")
    matches = [d for d in listed.json() if d["job_id"] == "job-conflict"]
    assert len(matches) == 1
    assert matches[0]["verdict"] == "rejected"


async def test_duplicate_review_replays_conflicting_review_rejected(client: AsyncClient):
    created = (await client.post("/internal/decisions", json=_payload("job-review").model_dump())).json()
    body = {"verdict": "approved", "reviewer": "auditor@example.com", "note": "cleared"}

    r1 = await client.post(f"/internal/decisions/{created['id']}/override", json=body)
    assert r1.status_code == 200
    r2 = await client.post(f"/internal/decisions/{created['id']}/override", json=body)
    assert r2.status_code == 200

    audit = await client.get("/internal/audit-events", params={"job_id": "job-review"})
    assert sum(1 for e in audit.json() if e["event_type"] == "human_review_complete") == 1

    conflict = await client.post(
        f"/internal/decisions/{created['id']}/override",
        json={"verdict": "rejected", "reviewer": "other@example.com"},
    )
    assert conflict.status_code == 409


async def test_publish_failure_records_recoverable_audit(client: AsyncClient, monkeypatch):
    from wcp_data.services import decision_service

    async def boom(event):
        raise ConnectionError("redis unreachable")

    monkeypatch.setattr(decision_service.event_producer, "publish_decision", boom)
    resp = await client.post("/internal/decisions", json=_payload("job-pubfail").model_dump())
    assert resp.status_code == 201

    audit = await client.get("/internal/audit-events", params={"job_id": "job-pubfail"})
    failed = [e for e in audit.json() if e["event_type"] == "decision_event_publish_failed"]
    assert len(failed) == 1
    assert failed[0]["payload"]["recoverable"] is True


async def test_committed_decision_survives_engine_restart(tmp_path):
    """File-backed SQLite: dispose the engine, reopen, verify durable record."""
    db_url = f"sqlite+aiosqlite:///{tmp_path}/restart.db"
    engine1 = create_async_engine(db_url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine1.begin() as conn:
        await conn.run_sync(metadata.create_all)
    session1 = async_sessionmaker(engine1, expire_on_commit=False)()

    from wcp_data.services.decision_service import create_decision, get_decision

    created, status = await create_decision(session1, _payload("job-restart"))
    assert status == "created"
    await session1.close()
    await engine1.dispose()

    engine2 = create_async_engine(db_url, connect_args={"check_same_thread": False}, poolclass=StaticPool)
    session2 = async_sessionmaker(engine2, expire_on_commit=False)()
    fetched = await get_decision(session2, str(created.id))
    assert fetched is not None
    assert fetched.job_id == "job-restart"
    replayed, status2 = await create_decision(session2, _payload("job-restart"))
    assert status2 == "duplicate"
    assert replayed.id == fetched.id
    await session2.close()
    await engine2.dispose()
