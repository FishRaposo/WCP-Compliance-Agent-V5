from __future__ import annotations

from wcp_compliance.checks import _slugify
from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, DBWDRateRecord, EmployeeRecord


def check_fringe(employee: EmployeeRecord, dbwd_rate: DBWDRateRecord) -> ComplianceCheck:
    expected_fringe_total = dbwd_rate.fringe * employee.hours_worked
    actual_fringe = employee.fringe_benefits or 0.0
    variance = actual_fringe - expected_fringe_total

    passed = actual_fringe >= expected_fringe_total

    if passed:
        status = CheckStatus.PASS
        message = (
            f"Fringe benefits meet DBWD: "
            f"${actual_fringe:.2f} >= ${expected_fringe_total:.2f} "
            f"(${dbwd_rate.fringe:.2f}/hr x {employee.hours_worked} hrs)"
        )
    else:
        status = CheckStatus.FAIL
        message = (
            f"Fringe violation: ${actual_fringe:.2f} is "
            f"${abs(variance):.2f} below required ${expected_fringe_total:.2f} "
            f"(${dbwd_rate.fringe:.2f}/hr x {employee.hours_worked} hrs)"
        )

    return ComplianceCheck(
        check_id=f"fringe_{_slugify(employee.name)}",
        check_type=CheckType.FRINGE_BENEFIT,
        employee_name=employee.name,
        status=status,
        expected_value=expected_fringe_total,
        actual_value=actual_fringe,
        variance=variance,
        regulation_cite="40 U.S.C. \u00a7 3141(2)(B)",
        message=message,
    )
