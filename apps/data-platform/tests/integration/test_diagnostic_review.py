import asyncio
import pytest
from wcp_data.models.schemas import DecisionCreate, DecisionOverrideRequest
from wcp_data.services import decision_service
from wcp_data.models.tables import metadata
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


def payload(job, band="require_human_review", review=True):
    return DecisionCreate(
        job_id=job,
        verdict="needs_review",
        trust_score=0.9,
        trust_band=band,
        requires_human_review=review,
    )


async def test_pending_review_filter_excludes_unrelated_and_completed(client):
    a = (await client.post("/internal/decisions", json=payload("pending").model_dump())).json()
    await client.post(
        "/internal/decisions", json=payload("approved", "auto_approve", False).model_dump()
    )
    completed = (
        await client.post("/internal/decisions", json=payload("completed").model_dump())
    ).json()
    await client.post(
        "/internal/decisions/" + completed["id"] + "/override",
        json={"verdict": "approved", "reviewer": "audit-reviewer"},
    )
    r = await client.get(
        "/internal/decisions",
        params={"trust_band": "require_human_review", "requires_human_review": "true"},
    )
    assert r.status_code == 200
    assert [d["id"] for d in r.json()] == [a["id"]]


async def test_concurrent_conflicting_reviews_commit_once(tmp_path, monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///" + str(tmp_path / "review.db"))
    async with engine.begin() as c:
        await c.run_sync(metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        decision, _ = await decision_service.create_decision(s, payload("concurrent"))
    orig = decision_service._get_decision
    gate = asyncio.Event()
    reads = 0

    async def synchronized_read(session, id):
        nonlocal reads
        result = await orig(session, id)
        reads += 1
        if reads <= 2:
            if reads == 2:
                gate.set()
            await asyncio.wait_for(gate.wait(), 5)
        return result

    monkeypatch.setattr(decision_service, "_get_decision", synchronized_read)

    async def review(verdict, reviewer):
        async with factory() as s:
            try:
                _, status = await decision_service.override_decision(
                    s, decision.id, DecisionOverrideRequest(verdict=verdict, reviewer=reviewer)
                )
                return status
            except decision_service.DecisionConflictError:
                return "conflict"

    try:
        results = await asyncio.gather(
            review("approved", "reviewer-a"), review("rejected", "reviewer-b")
        )
        assert sorted(results) == ["conflict", "created"]
    finally:
        await engine.dispose()


async def test_actual_unavailable_producer_records_recoverable_failure(client, monkeypatch):
    from wcp_data.events.producer import EventProducer

    producer = EventProducer()

    async def unavailable():
        return None

    monkeypatch.setattr(producer, "_get_redis", unavailable)
    monkeypatch.setattr(decision_service, "event_producer", producer)
    r = await client.post("/internal/decisions", json=payload("actual-unavailable").model_dump())
    assert r.status_code == 201
    events = (
        await client.get("/internal/audit-events", params={"job_id": "actual-unavailable"})
    ).json()
    assert any(e["event_type"] == "decision_event_publish_failed" for e in events)
