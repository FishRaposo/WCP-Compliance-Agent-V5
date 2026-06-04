"""Internal service authentication for /internal/* routes."""
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from wcp_compliance.config import settings

logger = logging.getLogger(__name__)


async def verify_internal_token(request: Request) -> None:
    """
    Verify the X-Internal-Token header matches the configured INTERNAL_SERVICE_TOKEN.

    If INTERNAL_SERVICE_TOKEN is not configured (dev mode), skip the check with a warning.
    """
    # Skip validation in dev mode when token is not configured
    if not settings.internal_service_token:
        logger.warning(
            "INTERNAL_SERVICE_TOKEN not configured - skipping internal route authentication. "
            "This is only acceptable in development."
        )
        return

    token = request.headers.get("X-Internal-Token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Internal-Token header",
        )

    if token != settings.internal_service_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal service token",
        )


# Type alias for dependency injection
InternalAuthDep = Annotated[None, Depends(verify_internal_token)]
