import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { complianceClient, traceHeaders } from "./http.js";

const SearchResultSchema = z.object({
  chunk_id: z.string().default(""),
  text: z.string().default(""),
  score: z.number().optional(),
  rerank_score: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
  total: z.number(),
});

/**
 * Lexical/semantic search over Compliance Core's Davis-Bacon corpus.
 *
 * Works with zero external services (Compliance Core serves an in-memory corpus locally), so
 * it is the retrieval path used in mock mode. In real mode the agent also has the
 * embeddings-backed `wage-query` RAG tool. Given to the verdict agent for agentic retrieval.
 */
export const searchTool = createTool({
  id: "wage-regulation-search",
  description:
    "Search Davis-Bacon wage determinations and regulation text relevant to a trade and locality. Use before deciding when wage-rate context would help.",
  inputSchema: z.object({
    query: z.string().min(1),
    trade: z.string().optional(),
    locality: z.string().optional(),
    top_k: z.number().int().min(1).max(20).default(5),
  }),
  outputSchema: z.object({
    results: z.array(SearchResultSchema),
  }),
  execute: async (inputData, { requestContext }) => {
    const response = await complianceClient.post(
      "/internal/search/",
      {
        query: inputData.query,
        trade: inputData.trade,
        locality: inputData.locality,
        top_k: inputData.top_k,
      },
      traceHeaders(requestContext),
    );
    const parsed = SearchResponseSchema.parse(response);
    return { results: parsed.results };
  },
});
