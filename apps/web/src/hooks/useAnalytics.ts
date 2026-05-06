import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import type {
  AnalyticsOverview,
  DecisionVolume,
  ApprovalRateResponse,
  TrustBandDistribution,
  CostAnalytics,
} from "../types/api";

export function useAnalyticsOverview(days = 30) {
  return useQuery({
    queryKey: ["analytics", "overview", days],
    queryFn: () =>
      apiClient.get<AnalyticsOverview>("/api/v1/analytics/overview", { days }),
  });
}

export function useDecisionVolume(days = 30) {
  return useQuery({
    queryKey: ["analytics", "volume", days],
    queryFn: () =>
      apiClient.get<DecisionVolume[]>("/api/v1/analytics/volume", { days }),
  });
}

export function useApprovalByTrade() {
  return useQuery({
    queryKey: ["analytics", "approval-by-trade"],
    queryFn: () =>
      apiClient.get<ApprovalRateResponse>("/api/v1/analytics/approval-by-trade"),
  });
}

export function useTrustBandDistribution() {
  return useQuery({
    queryKey: ["analytics", "trust-band-distribution"],
    queryFn: () =>
      apiClient.get<TrustBandDistribution[]>("/api/v1/analytics/trust-band-distribution"),
  });
}

export function useCostAnalytics() {
  return useQuery({
    queryKey: ["analytics", "cost"],
    queryFn: () =>
      apiClient.get<CostAnalytics>("/api/v1/analytics/cost"),
  });
}

export function useComplianceAnalytics() {
  return useQuery({
    queryKey: ["analytics", "compliance"],
    queryFn: () => apiClient.get<any[]>("/api/v1/analytics/compliance"),
  });
}

export function useWagesAnalytics() {
  return useQuery({
    queryKey: ["analytics", "wages"],
    queryFn: () => apiClient.get<any[]>("/api/v1/analytics/wages"),
  });
}

export function useLLMAnalytics() {
  return useQuery({
    queryKey: ["analytics", "llm"],
    queryFn: () => apiClient.get<any[]>("/api/v1/analytics/llm"),
  });
}
