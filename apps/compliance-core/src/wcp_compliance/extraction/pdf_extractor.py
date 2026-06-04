from __future__ import annotations

import io
import logging
import re
import uuid
from datetime import date, datetime
from typing import Any

import pdfplumber

from wcp_compliance.models.schemas import (
    ContractorInfo,
    EmployeeRecord,
    ExtractedWCP,
    ProjectInfo,
)
from wcp_compliance.normalization.trade_aliases import resolve_classification

logger = logging.getLogger(__name__)


def _extract_pattern(text: str, pattern: str, group: int = 1, default: Any = None) -> Any:
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return match.group(group)
        except IndexError:
            return default
    return default


def _extract_float(text: str, pattern: str, group: int = 1) -> float | None:
    result = _extract_pattern(text, pattern, group)
    if result:
        try:
            cleaned = result.replace("$", "").replace(",", "").strip()
            return float(cleaned)
        except ValueError:
            return None
    return None


def _extract_int(text: str, pattern: str, group: int = 1) -> int | None:
    result = _extract_pattern(text, pattern, group)
    if result:
        try:
            return int(result.replace(",", "").strip())
        except ValueError:
            return None
    return None


def _extract_date(text: str, pattern: str, group: int = 1) -> date | None:
    result = _extract_pattern(text, pattern, group)
    if result:
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y"):
            try:
                return datetime.strptime(result.strip(), fmt).date()
            except ValueError:
                continue
    return None


def extract_from_text(text: str) -> ExtractedWCP:
    job_id = str(uuid.uuid4())

    contractor_name = _extract_pattern(
        text,
        r"(?:contractor|employer|company)[:\s]+([^\n,]+)",
    ) or "Unknown Contractor"

    contractor_address = _extract_pattern(
        text,
        r"(?:address)[:\s]+([^\n]+)",
    ) or ""

    contractor_ein = _extract_pattern(
        text,
        r"(?:ein|tax.?id|federal.?id)[:\s#]+(\d{2}-?\d{7})",
    ) or ""

    project_name = _extract_pattern(
        text,
        r"(?:project|job.?name)[:\s]+([^\n,]+)",
    ) or "Unknown Project"

    project_location = _extract_pattern(
        text,
        r"(?:project.?location|site.?location|locality)[:\s]+([^\n]+)",
    ) or "Washington, DC"

    contract_number = _extract_pattern(
        text,
        r"(?:contract.?number|contract.?no)[:\s#]+([A-Z0-9-]+)",
    ) or ""

    wage_determination = _extract_pattern(
        text,
        r"(?:wage.?determination|wd.?number)[:\s#]+([A-Z0-9-]+)",
    ) or ""

    payroll_number = _extract_int(text, r"(?:payroll.?#|payroll.?number)[:\s]*(\d+)")

    week_ending = _extract_date(
        text,
        r"(?:week.?ending|period.?ending)[:\s]*([^\n,]+)",
    )

    certification_date = _extract_date(
        text,
        r"(?:certified|certification.?date)[:\s]*([^\n,]+)",
    )

    employees = _extract_employees(text)

    return ExtractedWCP(
        job_id=job_id,
        contractor=ContractorInfo(
            name=contractor_name.strip(),
            address=contractor_address.strip(),
            ein=contractor_ein,
        ),
        project=ProjectInfo(
            name=project_name.strip(),
            location=project_location.strip(),
            contract_number=contract_number,
            wage_determination_number=wage_determination,
        ),
        employees=employees,
        certification_date=certification_date,
        payroll_number=payroll_number,
        week_ending=week_ending,
    )


def _extract_employees(text: str) -> list[EmployeeRecord]:
    employees: list[EmployeeRecord] = []

    row_pattern = re.compile(
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+"
        r"([A-Za-z\s]+?)\s+"
        r"(\d+(?:\.\d+)?)\s+"
        r"\$?(\d+(?:\.\d+)?)\s*"
        r"(?:\$?(\d+(?:\.\d+)?))?\s*"
        r"\$?(\d+(?:,\d+)*(?:\.\d+)?)\s*"
        r"(?:\$?(\d+(?:,\d+)*(?:\.\d+)?))?\s*"
        r"\$?(\d+(?:,\d+)*(?:\.\d+)?)",
        re.IGNORECASE,
    )

    for match in row_pattern.finditer(text):
        try:
            name = match.group(1).strip()
            raw_trade = match.group(2).strip()
            trade = resolve_classification(raw_trade)

            hours = float(match.group(3))
            wage = float(match.group(4).replace(",", ""))
            fringe = float(match.group(5).replace(",", "")) if match.group(5) else 0.0
            gross = float(match.group(6).replace(",", ""))
            deductions = float(match.group(7).replace(",", "")) if match.group(7) else 0.0
            net = float(match.group(8).replace(",", ""))

            overtime_hours = max(0, hours - 40)

            employees.append(
                EmployeeRecord(
                    name=name,
                    trade_classification=trade,
                    hours_worked=hours,
                    overtime_hours=overtime_hours,
                    hourly_wage=wage,
                    fringe_benefits=fringe,
                    gross_earnings=gross,
                    deductions=deductions,
                    net_wages=net,
                )
            )
        except (ValueError, IndexError):
            continue

    if not employees:
        employees = _extract_employees_simple(text)

    return employees


