from datetime import date

import pytest

from wcp_compliance.checks.fringe_check import check_fringe
from wcp_compliance.checks.overtime_check import check_overtime
from wcp_compliance.checks.signature_check import check_signature
from wcp_compliance.checks.total_check import check_totals
from wcp_compliance.checks.wage_check import check_wage
from wcp_compliance.models.enums import CheckStatus
from wcp_compliance.models.schemas import DBWDRateRecord, EmployeeRecord, ExtractedWCP, ContractorInfo, ProjectInfo


def _make_employee(**overrides) -> EmployeeRecord:
    defaults = dict(
        name="Test Worker",
        trade_classification="Electrician",
        hours_worked=40.0,
        overtime_hours=0.0,
        hourly_wage=55.00,
        fringe_benefits=1400.00,
        gross_earnings=2200.00,
        deductions=150.00,
        net_wages=2050.00,
    )
    defaults.update(overrides)
    return EmployeeRecord(**defaults)


def _make_dbwd_rate(**overrides) -> DBWDRateRecord:
    defaults = dict(
        trade="Electrician",
        locality="Washington, DC",
        rate=51.69,
        fringe=34.63,
        effective_date=date(2025, 1, 1),
        wage_determination_number="DC-2025-001",
    )
    defaults.update(overrides)
    return DBWDRateRecord(**defaults)


def _make_extracted_wcp(cert_date=None):
    return ExtractedWCP(
        job_id="test-001",
        contractor=ContractorInfo(name="Test Corp", address="123 Main", ein="12-3456789"),
        project=ProjectInfo(name="Test Project", location="Washington, DC"),
        employees=[],
        certification_date=cert_date,
        payroll_number=1,
    )


# ---------- Wage checks ----------

def test_check_wage_pass():
    emp = _make_employee(hourly_wage=55.00)
    rate = _make_dbwd_rate(rate=51.69)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.PASS
    assert result.actual_value >= result.expected_value


def test_check_wage_fail():
    emp = _make_employee(hourly_wage=40.00)
    rate = _make_dbwd_rate(rate=51.69)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.FAIL


def test_check_wage_exact_match():
    emp = _make_employee(hourly_wage=51.69)
    rate = _make_dbwd_rate(rate=51.69)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.PASS


def test_check_wage_much_higher_than_required():
    emp = _make_employee(hourly_wage=100.00)
    rate = _make_dbwd_rate(rate=51.69)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.PASS
    assert result.variance > 40.0


def test_check_wage_right_below_minimum():
    emp = _make_employee(hourly_wage=51.68)
    rate = _make_dbwd_rate(rate=51.69)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.FAIL
    assert abs(result.variance) < 0.02


def test_check_wage_different_trade():
    emp = _make_employee(trade_classification="Plumber", hourly_wage=50.00)
    rate = _make_dbwd_rate(trade="Plumber", rate=47.85, fringe=28.42)
    result = check_wage(emp, rate)
    assert result.status == CheckStatus.PASS


# ---------- Overtime checks ----------

def test_check_overtime_pass():
    emp = _make_employee(hours_worked=40.0, overtime_hours=0.0)
    result = check_overtime(emp)
    assert result.status == CheckStatus.PASS


def test_check_overtime_warning():
    emp = _make_employee(hours_worked=45.0, overtime_hours=0.0)
    result = check_overtime(emp)
    assert result.status == CheckStatus.WARNING


def test_check_overtime_with_recorded_ot():
    emp = _make_employee(hours_worked=45.0, overtime_hours=5.0)
    result = check_overtime(emp)
    assert result.status == CheckStatus.PASS


def test_check_overtime_under_threshold():
    emp = _make_employee(hours_worked=35.0, overtime_hours=0.0)
    result = check_overtime(emp)
    assert result.status == CheckStatus.PASS


def test_check_overtime_exactly_40():
    emp = _make_employee(hours_worked=40.0, overtime_hours=0.0)
    result = check_overtime(emp)
    assert result.status == CheckStatus.PASS


