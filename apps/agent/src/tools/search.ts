import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

interface SearchResult {
  chunk_id: string;
  text: string;
  score?: number;
  rerank_score?: number;
  metadata?: Record<string, unknown>;
}

const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
});

export async function searchTool(
  query: string,
  trade?: string,
  locality?: string
): Promise<SearchResult[]> {
  return complianceClient.post<SearchResult[]>("/internal/search", {
    query,
    trade,
    locality,
    top_k: 5,
  });
}
