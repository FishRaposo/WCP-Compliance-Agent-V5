"""Data quality validators for ingestion pipelines.

Validates contracts, payroll records, and DBWD rates against
business rules before persistence.
"""

import logging
from datetime import date

logger = logging.getLogger(__name__)


class ValidationResult:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def to_dict(self) -> dict:
        return {
            "valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
        }


def validate_contract(data: dict) -> ValidationResult:
    result = ValidationResult()

    if not data.get("contract_number"):
        result.add_error("contract_number is required")
    if not data.get("project_name"):
        result.add_error("project_name is required")
    if not data.get("contractor_name"):
        result.add_error("contractor_name is required")
    if not data.get("locality"):
        result.add_error("locality is required")
    if not data.get("start_date"):
        result.add_error("start_date is required")

    try:
        start = data.get("start_date")
        if isinstance(start, str):
            date.fromisoformat(start)
    except (ValueError, TypeError):
        result.add_error("start_date must be a valid ISO date")

    try:
        end = data.get("end_date")
        if end and isinstance(end, str):
            date.fromisoformat(end)
    except (ValueError, TypeError):
        result.add_error("end_date must be a valid ISO date")

    return result


def validate_payroll_record(record: dict) -> ValidationResult:
    result = ValidationResult()

    if not record.get("employee_name"):
        result.add_error("employee_name is required")
    if not record.get("trade_code"):
        result.add_error("trade_code is required")

    total_hours = record.get("total_hours", 0)
    if isinstance(total_hours, (int, float)):
        if total_hours < 0:
            result.add_error("total_hours cannot be negative")
        if total_hours > 168:
            result.add_warning("total_hours exceeds 168 (max possible in a week)")

    hourly_rate = record.get("hourly_rate", 0)
    if isinstance(hourly_rate, (int, float)):
        if hourly_rate <= 0:
            result.add_error("hourly_rate must be positive")
        if hourly_rate < 7.25:
            result.add_warning("hourly_rate below federal minimum wage")

    try:
        week_ending = record.get("week_ending")
        if week_ending and isinstance(week_ending, str):
            date.fromisoformat(week_ending)
    except (ValueError, TypeError):
        result.add_error("week_ending must be a valid ISO date")

    return result


def validate_dbwd_rate(rate: dict) -> ValidationResult:
    result = ValidationResult()

    if not rate.get("trade"):
        result.add_error("trade is required")
    if not rate.get("locality"):
        result.add_error("locality is required")

    rate_value = rate.get("rate", 0)
    if isinstance(rate_value, (int, float)):
        if rate_value <= 0:
            result.add_error("rate must be positive")

    try:
        effective_date = rate.get("effective_date")
        if effective_date and isinstance(effective_date, str):
            date.fromisoformat(effective_date)
    except (ValueError, TypeError):
        result.add_error("effective_date must be a valid ISO date")

    return result