def test_check_overtime_massive_ot_without_recording():
    emp = _make_employee(hours_worked=60.0, overtime_hours=0.0, hourly_wage=50.00)
    result = check_overtime(emp)
    assert result.status == CheckStatus.WARNING
    assert result.expected_value == 20.0


# ---------- Fringe checks ----------

def test_check_fringe_pass():
    emp = _make_employee(hours_worked=40.0, fringe_benefits=1400.00)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.PASS


def test_check_fringe_fail():
    emp = _make_employee(hours_worked=40.0, fringe_benefits=100.00)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.FAIL


def test_check_fringe_exact_match():
    emp = _make_employee(hours_worked=40.0, fringe_benefits=1385.20)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.PASS


def test_check_fringe_zero():
    emp = _make_employee(hours_worked=40.0, fringe_benefits=0.0)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.FAIL


def test_check_fringe_more_than_required():
    emp = _make_employee(hours_worked=40.0, fringe_benefits=2000.00)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.PASS


def test_check_fringe_part_time():
    emp = _make_employee(hours_worked=20.0, fringe_benefits=500.00)
    rate = _make_dbwd_rate(fringe=34.63)
    result = check_fringe(emp, rate)
    assert result.status == CheckStatus.FAIL


# ---------- Total checks ----------

def test_check_totals_pass():
    emp = _make_employee(
        hours_worked=40.0,
        hourly_wage=55.00,
        overtime_hours=0.0,
        gross_earnings=2200.00,
        deductions=150.00,
        net_wages=2050.00,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.PASS


def test_check_totals_fail():
    emp = _make_employee(
        hours_worked=40.0,
        hourly_wage=55.00,
        overtime_hours=0.0,
        gross_earnings=9999.00,
        deductions=150.00,
        net_wages=9849.00,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.FAIL


def test_check_totals_with_overtime():
    emp = _make_employee(
        hours_worked=45.0,
        overtime_hours=5.0,
        hourly_wage=50.00,
        gross_earnings=2375.00,
        deductions=200.00,
        net_wages=2175.00,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.PASS


def test_check_totals_net_mismatch():
    emp = _make_employee(
        hours_worked=40.0,
        hourly_wage=55.00,
        overtime_hours=0.0,
        gross_earnings=2200.00,
        deductions=150.00,
        net_wages=9999.00,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.FAIL


def test_check_totals_tolerance_boundary():
    emp = _make_employee(
        hours_worked=40.0,
        hourly_wage=55.00,
        overtime_hours=0.0,
        gross_earnings=2200.009,
        deductions=0.0,
        net_wages=2200.009,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.PASS


def test_check_totals_no_deductions():
    emp = _make_employee(
        hours_worked=40.0,
        hourly_wage=55.00,
        overtime_hours=0.0,
        gross_earnings=2200.00,
        deductions=0.0,
        net_wages=2200.00,
    )
    result = check_totals(emp)
    assert result.status == CheckStatus.PASS


# ---------- Signature checks ----------

def test_check_signature_present():
    extracted = _make_extracted_wcp(cert_date=date(2025, 6, 15))
    result = check_signature(extracted)
    assert result.status == CheckStatus.PASS


def test_check_signature_missing():
    extracted = _make_extracted_wcp(cert_date=None)
    result = check_signature(extracted)
    assert result.status == CheckStatus.FAIL
    assert "Missing" in result.message


def test_check_signature_future_date():
    future_date = date.today().replace(year=date.today().year + 1)
    extracted = _make_extracted_wcp(cert_date=future_date)
    result = check_signature(extracted)
    assert result.status == CheckStatus.FAIL
    assert "future" in result.message.lower()


def test_check_signature_today_date():
    extracted = _make_extracted_wcp(cert_date=date.today())
    result = check_signature(extracted)
    assert result.status == CheckStatus.PASS
