"""Unit tests for duckdb_queries — mock DuckDB store, verify schema returned."""
from unittest.mock import MagicMock, patch

import pytest

pytestmark = pytest.mark.unit

_MODULE = "wcp_data.analytics.duckdb_queries"


def _mock_store(rows: list[dict]):
    m = MagicMock()
    m.execute.return_value = rows
    return m


def test_decision_volume_returns_list():
    rows = [{"date": "2025-01-01", "count": 5, "avg_trust": 0.88}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import decision_volume
        result = decision_volume(days=7)
    assert result == rows


def test_decision_volume_empty_on_error():
    m = MagicMock()
    m.execute.side_effect = RuntimeError("boom")
    with patch(f"{_MODULE}.store", m):
        from wcp_data.analytics.duckdb_queries import decision_volume
        result = decision_volume()
    assert result == []


def test_compliance_breakdown_schema():
    rows = [{"verdict": "approved", "count": 10, "avg_violations": 0.0, "avg_warnings": 0.5}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import compliance_breakdown
        result = compliance_breakdown()
    assert len(result) == 1
    assert "verdict" in result[0]
    assert "count" in result[0]


def test_wage_analytics_schema():
    rows = [{"trust_band": "auto_approve", "count": 20, "avg_trust": 0.92, "total_violations": 0}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import wage_analytics
        result = wage_analytics()
    assert result[0]["trust_band"] == "auto_approve"


def test_llm_analytics_schema():
    rows = [{"verdict": "approved", "count": 8, "avg_cost": 0.002, "avg_latency_ms": 450.0, "avg_trust_score": 0.91}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import llm_analytics
        result = llm_analytics()
    assert "avg_cost" in result[0]
    assert "avg_latency_ms" in result[0]


def test_approval_rate_calculates_correctly():
    rows = [{"total": 100, "approved": 80}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import approval_rate
        result = approval_rate()
    assert result["rate"] == pytest.approx(0.80)
    assert result["total"] == 100


def test_approval_rate_zero_total():
    rows = [{"total": 0, "approved": 0}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import approval_rate
        result = approval_rate()
    assert result["rate"] == 0


def test_query_wage_trends_schema():
    rows = [{"month": "2025-01-01", "total_checked": 50, "total_violations": 5, "avg_trust": 0.85}]
    with patch(f"{_MODULE}.store", _mock_store(rows)):
        from wcp_data.analytics.duckdb_queries import query_wage_trends
        result = query_wage_trends(months=6)
    assert result[0]["month"] == "2025-01-01"
    assert "total_violations" in result[0]


def test_query_llm_cost_analytics_schema():
    cost_rows = [{"verdict": "approved", "decisions": 5, "total_cost": 0.01, "avg_cost": 0.002, "avg_latency_ms": 400.0}]
    cum_rows = [{"date": "2025-01-01", "cumulative_cost": 0.01, "decisions": 5}]
    m = MagicMock()
    m.execute.side_effect = [cost_rows, cum_rows]
    with patch(f"{_MODULE}.store", m):
        from wcp_data.analytics.duckdb_queries import query_llm_cost_analytics
        result = query_llm_cost_analytics()
    assert "by_verdict" in result
    assert "cumulative" in result
    assert result["by_verdict"][0]["verdict"] == "approved"


def test_query_llm_cost_analytics_on_error():
    m = MagicMock()
    m.execute.side_effect = RuntimeError("no connection")
    with patch(f"{_MODULE}.store", m):
        from wcp_data.analytics.duckdb_queries import query_llm_cost_analytics
        result = query_llm_cost_analytics()
    assert result == {"by_verdict": [], "cumulative": []}
