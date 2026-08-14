from __future__ import annotations

import asyncio
import json
import math
import re
import sys
from typing import Any

from wcp_compliance.extraction import extract_from_text
from wcp_compliance.models.enums import CheckStatus, CheckType, OverallStatus
from wcp_compliance.models.schemas import (
    ComplianceCheck,
    DeterministicReport,
    ExtractedWCP,
    OfflineExtractionMetadata,
)
from wcp_compliance.rules.engine import run_rule_engine

_REQUIRED_RAW_FIELDS = {
    "contractor": (
        r"(?:^|\n)[ \t]*(?:contractor(?:[ _-]?name)?|employer(?:[ _-]?name)?|"
        r"company(?:[ _-]?name)?)[ \t]*:[ \t]*(?P<value>[^\r\n]*)"
    ),
    "project": r"(?:^|\n)[ \t]*(?:project|job[ _-]?name)[ \t]*:[ \t]*(?P<value>[^\r\n]*)",
    "project_location": (
        r"(?:^|\n)[ \t]*(?:project[ _-]?location|site[ _-]?location|"
        r"work[ _-]?location|work[ _-]?site|locality|location)[ \t]*:"
        r"[ \t]*(?P<value>[^\r\n]*)"
    ),
    "wage_determination": (
        r"(?:^|\n)[ \t]*(?:wage[ _-]?determination|wd[ _-]?number)[ \t]*:"
        r"[ \t]*(?P<value>[^\r\n]*)"
    ),
    "week_ending": (
        r"(?:^|\n)[ \t]*(?:week[ _-]?ending(?:[ _-]?date)?|"
        r"period[ _-]?ending(?:[ _-]?date)?)[ \t]*:[ \t]*(?P<value>[^\r\n]*)"
    ),
    "certification_date": (
        r"(?:^|\n)[ \t]*(?:certified|certification[ _-]?date|"
        r"date[ _-]?certified)[ \t]*:[ \t]*(?P<value>[^\r\n]*)"
    ),
}
_WAGE_DETERMINATION_PATTERN = re.compile(
    r"^(?:WD-?)?[A-Z]{2}-?\d{4}-?\d{3,4}(?:-[A-Z0-9]+)*$",
    re.IGNORECASE,
)


def _meaningful_text(value: str | None) -> bool:
    if value is None:
        return False
    stripped = value.strip()
    if not stripped or not any(character.isalnum() for character in stripped):
        return False
    normalized = stripped.casefold()
    return not normalized.startswith("unknown") and normalized not in {
        "n/a",
        "na",
        "none",
        "null",
        "unclassified",
    }


def _usable_employee_values(extracted: ExtractedWCP) -> bool:
    for employee in extracted.employees:
        values = (
            employee.hours_worked,
            employee.overtime_hours,
            employee.hourly_wage,
            employee.fringe_benefits,
            employee.gross_earnings,
            employee.deductions,
            employee.net_wages,
        )
        if not all(math.isfinite(value) for value in values):
            return False
        if employee.hours_worked <= 0 or employee.hourly_wage <= 0 or employee.gross_earnings <= 0:
            return False
        if min(
            employee.overtime_hours,
            employee.fringe_benefits,
            employee.deductions,
            employee.net_wages,
        ) < 0:
            return False
    return True


def _canonical_input_issues(text: str, extracted: ExtractedWCP) -> list[str]:
    issues: list[str] = []
    for field, pattern in _REQUIRED_RAW_FIELDS.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match is None or not _meaningful_text(match.group("value")):
            issues.append(field)
    if not extracted.employees:
        issues.append("employees")
    if not _meaningful_text(extracted.contractor.name):
        issues.append("contractor_identity")
    if not _meaningful_text(extracted.project.name):
        issues.append("project_identity")
    if not _meaningful_text(extracted.project.location):
        issues.append("project_location")
    if _WAGE_DETERMINATION_PATTERN.fullmatch(
        extracted.project.wage_determination_number.strip()
    ) is None:
        issues.append("wage_determination")
    if extracted.week_ending is None:
        issues.append("week_ending")
    if extracted.certification_date is None:
        issues.append("certification_date")
    if any(
        not _meaningful_text(employee.name)
        or not _meaningful_text(employee.trade_classification)
        for employee in extracted.employees
    ):
        issues.append("employee_identity_or_classification")
    if extracted.employees and not _usable_employee_values(extracted):
        issues.append("employee_values")
    return sorted(set(issues))


def extract_for_offline(text: str) -> ExtractedWCP:
    """Use the canonical extractor and retain only a private completeness marker."""
    extracted = extract_from_text(text)
    issues = _canonical_input_issues(text, extracted)
    if not issues:
        return extracted
    return extracted.model_copy(
        update={
            "offline_metadata": OfflineExtractionMetadata(
                noncanonical_input_issues=issues,
            )
        }
    )


def _marked_issues(extracted: ExtractedWCP) -> list[str]:
    if extracted.offline_metadata is None:
        return []
    return extracted.offline_metadata.noncanonical_input_issues


async def validate_for_offline(extracted: ExtractedWCP) -> DeterministicReport:
    """Run the real rule engine, adding only a fail-closed input warning when required."""
    report = await run_rule_engine(extracted)
    issues = _marked_issues(extracted)
    if not issues:
        return report

    guard = ComplianceCheck(
        check_id="offline_input_completeness",
        check_type=CheckType.DATA_INTEGRITY,
        employee_name="_payroll_",
        status=CheckStatus.WARNING,
        expected_value=None,
        actual_value=None,
        variance=None,
        regulation_cite="29 C.F.R. § 5.5(a)(3)(ii)",
        message=(
            "Offline input is noncanonical and cannot be auto-approved; "
            f"missing or unusable fields: {', '.join(issues)}"
        ),
    )
    return report.model_copy(
        update={
            "checks": [*report.checks, guard],
            "overall_status": (
                OverallStatus.FAIL if report.violation_count > 0 else OverallStatus.WARNINGS
            ),
            "warning_count": report.warning_count + 1,
        }
    )


async def _handle_request(request: dict[str, Any]) -> dict[str, Any]:
    operation = request.get("operation")
    payload = request.get("payload")
    if operation == "extract":
        if not isinstance(payload, dict) or not isinstance(payload.get("text"), str):
            raise ValueError("extract payload must contain string field 'text'")
        result: ExtractedWCP | DeterministicReport = extract_for_offline(payload["text"])
    elif operation == "validate":
        result = await validate_for_offline(ExtractedWCP.model_validate(payload))
    else:
        raise ValueError(f"Unsupported offline bridge operation: {operation!r}")
    return result.model_dump(mode="json")


def main() -> int:
    try:
        request = json.loads(sys.stdin.read())
        if not isinstance(request, dict):
            raise ValueError("Bridge request must be a JSON object")
        response = asyncio.run(_handle_request(request))
        sys.stdout.write(json.dumps(response, separators=(",", ":")))
        return 0
    except Exception as exc:
        sys.stderr.write(f"{type(exc).__name__}: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
