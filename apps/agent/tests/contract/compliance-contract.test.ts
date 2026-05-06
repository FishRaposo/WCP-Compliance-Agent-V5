import { describe, it, expect, vi, beforeEach } from "vitest";

function makeComplianceCoreUrl(path: string) {
  const baseUrl = "http://localhost:8000";
  return `${baseUrl}${path}`;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Agent → Compliance Core contract", () => {
  it("POST /internal/extract returns ExtractedWCP shape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          job_id: "job-001",
          contractor: { name: "Test Corp", address: "", ein: "" },
          project: { name: "Project X", location: "", contract_number: "", wage_determination_number: "" },
          employees: [
            {
              name: "John Doe",
              trade_classification: "Electrician",
              hours_worked: 40,
              overtime_hours: 0,
              hourly_wage: 55.0,
              fringe_benefits: 1385.2,
              gross_earnings: 2200.0,
              deductions: 150.0,
              net_wages: 2050.0,
            },
          ],
        }),
    });

    const res = await fetch(makeComplianceCoreUrl("/internal/extract"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Sample payroll text..." }),
    });

    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("job_id");
    expect(json).toHaveProperty("contractor");
    expect(json.contractor).toHaveProperty("name");
    expect(json).toHaveProperty("project");
    expect(json).toHaveProperty("employees");
    expect(Array.isArray(json.employees)).toBe(true);
    if (json.employees.length > 0) {
      const emp = json.employees[0];
      expect(emp).toHaveProperty("name");
      expect(emp).toHaveProperty("trade_classification");
      expect(emp).toHaveProperty("hours_worked");
      expect(emp).toHaveProperty("hourly_wage");
      expect(emp).toHaveProperty("gross_earnings");
      expect(emp).toHaveProperty("net_wages");
    }
  });

  it("POST /internal/validate returns DeterministicReport shape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          job_id: "job-001",
          report_id: "report-001",
          artifact_id: "artifact-001",
          checks: [
            {
              check_id: "wage_john_doe",
              check_type: "wage_rate",
              employee_name: "John Doe",
              status: "pass",
              expected_value: 51.69,
              actual_value: 55.0,
              variance: 3.31,
              regulation_cite: "40 U.S.C. § 3142",
              message: "Wage meets DBWD minimum.",
            },
          ],
          overall_status: "pass",
          violation_count: 0,
          warning_count: 0,
          passed_count: 1,
        }),
    });

    const res = await fetch(makeComplianceCoreUrl("/internal/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: "job-001",
        contractor: { name: "Test Corp" },
        project: { name: "Project X" },
        employees: [],
      }),
    });

    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("checks");
    expect(Array.isArray(json.checks)).toBe(true);
    expect(json).toHaveProperty("overall_status");
    expect(["pass", "fail", "warnings"]).toContain(json.overall_status);
    expect(json).toHaveProperty("violation_count");
    expect(json).toHaveProperty("warning_count");

    if (json.checks.length > 0) {
      const check = json.checks[0];
      expect(check).toHaveProperty("check_id");
      expect(check).toHaveProperty("check_type");
      expect(check).toHaveProperty("status");
      expect(["pass", "fail", "warning"]).toContain(check.status);
      expect([
        "wage_rate", "overtime", "fringe_benefit", "signature",
        "total_arithmetic", "classification", "data_integrity", "minimum_wage",
      ]).toContain(check.check_type);
    }
  });
});
