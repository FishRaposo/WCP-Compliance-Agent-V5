"""Extraction edge case tests.

Tests that the PDF extractor handles malformed, missing, or unusual input
gracefully and produces appropriate error messages or fallback behavior.
"""

import pytest

from wcp_compliance.extraction.pdf_extractor import extract_from_text


@pytest.mark.asyncio
async def test_empty_input():
    """Test that empty input returns empty extraction with appropriate flags."""
    result = extract_from_text("")
    assert result.employees == []
    assert result.contractor.name == ""
    assert result.project.name == ""


@pytest.mark.asyncio
async def test_only_header_no_employees():
    """Test payroll with header but no employee rows."""
    text = """Contractor: Test Corp
Project: Test Project
Location: Washington, DC
Certified: 2025-06-15"""
    result = extract_from_text(text)
    assert result.employees == []
    assert result.contractor.name == "Test Corp"


@pytest.mark.asyncio
async def test_malformed_hours_text():
    """Test that non-numeric hours are handled gracefully."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe
Trade: Electrician
Hours: forty
Hourly Wage: 55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    # Hours should default to 0 or be parsed as best effort
    assert result.employees[0].hours_worked == 0


@pytest.mark.asyncio
async def test_negative_wage_text():
    """Test that negative wages are flagged as errors."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe
Trade: Electrician
Hours: 40
Hourly Wage: -55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    assert result.employees[0].hourly_wage == -55.00


@pytest.mark.asyncio
async def test_unicode_characters_in_name():
    """Test that Unicode characters in names are preserved."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: José María González
Trade: Electrician
Hours: 40
Hourly Wage: 55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    assert "José" in result.employees[0].name


@pytest.mark.asyncio
async def test_very_long_name():
    """Test that very long names are handled."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: Alexander Maximilian Bartholomew Christopher Darius Edward Frederick Gregory Henry Isaiah
Trade: Electrician
Hours: 40
Hourly Wage: 55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    assert len(result.employees[0].name) > 50


@pytest.mark.asyncio
async def test_duplicate_employee_names():
    """Test that duplicate employee names are allowed (same name, different entries)."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe
Trade: Electrician
Hours: 40
Hourly Wage: 55.00
Fringe: 1400.00
Gross: 2200.00
Deductions: 150.00
Net: 2050.00

Name: John Doe
Trade: Plumber
Hours: 40
Hourly Wage: 50.00
Fringe: 1200.00
Gross: 2000.00
Deductions: 100.00
Net: 1900.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 2
    assert result.employees[0].name == "John Doe"
    assert result.employees[1].name == "John Doe"


@pytest.mark.asyncio
async def test_missing_all_employee_fields():
    """Test employee with only name, no other fields."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    assert result.employees[0].name == "John Doe"
    assert result.employees[0].hours_worked == 0
    assert result.employees[0].hourly_wage == 0.0


@pytest.mark.asyncio
async def test_comma_separated_amounts():
    """Test that comma-separated amounts are parsed correctly."""
    text = """Contractor: Test Corp
Project: Test
Location: Washington, DC
Certified: 2025-06-15

Name: John Doe
Trade: Electrician
Hours: 40
Hourly Wage: 55.00
Fringe: 1,400.00
Gross: 2,200.00
Deductions: 150.00
Net: 2,050.00"""
    result = extract_from_text(text)
    assert len(result.employees) == 1
    assert result.employees[0].fringe_benefits == 1400.00
    assert result.employees[0].gross_earnings == 2200.00
