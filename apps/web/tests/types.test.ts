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
});
