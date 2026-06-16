import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import type { TrustScoredDecision } from "../types.js";

const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
});

export async function persistTool(decision: TrustScoredDecision, headers?: Record<string, string>): Promise<{ decision_id: string }> {
  // Forward the cross-service trace id as the query param the data-platform
  // stamps onto the DecisionRecord, the audit events, and the Redis event.
  const traceId = headers?.["x-trace-id"];
  const path = traceId
    ? `/internal/decisions?trace_id=${encodeURIComponent(traceId)}`
    : "/internal/decisions";
  return dataPlatformClient.post<{ decision_id: string }>(path, decision, headers);
}
