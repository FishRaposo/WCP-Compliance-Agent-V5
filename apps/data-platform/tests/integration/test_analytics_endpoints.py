"""Integration tests: Analytics API endpoints — DuckDB-first, PG fallback."""
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_analytics_overview_returns_dict(client):
    """GET /internal/analytics/overview returns a dict with total_decisions."""
    resp = await client.get("/internal/analytics/overview")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_decisions" in body
    assert isinstance(body["total_decisions"], int)


async def test_analytics_volume_returns_list(client):
    """GET /internal/analytics/volume returns a list."""
    resp = await client.get("/internal/analytics/volume")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_analytics_trust_band_distribution(client):
    """GET /internal/analytics/trust-band-distribution returns list."""
    resp = await client.get("/internal/analytics/trust-band-distribution")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_analytics_compliance_structure(client):
    """GET /internal/analytics/compliance returns dict with expected keys."""
    resp = await client.get("/internal/analytics/compliance")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_decisions" in body
    assert "approval_rate" in body
    assert "violation_types" in body


async def test_analytics_wages_structure(client):
    """GET /internal/analytics/wages returns dict with violation_trend."""
    resp = await client.get("/internal/analytics/wages")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_decisions" in body
    assert "violation_trend" in body
    assert isinstance(body["violation_trend"], list)


async def test_analytics_llm_structure(client):
    """GET /internal/analytics/llm returns dict with summary and cost_per_decision."""
    resp = await client.get("/internal/analytics/llm")
    assert resp.status_code == 200
    body = resp.json()
    assert "summary" in body
    assert "cost_per_decision" in body
    assert "decisions" in body["summary"]


async def test_analytics_approval_by_trade(client):
    """GET /internal/analytics/approval-by-trade returns overall + by_trust_band."""
    resp = await client.get("/internal/analytics/approval-by-trade")
    assert resp.status_code == 200
    body = resp.json()
    assert "overall" in body
    assert "by_trust_band" in body
    assert "rate" in body["overall"]
