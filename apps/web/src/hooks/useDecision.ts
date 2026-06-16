import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import type { DecisionDetail } from "../types/api";

export function useDecision(id: string | undefined) {
  return useQuery<DecisionDetail>({
    queryKey: ["decision", id],
    queryFn: () => apiClient.get<DecisionDetail>(`/api/v1/decisions/${id}`),
    enabled: Boolean(id),
  });
}
