import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import type { DecisionSummary, TrustBand } from "../types/api";

export function useDecisions(limit = 50, offset = 0, trustBand?: TrustBand) {
  return useQuery({
    queryKey: ["decisions", limit, offset, trustBand],
    queryFn: () =>
      apiClient.get<DecisionSummary[]>("/api/v1/decisions", {
        limit,
        offset,
        trust_band: trustBand,
      }),
  });
}
