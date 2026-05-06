from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import (
    PaginatedPayrolls,
    PayrollBulkImportRequest,
    PayrollBulkImportResult,
    PayrollFilters,
    PayrollRecordResponse,
)
from wcp_data.services.payroll_service import bulk_import_payrolls, get_payroll, list_payrolls

router = APIRouter()


@router.get("", response_model=PaginatedPayrolls)
async def list_payrolls_endpoint(
    contract_id: str | None = Query(default=None),
    trade_code: str | None = Query(default=None),
    employee_name: str | None = Query(default=None),
    week_start: str | None = Query(default=None),
    week_end: str | None = Query(default=None),
    has_violation: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> PaginatedPayrolls:
    from datetime import date as date_type

    filters = PayrollFilters(
        contract_id=contract_id,
        trade_code=trade_code,
        employee_name=employee_name,
        week_start=date_type.fromisoformat(week_start) if week_start else None,
        week_end=date_type.fromisoformat(week_end) if week_end else None,
        has_violation=has_violation,
    )
    return await list_payrolls(session, filters, page, per_page)


@router.post("/bulk", response_model=PayrollBulkImportResult, status_code=201)
async def bulk_import_payrolls_endpoint(
    body: PayrollBulkImportRequest,
    session: AsyncSession = Depends(get_session),
) -> PayrollBulkImportResult:
    return await bulk_import_payrolls(session, body)


@router.get("/{payroll_id}", response_model=PayrollRecordResponse)
async def get_payroll_endpoint(
    payroll_id: str,
    contract_id: str = Query(...),
    session: AsyncSession = Depends(get_session),
) -> PayrollRecordResponse:
    result = await get_payroll(session, payroll_id, contract_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return result
