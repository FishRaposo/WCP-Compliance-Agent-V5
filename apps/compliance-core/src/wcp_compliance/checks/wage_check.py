from __future__ import annotations

from wcp_compliance.checks import _slugify
from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, DBWDRateRecord, EmployeeRecord


def check_wage(employee: EmployeeRecord, dbwd_rate: DBWDRateRecord) -> ComplianceCheck:
    expected = dbwd_rate.rate
    actual = employee.hourly_wage
    variance = actual - expected

    passed = actual >= expected

    if passed:
        status = CheckStatus.PASS
        message = f"Wage meets DBWD minimum: ${actual:.2f}/hr >= ${expected:.2f}/hr"
    else:
        status = CheckStatus.FAIL
        message = (
            f"Wage violation: ${actual:.2f}/hr is "
            f"${abs(variance):.2f} below minimum ${expected:.2f}/hr"
        )

    return ComplianceCheck(
        check_id=f"wage_{_slugify(employee.name)}",
        check_type=CheckType.WAGE_RATE,
        employee_name=employee.name,
        status=status,
        expected_value=expected,
        actual_value=actual,
        variance=variance,
        regulation_cite="40 U.S.C. \u00a7 3142",
        message=message,
    )
