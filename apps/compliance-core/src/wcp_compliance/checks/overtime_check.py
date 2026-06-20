from __future__ import annotations

from wcp_compliance.checks import _slugify
from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, EmployeeRecord

OVERTIME_THRESHOLD_HOURS = 40.0
OVERTIME_MULTIPLIER = 1.5
# Tolerance (in hours) for rounding noise between recorded and calculated OT.
OVERTIME_TOLERANCE_HOURS = 0.5


def check_overtime(employee: EmployeeRecord) -> ComplianceCheck:
    overtime_hours = employee.overtime_hours or 0.0
    total_hours = employee.hours_worked
    calculated_ot_hours = max(0.0, total_hours - OVERTIME_THRESHOLD_HOURS)

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
        expected_ot_rate = employee.hourly_wage * OVERTIME_MULTIPLIER
        # Under-recorded OT: recorded OT hours fall short of what the total
        # hours imply (beyond a small rounding tolerance). This is a real
        # compliance gap, not an automatic pass.
        ot_shortfall = calculated_ot_hours - overtime_hours
        under_recorded = ot_shortfall > OVERTIME_TOLERANCE_HOURS

        if under_recorded:
            expected_ot_pay = calculated_ot_hours * employee.hourly_wage * OVERTIME_MULTIPLIER
            return ComplianceCheck(
                check_id=f"overtime_{_slugify(employee.name)}",
                check_type=CheckType.OVERTIME,
                employee_name=employee.name,
                status=CheckStatus.FAIL,
                expected_value=calculated_ot_hours,
                actual_value=overtime_hours,
                variance=ot_shortfall,
                regulation_cite="29 C.F.R. \u00a7 5.32",
                message=(
                    f"Under-recorded overtime: worked {total_hours} hours implying "
                    f"{calculated_ot_hours} OT hours, but only {overtime_hours} recorded "
                    f"(shortfall {ot_shortfall:.2f} hrs). "
                    f"Expected OT pay ${expected_ot_pay:.2f} at ${expected_ot_rate:.2f}/hr rate"
                ),
            )

        return ComplianceCheck(
            check_id=f"overtime_{_slugify(employee.name)}",
            check_type=CheckType.OVERTIME,
            employee_name=employee.name,
            status=CheckStatus.PASS,
            expected_value=calculated_ot_hours,
            actual_value=overtime_hours,
            variance=calculated_ot_hours - overtime_hours,
            regulation_cite="29 C.F.R. \u00a7 5.32",
            message=(
                f"Overtime recorded: {overtime_hours} hours at "
                f"${expected_ot_rate:.2f}/hr rate"
            ),
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
