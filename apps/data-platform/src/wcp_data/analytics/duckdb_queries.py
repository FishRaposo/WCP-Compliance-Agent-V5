"""DuckDB analytics queries for decision volume, compliance, wages, and LLM analytics."""

import logging

from wcp_data.analytics.duckdb_store import _analytics_store as store

logger = logging.getLogger(__name__)


def decision_volume(days: int = 30) -> list[dict]:
    """Daily decision count with average trust score."""
    try:
        return store.execute(f"""
            SELECT
                date_trunc('day', created_at)::DATE AS date,
                COUNT(*) AS count,
                AVG(trust_score) AS avg_trust
            FROM decisions
            WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
            GROUP BY date_trunc('day', created_at)
            ORDER BY date DESC
            LIMIT {days}
        """)
    except Exception:
        return []


def compliance_breakdown() -> list[dict]:
    """Violation breakdown by check type."""
    try:
        return store.execute("""
            SELECT
                verdict,
                COUNT(*) AS count,
                AVG(violation_count) AS avg_violations,
                AVG(warning_count) AS avg_warnings
            FROM decisions
            GROUP BY verdict
        """)
    except Exception:
        return []


def wage_analytics() -> list[dict]:
    """Wage compliance statistics by trust band."""
    try:
        return store.execute("""
            SELECT
                trust_band,
                COUNT(*) AS count,
                AVG(trust_score) AS avg_trust,
                SUM(violation_count) AS total_violations
            FROM decisions
            GROUP BY trust_band
            ORDER BY avg_trust DESC
        """)
    except Exception:
        return []


def llm_analytics() -> list[dict]:
    """LLM performance metrics: cost, latency, confidence by model."""
    try:
        return store.execute("""
            SELECT
                verdict,
                COUNT(*) AS count,
                AVG(cost_usd) AS avg_cost,
                AVG(latency_ms) AS avg_latency_ms,
                AVG(trust_score) AS avg_trust_score
            FROM decisions
            WHERE cost_usd IS NOT NULL
            GROUP BY verdict
        """)
    except Exception:
        return []


def query_wage_trends(months: int = 6) -> list[dict]:
    """6-month wage violation trend — total checked vs violations per month."""
    try:
        return store.execute(f"""
            SELECT
                date_trunc('month', created_at)::DATE::TEXT AS month,
                COUNT(*) AS total_checked,
                SUM(violation_count) AS total_violations,
                AVG(trust_score) AS avg_trust
            FROM decisions
            WHERE created_at >= CURRENT_DATE - INTERVAL '{months} months'
            GROUP BY date_trunc('month', created_at)
            ORDER BY month DESC
            LIMIT {months}
        """)
    except Exception:
        return []


def query_llm_cost_analytics() -> dict:
    """Per-model cost breakdown and cumulative spend."""
    try:
        by_verdict = store.execute("""
            SELECT
                verdict,
                COUNT(*) AS decisions,
                SUM(cost_usd) AS total_cost,
                AVG(cost_usd) AS avg_cost,
                AVG(latency_ms) AS avg_latency_ms
            FROM decisions
            WHERE cost_usd IS NOT NULL
            GROUP BY verdict
            ORDER BY total_cost DESC
        """)
        cumulative = store.execute("""
            SELECT
                date_trunc('day', created_at)::DATE::TEXT AS date,
                SUM(SUM(cost_usd)) OVER (ORDER BY date_trunc('day', created_at)) AS cumulative_cost,
                COUNT(*) AS decisions
            FROM decisions
            WHERE cost_usd IS NOT NULL
            GROUP BY date_trunc('day', created_at)
            ORDER BY date DESC
            LIMIT 30
        """)
        return {"by_verdict": by_verdict, "cumulative": cumulative}
    except Exception:
        return {"by_verdict": [], "cumulative": []}


def approval_rate() -> dict:
    """Overall approval rate."""
    try:
        result = store.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN verdict = 'approved' THEN 1 ELSE 0 END) AS approved
            FROM decisions
        """)
        if result:
            row = result[0]
            total = row.get("total", 0)
            approved = row.get("approved", 0)
            return {
                "total": total,
                "approved": approved,
                "rate": approved / total if total > 0 else 0,
            }
    except Exception:
        pass
    return {"total": 0, "approved": 0, "rate": 0}
