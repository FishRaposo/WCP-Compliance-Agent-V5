import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.analytics.duckdb_store import get_analytics_store
from wcp_data.db.session import get_session
from wcp_data.models.tables import contracts_table, decisions_table, payroll_records_table

logger = logging.getLogger(__name__)
router = APIRouter()


def _duck(query: str) -> list[dict[str, Any]]:
    """Try DuckDB first; return empty list on any failure (PG fallback used by caller)."""
    try:
        store = get_analytics_store()
        results = store.execute(query)
        return results if results is not None else []
    except Exception as exc:
        logger.debug("DuckDB query failed, falling back to PG: %s", exc)
        return []


@router.get("/overview")
async def analytics_overview(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck = _duck("""
        SELECT
            COUNT(*) AS total_decisions,
            AVG(trust_score) AS avg_trust_score
        FROM decisions
    """)
    if duck:
        row = duck[0]
        return {
            "total_decisions": int(row.get("total_decisions") or 0),
            "avg_trust_score": float(row.get("avg_trust_score") or 0),
            "source": "duckdb",
        }

    total_decisions = await session.execute(select(func.count()).select_from(decisions_table))
    total_contracts = await session.execute(select(func.count()).select_from(contracts_table))
    total_payrolls = await session.execute(select(func.count()).select_from(payroll_records_table))
    return {
        "total_decisions": total_decisions.scalar_one() or 0,
        "total_contracts": total_contracts.scalar_one() or 0,
        "total_payroll_records": total_payrolls.scalar_one() or 0,
        "avg_trust_score": 0,
        "source": "postgres",
    }


@router.get("/volume")
async def analytics_volume(
    days: int = Query(default=30, le=365),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    # Validate and sanitize days parameter to prevent SQL injection
    days = int(days)
    if not 1 <= days <= 365:
        raise ValueError("days must be between 1 and 365")
    
    duck = _duck(f"""
        SELECT
            date_trunc('day', created_at)::DATE::TEXT AS date,
            COUNT(*) AS count,
            AVG(trust_score) AS avg_trust
        FROM decisions
        WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date DESC
        LIMIT {days}
    """)
    if duck:
        return [{"date": r["date"], "count": int(r["count"]), "avg_trust": float(r["avg_trust"] or 0)} for r in duck]

    result = await session.execute(
        select(
            func.date_trunc("day", decisions_table.c.created_at).label("date"),
            func.count().label("count"),
            func.avg(decisions_table.c.trust_score).label("avg_trust"),
        )
        .group_by(func.date_trunc("day", decisions_table.c.created_at))
        .order_by(func.date_trunc("day", decisions_table.c.created_at).desc())
        .limit(days)
    )
    return [
        {"date": str(row.date), "count": row.count, "avg_trust": float(row.avg_trust) if row.avg_trust else None}
        for row in result.fetchall()
    ]


@router.get("/approval-by-trade")
async def analytics_approval_by_trade(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck = _duck("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN verdict = 'approved' THEN 1 ELSE 0 END) AS approved,
            trust_band
        FROM decisions
        GROUP BY trust_band
    """)
    if duck:
        grand_total = sum(int(r.get("total") or 0) for r in duck)
        grand_approved = sum(int(r.get("approved") or 0) for r in duck)
        return {
            "overall": {
                "total": grand_total,
                "approved": grand_approved,
                "rate": grand_approved / grand_total if grand_total > 0 else 0,
            },
            "by_trust_band": [
                {
                    "trust_band": r["trust_band"],
                    "total": int(r.get("total") or 0),
                    "approved": int(r.get("approved") or 0),
                    "rate": int(r.get("approved") or 0) / int(r.get("total") or 1),
                }
                for r in duck
            ],
        }

    total_result = await session.execute(select(func.count()).select_from(decisions_table))
    total = total_result.scalar_one() or 0
    approved_result = await session.execute(
        select(func.count()).where(decisions_table.c.verdict == "approved")
    )
    approved = approved_result.scalar_one() or 0
    return {
        "overall": {"total": total, "approved": approved, "rate": approved / total if total > 0 else 0},
        "by_trust_band": [],
    }


@router.get("/trust-band-distribution")
async def analytics_trust_band_distribution(
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    duck = _duck("""
        SELECT trust_band, COUNT(*) AS count
        FROM decisions
        GROUP BY trust_band
    """)
    if duck:
        total = sum(int(r.get("count") or 0) for r in duck) or 1
        return [{"trust_band": r["trust_band"], "count": int(r["count"]), "percentage": int(r["count"]) / total} for r in duck]

    result = await session.execute(
        select(decisions_table.c.trust_band, func.count().label("count")).group_by(decisions_table.c.trust_band)
    )
    rows = result.fetchall()
    total = sum(r[1] for r in rows) or 1
    return [{"trust_band": r[0], "count": r[1], "percentage": r[1] / total} for r in rows]


@router.get("/cost")
async def analytics_cost(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck = _duck("""
        SELECT
            COUNT(*) AS decisions,
            SUM(cost_usd) AS total_cost,
            AVG(cost_usd) AS cost_per_decision,
            AVG(latency_ms) AS avg_latency_ms
        FROM decisions
        WHERE cost_usd IS NOT NULL
    """)
    if duck and duck[0]:
        row = duck[0]
        return {
            "summary": {
                "decisions": int(row.get("decisions") or 0),
                "total_cost": float(row.get("total_cost") or 0),
                "cost_per_decision": float(row.get("cost_per_decision") or 0),
                "avg_latency_ms": float(row.get("avg_latency_ms") or 0),
            },
            "source": "duckdb",
        }

    result = await session.execute(select(func.count()).select_from(decisions_table))
    total = result.scalar_one() or 0
    return {"summary": {"decisions": total, "total_cost": 0, "cost_per_decision": 0, "avg_latency_ms": 0}, "source": "postgres"}


@router.get("/compliance")
async def analytics_compliance(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck_verdict = _duck("""
        SELECT
            verdict,
            COUNT(*) AS count,
            AVG(violation_count) AS avg_violations,
            AVG(warning_count) AS avg_warnings
        FROM decisions
        GROUP BY verdict
    """)
    total = sum(int(r.get("count") or 0) for r in duck_verdict) or 0
    approved = sum(int(r.get("count") or 0) for r in duck_verdict if r.get("verdict") == "approved")

    if duck_verdict:
        return {
            "total_decisions": total,
            "approval_rate": round(approved / total * 100, 1) if total > 0 else 0,
            "by_trade": [],
            "by_locality": [],
            "violation_types": [
                {"type": r["verdict"], "count": int(r["count"]),
                 "percentage": int(r["count"]) / total if total > 0 else 0}
                for r in duck_verdict
            ],
            "source": "duckdb",
        }

    result = await session.execute(
        select(
            decisions_table.c.verdict,
            func.count().label("count"),
            func.avg(decisions_table.c.violation_count).label("avg_violations"),
            func.avg(decisions_table.c.warning_count).label("avg_warnings"),
        ).group_by(decisions_table.c.verdict)
    )
    rows = result.fetchall()
    pg_total = sum(r[1] for r in rows) or 0
    pg_approved = sum(r[1] for r in rows if r[0] == "approved")
    return {
        "total_decisions": pg_total,
        "approval_rate": round(pg_approved / pg_total * 100, 1) if pg_total > 0 else 0,
        "by_trade": [],
        "by_locality": [],
        "violation_types": [
            {"type": r[0], "count": r[1], "percentage": r[1] / pg_total if pg_total > 0 else 0}
            for r in rows
        ],
        "source": "postgres",
    }


@router.get("/wages")
async def analytics_wages(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck_trend = _duck("""
        SELECT
            date_trunc('day', created_at)::DATE::TEXT AS date,
            COUNT(*) AS total_checked,
            SUM(violation_count) AS violations
        FROM decisions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date DESC
        LIMIT 30
    """)
    duck_bands = _duck("""
        SELECT trust_band, COUNT(*) AS count, AVG(trust_score) AS avg_trust
        FROM decisions
        GROUP BY trust_band
    """)

    total = sum(int(r.get("count") or 0) for r in duck_bands)
    violations = sum(int(r.get("violations") or 0) for r in duck_trend)
    checked = sum(int(r.get("total_checked") or 0) for r in duck_trend)

    return {
        "total_decisions": total,
        "violation_rate": round(violations / checked * 100, 1) if checked > 0 else 0,
        "fringe_compliance_rate": 0,
        "violation_trend": [
            {"date": r["date"], "total_checked": int(r["total_checked"]), "violations": int(r["violations"] or 0)}
            for r in duck_trend
        ],
        "actual_vs_required": [],
        "source": "duckdb" if duck_bands else "postgres",
    }


@router.get("/llm")
async def analytics_llm(
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    duck_summary = _duck("""
        SELECT
            COUNT(*) AS decisions,
            SUM(cost_usd) AS total_cost,
            AVG(cost_usd) AS cost_per_decision,
            AVG(latency_ms) AS avg_latency_ms
        FROM decisions
        WHERE cost_usd IS NOT NULL
    """)
    duck_daily = _duck("""
        SELECT
            date_trunc('day', created_at)::DATE::TEXT AS date,
            COUNT(*) AS decisions,
            AVG(cost_usd) AS cost_usd
        FROM decisions
        WHERE cost_usd IS NOT NULL
          AND created_at >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date DESC
        LIMIT 14
    """)

    summary_row = duck_summary[0] if duck_summary else {}
    return {
        "summary": {
            "decisions": int(summary_row.get("decisions") or 0),
            "total_cost": float(summary_row.get("total_cost") or 0),
            "cost_per_decision": float(summary_row.get("cost_per_decision") or 0),
            "avg_latency_ms": float(summary_row.get("avg_latency_ms") or 0),
        },
        "cost_per_decision": [
            {"date": r["date"], "decisions": int(r["decisions"]), "cost_usd": float(r["cost_usd"] or 0)}
            for r in duck_daily
        ],
        "latency_by_model": [],
        "model_distribution": [],
        "source": "duckdb" if duck_summary else "postgres",
    }
