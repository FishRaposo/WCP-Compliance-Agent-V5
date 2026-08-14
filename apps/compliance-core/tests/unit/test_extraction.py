from wcp_compliance.extraction.pdf_extractor import extract_from_text


def test_extract_block_label_variants_dates_and_decimal_hours():
    result = extract_from_text(
        "Company: Variant Builders\n"
        "Project: Variant Site\n"
        "Work Site: Baltimore, MD\n"
        "Week Ending Date: 03/15/2025\n"
        "Certification Date: March 16, 2025\n\n"
        "Employee Name: Avery Worker\n"
        "Job Classification: Electrician\n"
        "Regular Hours: 40.5\n"
        "OT Hrs: 1.25\n"
        "Base Rate: 55.00\n"
        "Fringe: 0\n"
        "Gross: 2337.50\n"
        "Deductions: 0\n"
        "Net: 2337.50\n"
    )

    assert result.project.location == "Baltimore, MD"
    assert result.week_ending.isoformat() == "2025-03-15"
    assert result.certification_date.isoformat() == "2025-03-16"
    assert len(result.employees) == 1
    employee = result.employees[0]
    assert employee.name == "Avery Worker"
    assert employee.trade_classification == "Electrician"
    assert employee.hours_worked == 41.75
    assert employee.overtime_hours == 1.25
    assert employee.hourly_wage == 55.0


def test_refuses_malformed_variant_block_instead_of_creating_zero_value_employee():
    result = extract_from_text(
        "Employee Name: Malformed Hours\n"
        "Job Classification: Electrician\n"
        "Regular Hours: 40.5.2\n"
        "Base Rate: $55.00\n"
    )

    assert result.employees == []


def test_extract_from_text_basic():
    text = (
        "Contractor: ABC Construction\n"
        "Project: Federal Building Renovation\n"
        "Location: Washington, DC\n"
        "Certified: 2025-06-15\n"
        "Payroll # 1\n"
        "Week Ending: 2025-06-14\n"
        "\n"
        "Name: John Smith\n"
        "Trade: Electrician\n"
        "Hours: 40\n"
        "Hourly Wage: 55.00\n"
        "Fringe: 1400.00\n"
        "Gross: 2200.00\n"
        "Deductions: 150.00\n"
        "Net: 2050.00\n"
    )
    result = extract_from_text(text)
    assert result.job_id
    assert result.contractor.name == "ABC Construction"
    assert result.project.name == "Federal Building Renovation"
    assert result.project.location == "Washington, DC"
    assert result.certification_date is not None
    assert result.payroll_number == 1
    assert len(result.employees) >= 1
    emp = result.employees[0]
    assert emp.name == "John Smith"
    assert emp.trade_classification == "Electrician"
    assert emp.hours_worked == 40.0
    assert emp.hourly_wage == 55.00


def test_extract_from_text_empty():
    result = extract_from_text("")
    assert result.job_id
    assert result.contractor.name == "Unknown Contractor"
    assert result.project.name == "Unknown Project"
    assert len(result.employees) == 0


def test_extract_from_text_with_ein():
    text = (
        "Contractor: Test Corp\n"
        "EIN: 12-3456789\n"
        "Project: Test Project\n"
    )
    result = extract_from_text(text)
    assert result.contractor.name == "Test Corp"
    assert result.contractor.ein == "12-3456789"


def test_extract_with_contract_number():
    text = (
        "Contractor: BuildCo\n"
        "Project: Highway Project\n"
        "Contract Number: HWY-2025-088\n"
        "Wage Determination: WD-DC-2025-001\n"
    )
    result = extract_from_text(text)
    assert result.project.contract_number == "HWY-2025-088"
    assert result.project.wage_determination_number == "WD-DC-2025-001"


def test_extract_employee_row_format():
    text = (
        "Contractor: ABC Corp\n"
        "Project: Test\n"
        "\n"
        "John Smith Electrician 40 55.00 1400.00 2200.00 150.00 2050.00\n"
    )
    result = extract_from_text(text)
    assert len(result.employees) >= 1
    emp = result.employees[0]
    assert "John Smith" in emp.name
    assert emp.hours_worked == 40.0
    assert emp.hourly_wage == 55.00
    assert emp.gross_earnings == 2200.00


def test_extract_employee_block_format():
    text = (
        "Contractor: ABC Corp\n"
        "Project: Test\n"
        "Name: Jane Doe\n"
        "Trade: Plumber\n"
        "Hours Worked: 40\n"
        "Hourly Wage: 47.85\n"
        "Fringe: 1200.00\n"
        "Gross Earnings: 1914.00\n"
        "Deductions: 100.00\n"
        "Net: 1814.00\n"
    )
    result = extract_from_text(text)
    assert len(result.employees) >= 1
    emp = result.employees[0]
    assert emp.name == "Jane Doe"
    assert emp.trade_classification in ("Plumber", "plumber")


def test_extract_with_address():
    text = (
        "Contractor: MegaBuild Inc\n"
        "Address: 1500 Pennsylvania Ave NW, Washington, DC\n"
        "Project: White House Renovation\n"
    )
    result = extract_from_text(text)
    assert result.contractor.address == "1500 Pennsylvania Ave NW, Washington, DC"


def test_extract_date_formats():
    text = (
        "Contractor: TestCorp\n"
        "Project: Test\n"
        "Week Ending: 01/12/2025\n"
        "Certified: January 15, 2025\n"
    )
    result = extract_from_text(text)
    assert result.week_ending is not None


def test_extract_missing_fields():
    text = (
        "Contractor: Minimal Corp\n"
        "Project: Tiny Project\n"
    )
    result = extract_from_text(text)
    assert result.contractor.name == "Minimal Corp"
    assert result.certification_date is None
    assert result.week_ending is None


def test_extract_multiple_employees():
    text = (
        "Contractor: BigCo\n"
        "Project: Mega Mall\n"
        "\n"
        "Name: Alice Johnson\n"
        "Trade: Electrician\n"
        "Hours Worked: 40\n"
        "Hourly Wage: 55.00\n"
        "Fringe: 1400.00\n"
        "Gross: 2200.00\n"
        "Deductions: 150.00\n"
        "Net: 2050.00\n"
        "\n"
        "Name: Bob Smith\n"
        "Trade: Plumber\n"
        "Hours Worked: 45\n"
        "Hourly Wage: 50.00\n"
        "Fringe: 1300.00\n"
        "Gross: 2375.00\n"
        "Deductions: 200.00\n"
        "Net: 2175.00\n"
    )
    result = extract_from_text(text)
    assert len(result.employees) >= 2
    names = [e.name for e in result.employees]
    assert "Alice Johnson" in names
    assert "Bob Smith" in names
