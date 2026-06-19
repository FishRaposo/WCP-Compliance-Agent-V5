import { Agent } from "@mastra/core/agent";

import { getInstructions } from "../instructions.js";
import { routeVerdictModel } from "../model-router.js";
import { verdictAgentTools } from "../tools/index.js";
import { verdictMemory } from "../memory.js";
import { liveScorers } from "../scorers/index.js";

/** requestContext key carrying the selected prompt version (e.g. "v1" | "v2"). */
export const PROMPT_VERSION_KEY = "promptVersion";

/**
 * The compliance verdict agent.
 *
 * Everything is resolved per request from the Mastra requestContext:
 *  - instructions: the selected prompt version (prompt iterations stay traceable);
 *  - model: the routing mode (compliance / cost / synthesis) with fallback chains;
 *  - tools: Davis-Bacon retrieval (lexical search always; embeddings RAG in real mode);
 *  - memory: contractor-scoped recall of prior decisions;
 *  - scorers: sampled live citation-groundedness judging (real mode).
 *
 * The structured verdict schema is supplied per call via `generate(..., { structuredOutput })`.
 */
export const verdictAgent = new Agent({
  id: "wcp-verdict-agent",
  name: "WCP Compliance Verdict Agent",
  instructions: ({ requestContext }) =>
    getInstructions(requestContext.get(PROMPT_VERSION_KEY) as string | undefined),
  model: routeVerdictModel,
  tools: verdictAgentTools,
  memory: verdictMemory,
  scorers: liveScorers(),
});
