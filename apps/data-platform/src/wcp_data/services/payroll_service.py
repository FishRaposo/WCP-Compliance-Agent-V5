from math import ceil
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    PayrollBulkImportRequest,
    PayrollBulkImportResult,
    PayrollFilters,
    PayrollRecordCreate,
    PayrollRecordResponse,
    PaginatedPayrolls,
)
from wcp_data.repositories.payroll_repo import (
    bulk_insert_payrolls as _bulk_insert,
)
from wcp_data.repositories.payroll_repo import (
    get_payroll as _get,
)
from wcp_data.repositories.payroll_repo import (
    list_payrolls as _list,
)


async def bulk_import_payrolls(
    session: AsyncSession, request: PayrollBulkImportRequest
) -> PayrollBulkImportResult:
    created_records = 0
    failed = 0
    errors: list[dict[str, Any]] = []

    for index, record in enumerate(request.records, start=1):
        try:
            _ = PayrollRecordCreate.model_validate(record.model_dump())
        except Exception as exc:
            failed += 1
            errors.append({
                "row": index,
                "error": str(exc),
                "employee": record.employee_name,
            })

    try:
        inserted = await _bulk_insert(
            session,
            request.contract_id,
            request.records,
            ingestion_job_id=None,
        )
        created_records = len(inserted)
    except Exception as exc:
        failed += len(request.records)
        errors.append({"error": str(exc)})

    return PayrollBulkImportResult(
        job_id="",
        created=created_records,
        failed=failed,
        errors=errors,
    )


async def list_payrolls(
    session: AsyncSession,
    filters: PayrollFilters,
    page: int = 1,
    per_page: int = 25,
) -> PaginatedPayrolls:
    items, total = await _list(session, filters, page, per_page)
    return PaginatedPayrolls(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=ceil(total / per_page) if total else 0,
    )


async def get_payroll(
    session: AsyncSession, payroll_id: str, contract_id: str
) -> PayrollRecordResponse | None:
    return await _get(session, payroll_id, contract_id)
