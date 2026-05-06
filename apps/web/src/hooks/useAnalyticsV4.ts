import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";

interface ComplianceByTrade {
  trade: string;
  total: number;
  approved: number;
  rate: number;
}

interface WageViolationTrend {
  date: string;
  violation_count: number;
  violation_rate: number;
}

interface LLMCostTrend {
  date: string;
  total_cost: number;
  cost_per_decision: number;
}

interface TokenUsageTrend {
  date: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export function useComplianceAnalytics() {
  return useQuery({
    queryKey: ["analytics-v4", "compliance"],
    queryFn: () => apiClient.get<ComplianceByTrade[]>("/api/v1/analytics/compliance"),
  });
}

export function useWagesAnalytics() {
  return useQuery({
    queryKey: ["analytics-v4", "wages"],
    queryFn: () => apiClient.get<WageViolationTrend[]>("/api/v1/analytics/wages"),
  });
}

export function useLLMAnalytics() {
  return useQuery({
    queryKey: ["analytics-v4", "llm"],
    queryFn: () =>
      apiClient.get<{
        cost_trend: LLMCostTrend[];
        token_usage: TokenUsageTrend[];
      }>("/api/v1/analytics/llm"),
  });
}
