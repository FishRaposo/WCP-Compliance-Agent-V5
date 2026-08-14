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
