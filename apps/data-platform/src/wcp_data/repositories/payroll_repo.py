import re
from typing import Any

from sqlalchemy import func, insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from wcp_data.models.schemas import (
    PayrollFilters,
    PayrollRecordCreate,
    PayrollRecordResponse,
)
from wcp_data.models.tables import payroll_records_table

_PARTITION_RE = re.compile(r"[^a-zA-Z0-9_]")


def _payroll_response(row: Any) -> PayrollRecordResponse:
    data = dict(row._mapping if hasattr(row, "_mapping") else row)
    data["id"] = str(data["id"])
    return PayrollRecordResponse.model_validate(data)


def _apply_filters(query: Any, filters: PayrollFilters) -> Any:
    if filters.contract_id:
        query = query.where(payroll_records_table.c.contract_id == filters.contract_id)
    if filters.trade_code:
        query = query.where(payroll_records_table.c.trade_code == filters.trade_code)
    if filters.employee_name:
        query = query.where(payroll_records_table.c.employee_name.ilike(f"%{filters.employee_name}%"))
    if filters.week_start:
        query = query.where(payroll_records_table.c.week_ending >= filters.week_start)
    if filters.week_end:
        query = query.where(payroll_records_table.c.week_ending <= filters.week_end)
    if filters.has_violation is True:
        query = query.where(payroll_records_table.c.decision_id.is_not(None))
    return query


async def ensure_partition(session: AsyncSession, contract_id: str) -> str:
    safe_id = _PARTITION_RE.sub("_", contract_id)
    partition_name = f"payroll_records_contract_{safe_id}"
    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", partition_name):
        raise ValueError(f"Invalid partition name: {partition_name}")
    if len(partition_name) > 128:
        raise ValueError(f"Partition name too long: {len(partition_name)} characters")
    try:
        await session.execute(
            text(
                f"CREATE TABLE IF NOT EXISTS {partition_name} "
                "PARTITION OF payroll_records FOR VALUES IN (:contract_id)"
            ),
            {"contract_id": contract_id},
        )
        await session.commit()
    except Exception:
        pass
    return partition_name


async def bulk_insert_payrolls(
    session: AsyncSession,
    contract_id: str,
    records: list[PayrollRecordCreate],
    ingestion_job_id: str | None = None,
) -> list[PayrollRecordResponse]:
    await ensure_partition(session, contract_id)
    created: list[PayrollRecordResponse] = []
    for record in records:
        values = record.model_dump()
        values["contract_id"] = contract_id
        values["ingestion_job_id"] = ingestion_job_id
        result = await session.execute(
            insert(payroll_records_table).values(**values).returning(payroll_records_table)
        )
        row = result.first()
        if row is not None:
            created.append(_payroll_response(row))
    await session.commit()
    return created


async def list_payrolls(
    session: AsyncSession,
    filters: PayrollFilters,
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[PayrollRecordResponse], int]:
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    base_query = select(payroll_records_table)
    filtered_query = _apply_filters(base_query, filters)
    total = int(
        (await session.execute(select(func.count()).select_from(filtered_query.subquery()))).scalar_one() or 0
    )

    query = (
        _apply_filters(select(payroll_records_table), filters)
        .order_by(payroll_records_table.c.week_ending.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await session.execute(query)
    items = [_payroll_response(row) for row in result.fetchall()]
    return items, total


async def get_payroll(
    session: AsyncSession, payroll_id: str, contract_id: str
) -> PayrollRecordResponse | None:
    result = await session.execute(
        select(payroll_records_table).where(
            payroll_records_table.c.id == payroll_id,
            payroll_records_table.c.contract_id == contract_id,
        )
    )
    row = result.first()
    return _payroll_response(row) if row is not None else None
