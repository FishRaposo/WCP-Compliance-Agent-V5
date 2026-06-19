import { extractTool } from "./extract.tool.js";
import { validateTool } from "./validate.tool.js";
import { persistTool } from "./persist.tool.js";
import { searchTool } from "./search.tool.js";
import { dbwdLookupTool } from "./dbwd-lookup.tool.js";
import { wageQueryTool } from "../rag.js";

/** All tools, registered on the Mastra instance (also surfaced in the dev playground). */
export const allTools = {
  extractTool,
  validateTool,
  persistTool,
  searchTool,
  dbwdLookupTool,
  ...(wageQueryTool ? { wageQueryTool } : {}),
};

/**
 * Retrieval tools the verdict agent may call to ground its reasoning. The embeddings-backed
 * `wageQuery` tool is included only when RAG is enabled (real mode); `wageRegulationSearch`
 * always works (Compliance Core's local corpus), so the agent can retrieve in mock mode too.
 */
export const verdictAgentTools = {
  wageRegulationSearch: searchTool,
  dbwdRateLookup: dbwdLookupTool,
  ...(wageQueryTool ? { wageQuery: wageQueryTool } : {}),
};
