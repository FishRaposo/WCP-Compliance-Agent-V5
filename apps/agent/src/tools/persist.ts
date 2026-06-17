import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import type { TrustScoredDecision } from "../types.js";

const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
  headers: config.INTERNAL_SERVICE_TOKEN
    ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
    : {},
});

export async function persistTool(decision: TrustScoredDecision, headers?: Record<string, string>): Promise<{ decision_id: string }> {
  return dataPlatformClient.post<{ decision_id: string }>("/internal/decisions", decision, headers);
}
