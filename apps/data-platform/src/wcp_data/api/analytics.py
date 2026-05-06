import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.tables import contracts_table, decisions_table, payroll_records_table

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/overview")
async def analytics_overview(
    session: AsyncSession = Depends(get_session),
) -> dict[str, int]:
    total_decisions = await session.execute(select(func.count()).select_from(decisions_table))
    total_contracts = await session.execute(select(func.count()).select_from(contracts_table))
    total_payrolls = await session.execute(select(func.count()).select_from(payroll_records_table))

    return {
        "total_decisions": total_decisions.scalar_one() or 0,
        "total_contracts": total_contracts.scalar_one() or 0,
        "total_payroll_records": total_payrolls.scalar_one() or 0,
    }


@router.get("/volume")
async def analytics_volume(
    days: int = Query(default=30, le=365),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
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
) -> dict:
    total_result = await session.execute(select(func.count()).select_from(decisions_table))
    total = total_result.scalar_one() or 0
    approved_result = await session.execute(
        select(func.count()).where(decisions_table.c.verdict == "approved")
    )
    approved = approved_result.scalar_one() or 0
    return {
        "overall": {
            "total": total,
            "approved": approved,
            "rate": approved / total if total > 0 else 0,
        },
        "by_trust_band": [],
    }


@router.get("/trust-band-distribution")
async def analytics_trust_band_distribution(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await session.execute(
        select(
            decisions_table.c.trust_band,
            func.count().label("count"),
        ).group_by(decisions_table.c.trust_band)
    )
    rows = result.fetchall()
    total = sum(r.count for r in rows) or 1
    return [
        {"trust_band": r.trust_band, "count": r.count, "percentage": r.count / total}
        for r in rows
    ]


@router.get("/cost")
async def analytics_cost(
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(func.count()).select_from(decisions_table))
    total = result.scalar_one() or 0
    monthly_result = await session.execute(
        select(func.count())
        .where(decisions_table.c.created_at >= func.date_trunc("month", func.now()))
    )
    monthly = monthly_result.scalar_one() or 0
    return {
        "total_decisions": total,
        "decisions_this_month": monthly,
        "note": "Cost tracking data available in agent logs",
    }


@router.get("/compliance")
async def analytics_compliance(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await session.execute(
        select(
            decisions_table.c.verdict,
            func.count().label("count"),
            func.avg(decisions_table.c.violation_count).label("avg_violations"),
            func.avg(decisions_table.c.warning_count).label("avg_warnings"),
        ).group_by(decisions_table.c.verdict)
    )
    return [
        {"verdict": r.verdict, "count": r.count,
         "avg_violations": float(r.avg_violations or 0),
         "avg_warnings": float(r.avg_warnings or 0)}
        for r in result.fetchall()
    ]


@router.get("/wages")
async def analytics_wages(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await session.execute(
        select(
            decisions_table.c.trust_band,
            func.count().label("count"),
            func.avg(decisions_table.c.trust_score).label("avg_trust"),
            func.sum(decisions_table.c.violation_count).label("total_violations"),
        ).group_by(decisions_table.c.trust_band)
    )
    return [
        {"trust_band": r.trust_band, "count": r.count,
         "avg_trust": float(r.avg_trust or 0),
         "total_violations": int(r.total_violations or 0)}
        for r in result.fetchall()
    ]


@router.get("/llm")
async def analytics_llm(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    result = await session.execute(
        select(
            decisions_table.c.verdict,
            func.count().label("count"),
            func.avg(decisions_table.c.cost_usd).label("avg_cost"),
            func.avg(decisions_table.c.latency_ms).label("avg_latency_ms"),
            func.avg(decisions_table.c.trust_score).label("avg_trust_score"),
        )
        .where(decisions_table.c.cost_usd.is_not(None))
        .group_by(decisions_table.c.verdict)
    )
    return [
        {"verdict": r.verdict, "count": r.count,
         "avg_cost": float(r.avg_cost or 0),
         "avg_latency_ms": float(r.avg_latency_ms or 0),
         "avg_trust_score": float(r.avg_trust_score or 0)}
        for r in result.fetchall()
    ]
