from __future__ import annotations

from wcp_compliance.checks import _slugify
from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, EmployeeRecord

TOLERANCE = 0.01


def check_totals(employee: EmployeeRecord) -> ComplianceCheck:
    ot_hours = employee.overtime_hours or 0.0
    wage = employee.hourly_wage

    # Theoretical unrounded calculation
    expected_gross_unrounded = (employee.hours_worked * wage) + (
        ot_hours * wage * 0.5
    )

    # Rounded overtime rate calculation (matching standard payroll accounting)
    reg_hours = max(0.0, employee.hours_worked - ot_hours)
    rounded_ot_rate = round(wage * 1.5, 2)
    expected_gross_rounded = (reg_hours * wage) + (ot_hours * rounded_ot_rate)

    actual_gross = employee.gross_earnings
    
    # Check if either expected gross is within tolerance
    variance_unrounded = actual_gross - expected_gross_unrounded
    variance_rounded = actual_gross - expected_gross_rounded
    
    if abs(variance_rounded) < abs(variance_unrounded):
        expected_gross = expected_gross_rounded
        gross_variance = variance_rounded
    else:
        expected_gross = expected_gross_unrounded
        gross_variance = variance_unrounded
        
    gross_within_tolerance = abs(gross_variance) <= TOLERANCE

    expected_net = actual_gross - (employee.deductions or 0.0)
    actual_net = employee.net_wages
    net_variance = actual_net - expected_net
    net_within_tolerance = abs(net_variance) <= TOLERANCE

    if gross_within_tolerance and net_within_tolerance:
        status = CheckStatus.PASS
        message = (
            f"Arithmetic correct: Gross ${actual_gross:.2f} "
            f"(expected ${expected_gross:.2f}), Net ${actual_net:.2f}"
        )
    else:
        status = CheckStatus.FAIL
        issues = []
        if not gross_within_tolerance:
            issues.append(f"Gross variance ${gross_variance:.2f}")
        if not net_within_tolerance:
            issues.append(f"Net variance ${net_variance:.2f}")
        message = f"Arithmetic error: {'; '.join(issues)}"

    return ComplianceCheck(
        check_id=f"total_{_slugify(employee.name)}",
        check_type=CheckType.TOTAL_ARITHMETIC,
        employee_name=employee.name,
        status=status,
        expected_value=expected_gross,
        actual_value=actual_gross,
        variance=gross_variance,
        regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(i)",
        message=message,
    )
