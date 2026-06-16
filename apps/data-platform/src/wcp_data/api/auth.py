import logging

import bcrypt
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.tables import users_table

logger = logging.getLogger(__name__)
router = APIRouter()


class AuthValidateRequest(BaseModel):
    email: EmailStr
    password: str


class AuthValidateResponse(BaseModel):
    valid: bool
    user_id: str | None = None
    role: str | None = None
    tenant_id: str | None = None


@router.post("/validate", response_model=AuthValidateResponse)
async def validate_credentials(
    body: AuthValidateRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthValidateResponse:
    result = await session.execute(
        select(users_table).where(users_table.c.email == body.email)
    )
    row = result.mappings().first()

    if row is None:
        return AuthValidateResponse(valid=False)

    # Use bcrypt to verify the password against the stored hash
    stored_hash = row["password_hash"]
    if not bcrypt.checkpw(body.password.encode("utf-8"), stored_hash.encode("utf-8")):
        return AuthValidateResponse(valid=False)

    return AuthValidateResponse(
        valid=True,
        user_id=str(row["id"]),
        role=row["role"],
        tenant_id=row.get("tenant_id") or "default",
    )
