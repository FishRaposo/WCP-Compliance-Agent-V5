from fastapi import APIRouter

from wcp_data.api import (
    analytics,
    artifacts,
    audit_events,
    auth,
    contracts,
    dbwd,
    decisions,
    health,
    ingestion,
    payrolls,
)

router = APIRouter()

router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/internal/auth", tags=["auth"])
router.include_router(artifacts.router, prefix="/internal/artifacts", tags=["artifacts"])
router.include_router(decisions.router, prefix="/internal/decisions", tags=["decisions"])
router.include_router(audit_events.router, prefix="/internal/audit-events", tags=["audit-events"])
router.include_router(contracts.router, prefix="/internal/contracts", tags=["contracts"])
router.include_router(payrolls.router, prefix="/internal/payrolls", tags=["payrolls"])
router.include_router(dbwd.router, prefix="/internal/dbwd", tags=["dbwd"])
router.include_router(ingestion.router, prefix="/internal/ingestion", tags=["ingestion"])
router.include_router(analytics.router, prefix="/internal/analytics", tags=["analytics"])
