import { ServiceClient } from "@wcp/typescript-client";
import type { RequestContext } from "@mastra/core/request-context";
import { config } from "../../config.js";

/**
 * Shared HTTP clients + trace propagation for the agent's tools.
 *
 * Every tool wraps an internal service call (compliance-core / data-platform). The agent
 * never touches a database directly — it only calls these services. Trace headers
 * (x-request-id / x-trace-id) ride along on the Mastra `requestContext` and are forwarded
 * on every hop so a decision is traceable end-to-end.
 */

const internalHeaders: Record<string, string> = config.INTERNAL_SERVICE_TOKEN
  ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
  : {};

export const complianceClient = new ServiceClient({
  baseUrl: config.COMPLIANCE_CORE_URL,
  headers: internalHeaders,
});

export const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
  headers: internalHeaders,
});

const TRACE_KEYS = ["x-request-id", "x-trace-id"] as const;

/** Extract trace headers from the Mastra requestContext to forward to internal services. */
export function traceHeaders(requestContext?: RequestContext): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!requestContext) return headers;
  for (const key of TRACE_KEYS) {
    const value = requestContext.get(key);
    if (typeof value === "string" && value.length > 0) {
      headers[key] = value;
    }
  }
  return headers;
}
