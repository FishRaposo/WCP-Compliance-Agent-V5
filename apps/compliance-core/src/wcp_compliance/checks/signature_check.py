from __future__ import annotations

from datetime import date

from wcp_compliance.models.enums import CheckStatus, CheckType
from wcp_compliance.models.schemas import ComplianceCheck, ExtractedWCP


def check_signature(extracted: ExtractedWCP) -> ComplianceCheck:
    cert_date = extracted.certification_date
    is_future_dated = False

    if cert_date is not None:
        is_future_dated = cert_date > date.today()

    has_payroll_number = (
        extracted.payroll_number is not None and extracted.payroll_number > 0
    )

    if cert_date is None:
        status = CheckStatus.FAIL
        message = "Missing certification date"
    elif is_future_dated:
        status = CheckStatus.FAIL
        message = f"Certification date is in the future: {cert_date}"
    elif len(extracted.employees) == 0 and (
        not has_payroll_number or extracted.week_ending is None
    ):
        status = CheckStatus.FAIL
        message = (
            "No Work Performed payroll must specify a valid payroll "
            "number and week ending date"
        )
    else:
        status = CheckStatus.PASS
        date_str = str(cert_date)
        payroll_info = f" (Payroll #{extracted.payroll_number})" if has_payroll_number else ""
        message = f"Certification date present: {date_str}{payroll_info}"

    return ComplianceCheck(
        check_id="signature_certification",
        check_type=CheckType.SIGNATURE,
        employee_name="_all_",
        status=status,
        expected_value=None,
        actual_value=None,
        variance=None,
        regulation_cite="29 C.F.R. \u00a7 5.5(a)(3)(ii)(B)",
        message=message,
    )
