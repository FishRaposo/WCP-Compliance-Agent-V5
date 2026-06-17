import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

interface SearchResult {
  chunk_id: string;
  text: string;
  score?: number;
  rerank_score?: number;
  metadata?: Record<string, unknown>;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: config.INTERNAL_SERVICE_TOKEN
    ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
    : {},
});

export async function searchTool(
  query: string,
  trade?: string,
  locality?: string
): Promise<SearchResult[]> {
  const response = await complianceClient.post<SearchResponse>("/internal/search/", {
    query,
    trade,
    locality,
    top_k: 5,
  });
  return response.results;
}
