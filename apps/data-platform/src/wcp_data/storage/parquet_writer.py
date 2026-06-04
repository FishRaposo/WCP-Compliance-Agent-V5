"""Parquet archive export for decisions and payroll data."""

import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_EXPORT_DIR = Path("exports")


class ParquetWriter:
    def __init__(self, export_dir: str | Path = DEFAULT_EXPORT_DIR) -> None:
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def write_dataframe(
        self,
        name: str,
        records: list[dict[str, Any]],
        partition_date: str | None = None,
    ) -> dict[str, Any]:
        import pyarrow as pa
        import pyarrow.parquet as pq

        date_prefix = partition_date or datetime.utcnow().strftime("%Y-%m-%d")
        filename = f"{name}_{date_prefix}.parquet"
        filepath = self.export_dir / filename

        if not records:
            logger.warning("No records to export for %s", name)
            return {"file": str(filepath), "records": 0, "md5": ""}

        table = pa.Table.from_pylist(records)
        pq.write_table(table, filepath, compression="snappy")

        md5 = hashlib.md5(filepath.read_bytes()).hexdigest()
        logger.info("Exported %d records to %s (MD5: %s)", len(records), filepath, md5)

        return {
            "file": str(filepath),
            "records": len(records),
            "md5": md5,
            "columns": table.column_names,
        }

    def read_parquet(self, filepath: str) -> list[dict[str, Any]]:
        import pyarrow.parquet as pq
        from typing import cast

        table = pq.read_table(filepath)
        return cast(list[dict[str, Any]], table.to_pylist())

    def list_exports(self, prefix: str = "") -> list[dict[str, Any]]:
        files = sorted(
            self.export_dir.glob(f"{prefix}*.parquet"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        return [
            {
                "name": f.name,
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            }
            for f in files
        ]


_export_writer = ParquetWriter()


def export_decisions(decisions: list[dict[str, Any]]) -> dict[str, Any]:
    return _export_writer.write_dataframe("decisions", decisions)


def export_payrolls(payrolls: list[dict[str, Any]]) -> dict[str, Any]:
    return _export_writer.write_dataframe("payrolls", payrolls)


def list_exports() -> list[dict[str, Any]]:
    return _export_writer.list_exports()
