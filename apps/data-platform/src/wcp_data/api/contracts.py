from typing import Any, Literal, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.db.session import get_session
from wcp_data.models.schemas import (
    BulkImportResult,
    ContractCreate,
    ContractFilters,
    ContractResponse,
    ContractStatus,
    ContractUpdate,
    PaginatedContracts,
)
from wcp_data.services.contract_service import (
    bulk_import_contracts,
    create_contract,
    get_contract,
    list_contracts,
    update_contract,
)

router = APIRouter()


@router.get("", response_model=PaginatedContracts)
async def list_contracts_endpoint(
    status: str | None = Query(default=None),
    contractor: str | None = Query(default=None),
    locality: str | None = Query(default=None),
    sort: str = Query(default="created_at"),
    order: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> PaginatedContracts:
    filters = ContractFilters(
        status=cast(ContractStatus | None, status),
        contractor=contractor,
        locality=locality,
        sort=sort,
        order=cast(Literal["asc", "desc"], order),
    )
    return await list_contracts(session, filters, page, per_page)


@router.post("", response_model=ContractResponse, status_code=201)
async def create_contract_endpoint(
    body: ContractCreate,
    session: AsyncSession = Depends(get_session),
) -> ContractResponse:
    try:
        return await create_contract(session, body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract_endpoint(
    contract_id: str,
    session: AsyncSession = Depends(get_session),
) -> ContractResponse:
    result = await get_contract(session, contract_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return result


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract_endpoint(
    contract_id: str,
    body: ContractUpdate,
    session: AsyncSession = Depends(get_session),
) -> ContractResponse:
    result = await update_contract(session, contract_id, body)
    if result is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return result


@router.post("/bulk")
async def bulk_import_contracts_endpoint(
    records: list[dict[str, Any]],
    source_reference: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> BulkImportResult:
    return await bulk_import_contracts(session, records, source_reference)