def _extract_employees_simple(text: str) -> list[EmployeeRecord]:
    employees: list[EmployeeRecord] = []

    name_pattern = re.compile(r"(?:^|\n)\s*(?:name|employee)\s*[:\s]", re.IGNORECASE)
    positions = [m.start() for m in name_pattern.finditer(text)]

    if not positions:
        return employees

    blocks = []
    for i, pos in enumerate(positions):
        end = positions[i + 1] if i + 1 < len(positions) else len(text)
        blocks.append(text[pos:end])

    for block in blocks:
        emp = _parse_employee_block(block)
        if emp is not None:
            employees.append(emp)

    return employees


def _parse_employee_block(block: str) -> EmployeeRecord | None:
    name_extracted = _extract_pattern(
        block,
        r"(?:name|employee)[: \t]+([^\n,]+)",
    )
    name = name_extracted.strip() if name_extracted else "Unknown"
    if name == "Unknown":
        return None

    raw_trade = _extract_pattern(
        block,
        r"(?:trade|role|classification)[: \t]+([^\n,]+)",
    ) or "Unknown"
    trade = resolve_classification(raw_trade.strip())

    hours = _extract_float(block, r"(?:hours.?worked|hours)[: \t]*(-?\d+(?:\.\d+)?)") or 0.0
    overtime = (
        _extract_float(block, r"(?:overtime.?hours|overtime|ot)[: \t]*(-?\d+(?:\.\d+)?)")
        or 0.0
    )

    # Issue 8: total hours calculation for arithmetic checks
    total_hours = hours if hours > 40 else (hours + overtime if overtime > 0 else hours)

    wage = (
        _extract_float(
            block,
            r"(?:hourly.?wage|wage|hourly.?rate|rate)[: \t]*\$?(-?\d+(?:\.\d+)?)",
        )
        or 0.0
    )

    fringe = _extract_float(
        block, r"(?:fringe|benefits)[: \t]*\$?(-?\d+(?:,\d+)*(?:\.\d+)?)"
    ) or 0.0

    gross = _extract_float(
        block, r"(?:gross|gross.?earnings)[: \t]*\$?(-?\d+(?:,\d+)*(?:\.\d+)?)"
    ) or 0.0
    net = _extract_float(
        block, r"(?:net|net.?wages)[: \t]*\$?(-?\d+(?:,\d+)*(?:\.\d+)?)"
    ) or 0.0
    deductions_raw = _extract_float(
        block, r"(?:deductions?)[: \t]*\$?(-?\d+(?:,\d+)*(?:\.\d+)?)"
    )
    deductions = (
        deductions_raw
        if deductions_raw is not None
        else (gross - net if gross > net else 0.0)
    )

    return EmployeeRecord(
        name=name,
        trade_classification=trade,
        hours_worked=total_hours,
        overtime_hours=overtime,
        hourly_wage=wage,
        fringe_benefits=fringe,
        gross_earnings=gross,
        deductions=deductions,
        net_wages=net,
    )


def extract_from_pdf(pdf_bytes: bytes) -> ExtractedWCP:
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            all_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    all_text += text + "\n"

                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            all_text += " ".join(str(cell) for cell in row if cell) + "\n"

            if all_text.strip():
                return extract_from_text(all_text)
    except Exception:
        logger.warning("PDF extraction failed", exc_info=True)

    job_id = str(uuid.uuid4())
    return ExtractedWCP(
        job_id=job_id,
        contractor=ContractorInfo(name="Unknown", address="", ein=""),
        project=ProjectInfo(
            name="Unknown", location="", contract_number="", wage_determination_number=""
        ),
        employees=[],
        certification_date=None,
    )
