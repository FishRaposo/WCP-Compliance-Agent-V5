import { describe, expect, it } from "vitest";

import { safeVerdict } from "../src/mastra/trust.js";
import type { DeterministicReport } from "../src/mastra/schemas.js";

function report(violations: number, warnings: number): DeterministicReport {
  return {
    job_id: "j1",
    report_id: "r1",
    artifact_id: "a1",
    checks: [],
    overall_status: violations > 0 ? "fail" : warnings > 0 ? "warnings" : "pass",
    violation_count: violations,
    warning_count: warnings,
    passed_count: 5,
    dbwd_rates_used: [],
  } as unknown as DeterministicReport;
}

describe("portfolio boundaries — safe verdict", () => {
  it("violations force rejection no matter what the LLM said", () => {
    expect(safeVerdict(report(2, 0), { verdict: "approved" })).toBe("rejected");
    expect(safeVerdict(report(1, 1), { verdict: "needs_review" })).toBe("rejected");
  });

  it("unverified coverage cannot be approved — warnings abstain to review", () => {
    // A locality miss or approximate rate leaves only warnings; an optimistic
    // LLM approval must degrade to needs_review, never approve.
    expect(safeVerdict(report(0, 1), { verdict: "approved" })).toBe("needs_review");
  });

  it("warnings do not soften a rejection upward", () => {
    expect(safeVerdict(report(0, 2), { verdict: "rejected" })).toBe("rejected");
  });

  it("clean reports keep the LLM verdict", () => {
    expect(safeVerdict(report(0, 0), { verdict: "approved" })).toBe("approved");
    expect(safeVerdict(report(0, 0), { verdict: "needs_review" })).toBe("needs_review");
  });
});
