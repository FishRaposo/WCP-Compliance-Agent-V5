import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import type { TrustScoredDecision } from "../types/api";

export function useAnalyze() {
  return useMutation({
    mutationFn: (text: string) =>
      apiClient.post<TrustScoredDecision>("/api/v1/analyze", { text }),
  });
}

export function useAnalyzePdf() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiClient.postForm<TrustScoredDecision>("/api/v1/analyze/pdf", form);
    },
  });
}
