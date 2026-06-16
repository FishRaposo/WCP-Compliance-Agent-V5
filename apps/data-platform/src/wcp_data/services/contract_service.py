from math import ceil
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    BulkImportResult,
    ContractCreate,
    ContractFilters,
    ContractResponse,
    ContractUpdate,
    PaginatedContracts,
)
from wcp_data.repositories.contract_repo import (
    create_contract as _create,
)
from wcp_data.repositories.contract_repo import (
    get_contract as _get,
)
from wcp_data.repositories.contract_repo import (
    list_contracts as _list,
)
from wcp_data.repositories.contract_repo import (
    update_contract as _update,
)


async def create_contract(session: AsyncSession, data: ContractCreate) -> ContractResponse:
    return await _create(session, data)


async def get_contract(
    session: AsyncSession, contract_id: str, tenant_id: str | None = None
) -> ContractResponse | None:
    return await _get(session, contract_id, tenant_id=tenant_id)


async def update_contract(
    session: AsyncSession, contract_id: str, data: ContractUpdate
) -> ContractResponse | None:
    return await _update(session, contract_id, data)


async def list_contracts(
    session: AsyncSession,
    filters: ContractFilters,
    page: int = 1,
    per_page: int = 25,
    tenant_id: str | None = None,
) -> PaginatedContracts:
    items, total = await _list(session, filters, page, per_page, tenant_id=tenant_id)
    return PaginatedContracts(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=ceil(total / per_page) if total else 0,
    )


async def bulk_import_contracts(
    session: AsyncSession,
    records: list[dict[str, Any]],
    source_reference: str | None = None,
) -> BulkImportResult:
    from wcp_data.models.tables import contracts_table
    from sqlalchemy import select

    created = 0
    skipped = 0
    failed = 0
    errors: list[dict[str, Any]] = []

    existing_result = await session.execute(select(contracts_table.c.contract_number))
    existing_numbers = {row.contract_number for row in existing_result.fetchall() if row.contract_number}

    for index, record in enumerate(records, start=1):
        try:
            contract_number = record.get("contract_number", "").strip()
            if contract_number in existing_numbers:
                skipped += 1
                errors.append({
                    "row": index,
                    "error": f"Duplicate contract_number: {contract_number}",
                    "contract_number": contract_number,
                })
                continue
            if not contract_number or not record.get("project_name"):
                raise ValueError("contract_number and project_name are required")
            contract_data = ContractCreate.model_validate({
                **record,
                "source": "csv",
                "source_reference": source_reference,
            })
            await _create(session, contract_data)
            existing_numbers.add(contract_number)
            created += 1
        except Exception as exc:
            failed += 1
            errors.append({"row": index, "error": str(exc)})

    return BulkImportResult(
        job_id="",
        created=created,
        skipped=skipped,
        failed=failed,
        errors=errors,
    )
