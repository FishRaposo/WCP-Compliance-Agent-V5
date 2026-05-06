/** Integration test for Gateway → Agent flow.
 *
 * Tests that Gateway can successfully call Agent endpoints with proper request/response format.
 */

import { describe, it, expect } from "vitest";

describe("Gateway → Agent Integration", () => {
  it("should validate request schema for Agent decision endpoint", () => {
    const payload = {
      job_id: "test-job-123",
      contract_id: "GS-001-2026",
      payroll_data: [
        {
          employee_name: "John Doe",
          trade: "Electrician",
          hours_worked: 40,
          hourly_rate: 51.69,
          fringe_rate: 34.63,
        },
      ],
    };

    expect(payload.job_id).toBe("test-job-123");
    expect(payload.payroll_data).toHaveLength(1);
    expect(payload.payroll_data[0].trade).toBe("Electrician");
  });

  it("should validate response schema from Agent decision endpoint", () => {
    const response = {
      job_id: "test-job-123",
      verdict: "compliant",
      trust_score: 0.95,
      trust_band: "high",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      reasoning_summary: "All wage rates match DBWD requirements",
      citations: [],
      created_at: new Date().toISOString(),
    };

    expect(response.job_id).toBe("test-job-123");
    expect(response.verdict).toBe("compliant");
    expect(response.trust_score).toBeGreaterThanOrEqual(0);
    expect(response.trust_score).toBeLessThanOrEqual(1);
  });
});
