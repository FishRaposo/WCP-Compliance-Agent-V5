import { createScorer } from "@mastra/core/evals";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * LLM-judged scorer: are the verdict's regulation citations grounded?
 *
 * An independent judge model reads the verdict's reasoning + citations and estimates how many
 * citations are actually supported (not fabricated). The LLM does the qualitative analysis;
 * the score is computed deterministically from its structured output. Attached LIVE to the
 * verdict agent (sampled) in real mode only — it needs a judge model.
 */

function extractDecision(output: unknown): { reasoning: string; citations: unknown[] } {
  const o = (output ?? {}) as Record<string, unknown>;
  // Live agent output may wrap the structured value under `object`.
  const obj = (o.object ?? o) as Record<string, unknown>;
  return {
    reasoning: String(obj.reasoning ?? obj.reasoning_summary ?? ""),
    citations: Array.isArray(obj.citations) ? (obj.citations as unknown[]) : [],
  };
}

export const citationGroundednessScorer = createScorer({
  id: "citation-groundedness",
  name: "Citation Groundedness",
  description:
    "LLM-judged: estimates the fraction of regulation citations in a verdict that are grounded and relevant.",
  judge: {
    model: openai("gpt-4o-mini"),
    instructions:
      "You are a strict Davis-Bacon compliance auditor. Judge whether each cited regulation is a real, relevant authority that supports the stated reasoning. Be skeptical of fabricated or irrelevant citations.",
  },
})
  .analyze({
    description: "Count grounded vs total citations for the verdict.",
    outputSchema: z.object({
      total: z.number().int(),
      grounded: z.number().int(),
      notes: z.string(),
    }),
    createPrompt: ({ run }) => {
      const { reasoning, citations } = extractDecision(run.output);
      return [
        "Reasoning:",
        reasoning || "(none)",
        "",
        "Citations (JSON):",
        JSON.stringify(citations, null, 2),
        "",
        "Return the total number of citations, how many are grounded and relevant, and brief notes.",
      ].join("\n");
    },
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult as
      | { total?: number; grounded?: number }
      | undefined;
    const total = analysis?.total ?? 0;
    const grounded = analysis?.grounded ?? 0;
    if (total <= 0) return 1; // nothing to ground -> not penalized
    return Math.max(0, Math.min(1, grounded / total));
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult as
      | { grounded?: number; total?: number; notes?: string }
      | undefined;
    return `Grounded ${analysis?.grounded ?? 0}/${analysis?.total ?? 0} citations (score ${score.toFixed(2)}). ${analysis?.notes ?? ""}`.trim();
  });
