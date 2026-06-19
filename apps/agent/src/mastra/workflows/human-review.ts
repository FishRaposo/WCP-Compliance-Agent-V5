import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { TrustScoredDecisionSchema, VerdictStatusSchema } from "../schemas.js";

/**
 * Human-in-the-loop review — the suspend/resume showcase.
 *
 * The synchronous pipeline endpoints stay contract-compatible (they return a decision with
 * `requires_human_review` set). This separate, opt-in workflow demonstrates Mastra's durable
 * suspend/resume: when a decision falls in the `require_human_review` band, the run SUSPENDS
 * and waits for a human verdict; `run.resume(...)` applies the reviewer's override. Auto-approve
 * and flagged bands pass straight through.
 */
const reviewSuspendSchema = z.object({
  reason: z.string(),
  decision: TrustScoredDecisionSchema,
});

export const reviewResumeSchema = z.object({
  reviewer: z.string().min(1),
  verdict: VerdictStatusSchema,
  note: z.string().optional(),
});

const humanReviewStep = createStep({
  id: "human-review",
  inputSchema: TrustScoredDecisionSchema,
  outputSchema: TrustScoredDecisionSchema,
  suspendSchema: reviewSuspendSchema,
  resumeSchema: reviewResumeSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    // Bands that don't need a human: pass through unchanged.
    if (inputData.trust_band !== "require_human_review") {
      return inputData;
    }

    // First pass: no reviewer input yet -> suspend the run and wait.
    if (!resumeData) {
      await suspend({
        reason: `Trust score ${inputData.trust_score.toFixed(2)} is in the require_human_review band`,
        decision: inputData,
      });
      return inputData; // not reached after suspend; satisfies the return type
    }

    // Resumed: apply the reviewer's override.
    const note = resumeData.note ? ` — ${resumeData.note}` : "";
    return {
      ...inputData,
      verdict: resumeData.verdict,
      requires_human_review: false,
      reasoning_summary: `${inputData.reasoning_summary} [Human review by ${resumeData.reviewer}: ${resumeData.verdict}${note}]`,
    };
  },
});

export const humanReviewWorkflow = createWorkflow({
  id: "wcp-human-review",
  inputSchema: TrustScoredDecisionSchema,
  outputSchema: TrustScoredDecisionSchema,
})
  .then(humanReviewStep)
  .commit();
