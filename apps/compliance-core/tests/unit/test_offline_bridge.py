from wcp_compliance.models.schemas import ExtractedWCP
from wcp_compliance.offline_bridge import (
    extract_for_offline,
    validate_for_offline,
)
from wcp_compliance.rules.engine import run_rule_engine

CANONICAL_PAYROLL = """
Contractor: Offline Electric LLC
Project: Library retrofit
Project location: Washington, DC
Wage determination: DC20240001
Week ending: 2026-01-10
Certification date: 2026-01-15
Employee: Jane Doe
Trade: Electrician
Hours: 40
Overtime hours: 0
Hourly wage: 55
Fringe benefits: 1400
Gross earnings: 2200
Deductions: 150
Net wages: 2050
""".strip()


async def test_canonical_bridge_returns_the_authoritative_rule_engine_report():
    extracted = extract_for_offline(CANONICAL_PAYROLL)

    actual = await validate_for_offline(extracted)
    expected = await run_rule_engine(extracted)

    assert actual == expected
    assert actual.overall_status == "pass"


async def test_noncanonical_bridge_fails_closed_when_the_engine_would_otherwise_pass():
    extracted = extract_for_offline(
        "Payroll number: 1\nWeek ending: 2026-01-10\nCertification date: 2026-01-15"
    )
    engine_only = await run_rule_engine(extracted)

    actual = await validate_for_offline(extracted)

    assert engine_only.overall_status == "pass"
    assert actual.overall_status == "warnings"
    assert actual.violation_count == 0
    assert actual.warning_count == 1
    assert any(check.check_id == "offline_input_completeness" for check in actual.checks)


async def test_offline_metadata_round_trips_without_overwriting_canonical_ids():
    payload = extract_for_offline(CANONICAL_PAYROLL).model_dump(mode="json")
    payload.update(
        {
            "report_id": "report-canonical",
            "artifact_id": "artifact-canonical",
            "offline_metadata": {
                "noncanonical_input_issues": ["wage_determination"],
            },
        }
    )

    extracted = ExtractedWCP.model_validate(payload)
    round_tripped = ExtractedWCP.model_validate(extracted.model_dump(mode="json"))
    report = await validate_for_offline(round_tripped)

    assert round_tripped.report_id == "report-canonical"
    assert round_tripped.artifact_id == "artifact-canonical"
    assert round_tripped.offline_metadata is not None
    assert round_tripped.offline_metadata.noncanonical_input_issues == ["wage_determination"]
    assert report.report_id == "report-canonical"
    assert report.artifact_id == "artifact-canonical"
    assert report.overall_status == "warnings"


def test_present_but_invalid_required_values_are_marked_noncanonical():
    invalid = CANONICAL_PAYROLL.replace(
        "Wage determination: DC20240001", "Wage determination: ???"
    ).replace("Week ending: 2026-01-10", "Week ending: not-a-date")

    extracted = extract_for_offline(invalid)

    assert extracted.artifact_id is None
    assert extracted.offline_metadata is not None
    assert set(extracted.offline_metadata.noncanonical_input_issues) >= {
        "wage_determination",
        "week_ending",
    }


def test_unparseable_employee_numeric_value_is_marked_noncanonical():
    invalid = CANONICAL_PAYROLL.replace("Hours: 40", "Hours: not-a-number")

    extracted = extract_for_offline(invalid)

    assert extracted.offline_metadata is not None
    assert "employee_values" in extracted.offline_metadata.noncanonical_input_issues
