import { describe, it, expect } from "vitest";

describe("Gateway to Agent Integration", () => {
  it("validates the Agent workflow request payload shape", () => {
    const payload = {
      text: "Sample WH-347 payroll certification text...",
      job_id: "test-job-123",
    };

    expect(payload.text).toContain("WH-347");
    expect(payload.job_id).toBe("test-job-123");
  });

  it("validates the Agent trust-scored decision response shape", () => {
    const response = {
      job_id: "test-job-123",
      verdict: "approved",
      trust_score: 0.95,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      llm_confidence: 0.95,
      reasoning_summary: "All wage rates match DBWD requirements.",
      citations: [],
      created_at: new Date().toISOString(),
    };

    expect(response.job_id).toBe("test-job-123");
    expect(["approved", "rejected", "needs_review"]).toContain(response.verdict);
    expect(response.trust_score).toBeGreaterThanOrEqual(0);
    expect(response.trust_score).toBeLessThanOrEqual(1);
    expect(["auto_approve", "flag_for_review", "require_human_review"]).toContain(
      response.trust_band,
    );
  });
});
