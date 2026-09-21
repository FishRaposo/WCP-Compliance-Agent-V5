import { describe, it, expect } from "vitest";
import {
  DEMO_JOB_ID,
  DEMO_DECISION_ID,
  DEMO_CONTRACT_ID,
  DEMO_INGESTION_JOB_ID,
  mockTrustScoredDecision,
  mockDecisionSummaries,
  mockAnalyticsOverview,
  mockContracts,
  mockPayrolls,
  mockIngestionJobs,
} from "../src/utils/mock-data";

describe("mock data", () => {
  it("mockTrustScoredDecision is the rejected portfolio demo case", async () => {
    const d = mockTrustScoredDecision;
    expect(d.job_id).toBe(DEMO_JOB_ID);
    expect(d.verdict).toBe("rejected");
    expect(d.trust_band).toBe("require_human_review");
    expect(d.violation_count).toBeGreaterThan(0);
    expect(d.reasoning_summary).toContain("Deterministic validation");
    expect(d.citations.length).toBeGreaterThan(0);
  });

  it("mockDecisionSummaries is non-empty and includes the demo case", async () => {
    expect(Array.isArray(mockDecisionSummaries)).toBe(true);
    expect(mockDecisionSummaries.length).toBeGreaterThan(0);
    expect(mockDecisionSummaries[0]?.job_id).toBe(DEMO_JOB_ID);
    expect(mockDecisionSummaries[0]?.decision_id).toBe(DEMO_DECISION_ID);
  });

  it("mockAnalyticsOverview references the portfolio demo scale", async () => {
    expect(mockAnalyticsOverview.total_decisions).toBe(24);
    expect(mockAnalyticsOverview.human_review_queue_depth).toBe(1);
    expect(mockAnalyticsOverview.note).toContain(DEMO_JOB_ID);
  });

  it("contracts, payrolls, and ingestion reference the same demo contract", () => {
    expect(mockContracts.items[0]?.id).toBe(DEMO_CONTRACT_ID);
    expect(mockPayrolls.items[0]?.contract_id).toBe(DEMO_CONTRACT_ID);
    expect(mockIngestionJobs[0]?.job_id).toBe(DEMO_INGESTION_JOB_ID);
  });
});
