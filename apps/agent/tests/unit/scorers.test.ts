import { describe, it, expect } from "vitest";
import { verdictAgreementScorer } from "../../src/mastra/scorers/verdict-agreement.scorer.js";

describe("verdictAgreementScorer", () => {
  it("scores 1.0 when the verdict matches the expected label", async () => {
    const result = await verdictAgreementScorer.run({
      input: "gs-001",
      output: { verdict: "approved" },
      groundTruth: { expected_verdict: "approved" },
    });
    expect(result.score).toBe(1);
  });

  it("scores 0.0 when the verdict does not match", async () => {
    const result = await verdictAgreementScorer.run({
      input: "gs-002",
      output: { verdict: "approved" },
      groundTruth: { expected_verdict: "rejected" },
    });
    expect(result.score).toBe(0);
    expect(result.reason).toContain("Expected");
  });

  it("is case- and whitespace-insensitive", async () => {
    const result = await verdictAgreementScorer.run({
      input: "gs-003",
      output: { verdict: " Approved " },
      groundTruth: { expected_verdict: "approved" },
    });
    expect(result.score).toBe(1);
  });
});
