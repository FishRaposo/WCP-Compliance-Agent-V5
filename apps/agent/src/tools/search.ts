import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export interface SearchResult {
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
});

export async function searchTool(
  query: string,
  trade?: string,
  locality?: string,
  headers?: Record<string, string>
): Promise<SearchResult[]> {
  // The compliance-core search endpoint returns { query, results, total },
  // not a bare array. Unwrap the results (and forward trace headers).
  const response = await complianceClient.post<SearchResponse>(
    "/internal/search",
    { query, trade, locality, top_k: 5 },
    headers
  );
  return response?.results ?? [];
}
