from fastapi import APIRouter, Depends

from wcp_data.api._internal_auth import verify_internal_token
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
router.include_router(auth.router, prefix="/internal/auth", tags=["auth"], dependencies=[])
router.include_router(artifacts.router, prefix="/internal/artifacts", tags=["artifacts"], dependencies=[Depends(verify_internal_token)])
router.include_router(decisions.router, prefix="/internal/decisions", tags=["decisions"], dependencies=[Depends(verify_internal_token)])
router.include_router(audit_events.router, prefix="/internal/audit-events", tags=["audit-events"], dependencies=[Depends(verify_internal_token)])
router.include_router(contracts.router, prefix="/internal/contracts", tags=["contracts"], dependencies=[Depends(verify_internal_token)])
router.include_router(payrolls.router, prefix="/internal/payrolls", tags=["payrolls"], dependencies=[Depends(verify_internal_token)])
router.include_router(dbwd.router, prefix="/internal/dbwd", tags=["dbwd"], dependencies=[Depends(verify_internal_token)])
router.include_router(ingestion.router, prefix="/internal/ingestion", tags=["ingestion"], dependencies=[Depends(verify_internal_token)])
router.include_router(analytics.router, prefix="/internal/analytics", tags=["analytics"], dependencies=[Depends(verify_internal_token)])
