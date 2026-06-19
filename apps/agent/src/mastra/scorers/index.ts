import type { MastraScorers } from "@mastra/core/evals";
import { verdictAgreementScorer } from "./verdict-agreement.scorer.js";
import { citationGroundednessScorer } from "./citation-groundedness.scorer.js";
import { ragEnabled } from "../rag.js";

export { verdictAgreementScorer, citationGroundednessScorer };

/** All scorers registered on the Mastra instance (visible in the playground / scorer traces). */
export const allScorers = {
  verdictAgreement: verdictAgreementScorer,
  citationGroundedness: citationGroundednessScorer,
};

/**
 * Live scorers attached to the verdict agent. The LLM-judge scorer is sampled and only
 * enabled in real mode (it needs a judge model); in mock mode no live scoring runs.
 */
export function liveScorers(): MastraScorers {
  if (!ragEnabled) return {};
  return {
    citationGroundedness: {
      scorer: citationGroundednessScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
  };
}
