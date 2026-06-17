import { describe, it, expect } from "vitest";
import type {
  TrustScoredDecision,
  DecisionSummary,
  AnalyticsOverview,
  Citation,
  TrustBand,
} from "../src/types/api";
import { mockTrustScoredDecision } from "../src/utils/mock-data";

describe("API types", () => {
  it("mock decision satisfies TrustScoredDecision type", () => {
    const d: TrustScoredDecision = mockTrustScoredDecision;
    expect(d.job_id).toBeTruthy();
    expect(["approved", "rejected", "needs_review"]).toContain(d.verdict);
    expect(d.trust_score).toBeGreaterThanOrEqual(0);
    expect(d.trust_score).toBeLessThanOrEqual(1);
    expect(["auto_approve", "flag_for_review", "require_human_review"]).toContain(d.trust_band);
  });

  it("valid trust bands", () => {
    const bands: TrustBand[] = ["auto_approve", "flag_for_review", "require_human_review"];
    expect(bands).toHaveLength(3);
  });

  it("citations are structured", () => {
    const c: Citation = { regulation: "40 U.S.C. § 3142", section: "3142", text: "Minimum wage" };
    expect(c.regulation).toBeTruthy();
  });

  it("summary and analytics types are usable", () => {
    const summary: DecisionSummary = {
      decision_id: "dec-001",
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.92,
      trust_band: "auto_approve",
      violation_count: 0,
      warning_count: 0,
      created_at: "2026-06-16T00:00:00Z",
    };
    const overview: AnalyticsOverview = {
      total_decisions: 1,
      approval_rate: 1,
      avg_trust_score: 0.92,
      total_violations: 0,
      total_warnings: 0,
      avg_cost_usd: 0.01,
      avg_latency_ms: 250,
    };
    expect(summary.trust_band).toBe("auto_approve");
    expect(overview.total_decisions).toBe(1);
  });
});
