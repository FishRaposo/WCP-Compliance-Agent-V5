import { describe, it, expect } from "vitest";

describe("mock data", () => {
  it("mockTrustScoredDecision has required fields", async () => {
    const { mockTrustScoredDecision } = await import("../src/utils/mock-data");
    const d = mockTrustScoredDecision;
    expect(d.job_id).toBeDefined();
    expect(d.verdict).toBeDefined();
    expect(d.trust_score).toBeDefined();
    expect(d.trust_band).toBeDefined();
  });

  it("mockDecisionSummaries is non-empty array", async () => {
    const { mockDecisionSummaries } = await import("../src/utils/mock-data");
    expect(Array.isArray(mockDecisionSummaries)).toBe(true);
    expect(mockDecisionSummaries.length).toBeGreaterThan(0);
  });

  it("mockAnalyticsOverview has expected keys", async () => {
    const { mockAnalyticsOverview } = await import("../src/utils/mock-data");
    expect(mockAnalyticsOverview.total_decisions).toBeDefined();
  });
});
