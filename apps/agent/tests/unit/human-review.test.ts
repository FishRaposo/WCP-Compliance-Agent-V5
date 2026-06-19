import { describe, it, expect } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import type { TrustScoredDecision } from "../../src/mastra/schemas.js";

function decision(overrides: Partial<TrustScoredDecision> = {}): TrustScoredDecision {
  return {
    job_id: "job-hr-1",
    verdict: "needs_review",
    trust_score: 0.45,
    trust_band: "require_human_review",
    requires_human_review: true,
    violation_count: 0,
    warning_count: 2,
    llm_confidence: 0.6,
    reasoning_summary: "Warnings present; low trust.",
    citations: [],
    ...overrides,
  };
}

describe("human-review workflow (suspend/resume)", () => {
  it("suspends for a human, then resumes and applies the reviewer's verdict", async () => {
    const { mastra } = await import("../../src/mastra/index.js");
    const run = await mastra.getWorkflow("humanReviewWorkflow").createRun();

    const suspended = await run.start({
      inputData: decision(),
      requestContext: new RequestContext(),
    });
    expect(suspended.status).toBe("suspended");

    const resumed = await run.resume({
      step: "human-review",
      resumeData: { reviewer: "jane.reviewer", verdict: "approved", note: "manual override after review" },
    });

    expect(resumed.status).toBe("success");
    if (resumed.status !== "success") return;
    expect(resumed.result.verdict).toBe("approved");
    expect(resumed.result.requires_human_review).toBe(false);
    expect(resumed.result.reasoning_summary).toContain("jane.reviewer");
  });

  it("passes through unchanged when the band does not require a human", async () => {
    const { mastra } = await import("../../src/mastra/index.js");
    const run = await mastra.getWorkflow("humanReviewWorkflow").createRun();

    const result = await run.start({
      inputData: decision({ trust_band: "auto_approve", requires_human_review: false, verdict: "approved" }),
      requestContext: new RequestContext(),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.verdict).toBe("approved");
    expect(result.result.requires_human_review).toBe(false);
  });
});
