"""Monthly decision export to Parquet archive."""

import logging

from wcp_data.pipelines.utils import import_safe_flow
from wcp_data.storage.parquet_writer import export_decisions

logger = logging.getLogger(__name__)


@import_safe_flow(name="decision-export")
async def decision_export(records: list[dict] | None = None) -> dict:
    if records is None:
        logger.info("No records provided for export, checking database...")
        records = []
    elif len(records) == 0:
        return {"file": "", "records": 0, "error": "No records to export"}

    result = export_decisions(records)
    logger.info("Monthly export: %d decisions to %s", result["records"], result["file"])
    return result
