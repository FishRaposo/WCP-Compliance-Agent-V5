"""Quality checkpoint runner — validates data and persists validation artifacts."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from wcp_data.quality.validators import (
    validate_contract,
    validate_payroll_record,
)

logger = logging.getLogger(__name__)

DEFAULT_CHECKPOINT_DIR = Path("data/quality_checkpoints")


def run_checkpoint(
    name: str,
    records: list[dict[str, Any]],
    record_type: str = "payroll",
) -> dict[str, Any]:
    checkpoint_dir = Path(DEFAULT_CHECKPOINT_DIR)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    validator = validate_payroll_record if record_type == "payroll" else validate_contract
    results: list[dict] = []
    passed = 0
    failed = 0

    for i, record in enumerate(records):
        result = validator(record)
        entry = {
            "index": i,
            "valid": result.is_valid,
            "errors": result.errors,
            "warnings": result.warnings,
        }
        results.append(entry)
        if result.is_valid:
            passed += 1
        else:
            failed += 1

    checkpoint = {
        "name": name,
        "record_type": record_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(records),
        "passed": passed,
        "failed": failed,
        "results": results,
    }

    checkpoint_path = checkpoint_dir / f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    checkpoint_path.write_text(json.dumps(checkpoint, indent=2, default=str))
    logger.info("Checkpoint saved: %s (%d/%d passed)", checkpoint_path, passed, passed + failed)

    return checkpoint
