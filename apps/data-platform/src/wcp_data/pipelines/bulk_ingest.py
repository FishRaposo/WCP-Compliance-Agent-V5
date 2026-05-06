"""Bulk ingestion pipeline — CSV validation and import."""

import csv
import io
import logging

from wcp_data.pipelines.utils import import_safe_flow
from wcp_data.quality.validators import validate_contract, validate_payroll_record

logger = logging.getLogger(__name__)


@import_safe_flow(name="bulk-ingest")
async def bulk_ingest(
    csv_content: str,
    ingest_type: str = "payroll",
    contract_id: str = "",
) -> dict:
    if not csv_content.strip():
        return {"created": 0, "failed": 0, "errors": ["Empty CSV content"]}

    reader = csv.DictReader(io.StringIO(csv_content))
    validated = []
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            if ingest_type == "contract":
                result = validate_contract(row)
            else:
                result = validate_payroll_record(row)

            if result.is_valid:
                validated.append(row)
            else:
                errors.append({"row": row_num, "errors": result.errors})
        except Exception:
            errors.append({"row": row_num, "errors": ["Row parse error"]})

    logger.info("Bulk ingest: %d valid, %d failed out of %d rows",
                len(validated), len(errors), len(validated) + len(errors))

    return {
        "created": len(validated),
        "failed": len(errors),
        "errors": errors[:50],
    }
