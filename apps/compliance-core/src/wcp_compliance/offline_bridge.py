from __future__ import annotations

import asyncio
import json
import re
import sys
from typing import Any

from wcp_compliance.extraction import extract_from_text
from wcp_compliance.models.enums import CheckStatus, CheckType, OverallStatus
from wcp_compliance.models.schemas import ComplianceCheck, DeterministicReport, ExtractedWCP
from wcp_compliance.rules.engine import run_rule_engine

_NONCANONICAL_PREFIX = "offline-noncanonical:"
_REQUIRED_RAW_FIELDS = {
    "contractor": (
        r"(?:^|\n)\s*(?:contractor(?:.?name)?|employer(?:.?name)?|"
        r"company(?:.?name)?)\s*:"
    ),
    "project": r"(?:^|\n)\s*(?:project|job.?name)\s*:",
    "project_location": (
        r"(?:^|\n)\s*(?:project.?location|site.?location|work.?location|"
        r"work.?site|locality|location)\s*:"
    ),
    "wage_determination": r"(?:^|\n)\s*(?:wage.?determination|wd.?number)\s*:",
    "week_ending": r"(?:^|\n)\s*(?:week.?ending(?:.?date)?|period.?ending(?:.?date)?)\s*:",
    "certification_date": (
        r"(?:^|\n)\s*(?:certified|certification.?date|date.?certified)\s*:"
    ),
}


def _canonical_input_issues(text: str, extracted: ExtractedWCP) -> list[str]:
    issues = [
        field
        for field, pattern in _REQUIRED_RAW_FIELDS.items()
        if re.search(pattern, text, re.IGNORECASE) is None
    ]
    if not extracted.employees:
        issues.append("employees")
    if extracted.contractor.name.lower().startswith("unknown"):
        issues.append("contractor_identity")
    if extracted.project.name.lower().startswith("unknown"):
        issues.append("project_identity")
    if any(
        employee.name.lower().startswith("unknown")
        or employee.trade_classification.lower() in {"unknown", "unclassified"}
        for employee in extracted.employees
    ):
        issues.append("employee_identity_or_classification")
    return sorted(set(issues))


def extract_for_offline(text: str) -> ExtractedWCP:
    """Use the canonical extractor and retain only a private completeness marker."""
    extracted = extract_from_text(text)
    issues = _canonical_input_issues(text, extracted)
    if not issues:
        return extracted
    marker = _NONCANONICAL_PREFIX + json.dumps(issues, separators=(",", ":"))
    return extracted.model_copy(update={"artifact_id": marker})


def _marked_issues(extracted: ExtractedWCP) -> list[str]:
    marker = extracted.artifact_id or ""
    if not marker.startswith(_NONCANONICAL_PREFIX):
        return []
    raw = marker.removeprefix(_NONCANONICAL_PREFIX)
    parsed = json.loads(raw)
    if not isinstance(parsed, list) or not all(isinstance(item, str) for item in parsed):
        raise ValueError("Invalid offline noncanonical marker")
    return parsed


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
            f"missing or unknown fields: {', '.join(issues)}"
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
