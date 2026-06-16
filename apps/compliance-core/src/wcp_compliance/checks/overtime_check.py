from __future__ import annotations

from wcp_compliance.checks import _slugify
from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, EmployeeRecord

OVERTIME_THRESHOLD_HOURS = 40.0
OVERTIME_MULTIPLIER = 1.5


def check_overtime(employee: EmployeeRecord) -> ComplianceCheck:
    overtime_hours = employee.overtime_hours or 0.0
    total_hours = employee.hours_worked
    calculated_ot_hours = max(0, total_hours - OVERTIME_THRESHOLD_HOURS)

    if calculated_ot_hours > 0.5 and overtime_hours == 0:
        expected_ot_pay = calculated_ot_hours * employee.hourly_wage * OVERTIME_MULTIPLIER
        return ComplianceCheck(
            check_id=f"overtime_{_slugify(employee.name)}",
            check_type=CheckType.OVERTIME,
            employee_name=employee.name,
            status=CheckStatus.WARNING,
            expected_value=calculated_ot_hours,
            actual_value=0.0,
            variance=calculated_ot_hours,
            regulation_cite="29 C.F.R. \u00a7 5.32",
            message=(
                f"Warning: Worked {total_hours} hours but no overtime recorded. "
                f"Expected {calculated_ot_hours} OT hours at ${expected_ot_pay:.2f}"
            ),
        )

    if overtime_hours > 0:
        expected_ot_rate = round(employee.hourly_wage * OVERTIME_MULTIPLIER, 2)
        recorded_ot_rate = employee.overtime_rate or 0.0

        # Overtime hours recorded but no overtime rate reported: we cannot verify
        # the 1.5x premium was actually paid. Flag for review rather than FAIL,
        # since sparse payrolls legitimately omit a separate OT rate column.
        if recorded_ot_rate <= 0:
            return ComplianceCheck(
                check_id=f"overtime_{_slugify(employee.name)}",
                check_type=CheckType.OVERTIME,
                employee_name=employee.name,
                status=CheckStatus.WARNING,
                expected_value=expected_ot_rate,
                actual_value=None,
                variance=None,
                regulation_cite="29 C.F.R. \u00a7 5.32",
                message=(
                    f"Overtime recorded ({overtime_hours} hrs) but no overtime rate "
                    f"reported; cannot verify the 1.5x premium "
                    f"(expected >= ${expected_ot_rate:.2f}/hr)"
                ),
            )

        # Overtime rate reported: verify it meets 1.5x the base rate (with a small
        # tolerance for payroll rounding). Underpayment is a CWHSSA violation.
        tolerance = max(0.01, expected_ot_rate * 0.005)
        variance = round(recorded_ot_rate - expected_ot_rate, 2)
        paid_correctly = recorded_ot_rate >= expected_ot_rate - tolerance

        if paid_correctly:
            message = (
                f"Overtime paid correctly: ${recorded_ot_rate:.2f}/hr for "
                f"{overtime_hours} OT hrs (>= 1.5x base ${expected_ot_rate:.2f}/hr)"
            )
        else:
            message = (
                f"Overtime underpaid: ${recorded_ot_rate:.2f}/hr reported for "
                f"{overtime_hours} OT hrs but 1.5x premium requires "
                f"${expected_ot_rate:.2f}/hr (${abs(variance):.2f}/hr short)"
            )

        return ComplianceCheck(
            check_id=f"overtime_{_slugify(employee.name)}",
            check_type=CheckType.OVERTIME,
            employee_name=employee.name,
            status=CheckStatus.PASS if paid_correctly else CheckStatus.FAIL,
            expected_value=expected_ot_rate,
            actual_value=recorded_ot_rate,
            variance=variance,
            regulation_cite="29 C.F.R. \u00a7 5.32",
            message=message,
        )

    return ComplianceCheck(
        check_id=f"overtime_{_slugify(employee.name)}",
        check_type=CheckType.OVERTIME,
        employee_name=employee.name,
        status=CheckStatus.PASS,
        expected_value=0.0,
        actual_value=0.0,
        variance=0.0,
        regulation_cite="29 C.F.R. \u00a7 5.32",
        message=f"No overtime: {total_hours} hours worked (threshold: {OVERTIME_THRESHOLD_HOURS})",
    )
