from fastapi import APIRouter, Depends

from wcp_compliance.api._internal_auth import verify_internal_token
from wcp_compliance.api.dbwd import router as dbwd_router
from wcp_compliance.api.extract import router as extract_router
from wcp_compliance.api.health import router as health_router
from wcp_compliance.api.search import router as search_router
from wcp_compliance.api.validate import router as validate_router

router = APIRouter()

router.include_router(health_router, tags=["health"])
router.include_router(extract_router, tags=["extraction"])
router.include_router(validate_router, tags=["validation"])
router.include_router(
    dbwd_router,
    prefix="/internal/dbwd",
    tags=["dbwd"],
    dependencies=[Depends(verify_internal_token)],
)
router.include_router(
    search_router,
    prefix="/internal/search",
    tags=["search"],
    dependencies=[Depends(verify_internal_token)],
)
