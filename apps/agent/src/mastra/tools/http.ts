import { ServiceClient } from "@wcp/typescript-client";
import type { RequestContext } from "@mastra/core/request-context";
import { config } from "../../config.js";
import type {
  DeterministicReport,
  ExtractedWCP,
  TrustScoredDecision,
} from "../schemas.js";

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

export const SERVICE_TRANSPORT_KEY = "wcp.service-transport";

type OfflineTraceContext = {
  schema_version: "v1";
  request_id: string;
  trace_id?: string;
};

type OfflineAdapter<TPayload, TResult> = {
  call(request: {
    caller: "agent";
    payload: TPayload;
    trace_context: OfflineTraceContext;
  }): Promise<TResult>;
};

type OfflineDecisionStore = {
  persist(request: {
    caller: "agent";
    payload: TrustScoredDecision;
    trace_context: OfflineTraceContext;
  }): Promise<{ id: string }>;
};

export type InProcessAgentServices = {
  extract?: OfflineAdapter<{ text: string }, ExtractedWCP>;
  validate: OfflineAdapter<ExtractedWCP, DeterministicReport>;
  decisions: OfflineDecisionStore;
};

let inProcessServices: InProcessAgentServices | undefined;

/** Install explicit offline service adapters; returns a scoped cleanup function. */
export function installInProcessAgentServices(services: InProcessAgentServices): () => void {
  const previous = inProcessServices;
  inProcessServices = services;
  return () => {
    if (inProcessServices === services) inProcessServices = previous;
  };
}

function useInProcess(requestContext?: RequestContext): boolean {
  const selected = requestContext?.get(SERVICE_TRANSPORT_KEY) ?? config.AGENT_SERVICE_TRANSPORT;
  if (selected !== "in-process") return false;
  if (config.NODE_ENV === "production" || config.LLM_MODE !== "mock") {
    throw new Error("In-process service transport is allowed only in non-production mock mode");
  }
  if (!inProcessServices) {
    throw new Error("In-process service transport selected but no adapters are installed");
  }
  return true;
}

function offlineTraceContext(requestContext?: RequestContext): OfflineTraceContext {
  const headers = traceHeaders(requestContext);
  return {
    schema_version: "v1",
    request_id: headers["x-request-id"] || "offline-request",
    ...(headers["x-trace-id"] ? { trace_id: headers["x-trace-id"] } : {}),
  };
}

export async function extractWcp(
  input: { text: string },
  requestContext?: RequestContext,
): Promise<ExtractedWCP> {
  if (!useInProcess(requestContext)) {
    return complianceClient.post<ExtractedWCP>("/internal/extract", input, traceHeaders(requestContext));
  }
  if (!inProcessServices!.extract) {
    throw new Error("The installed in-process transport does not provide extraction");
  }
  return inProcessServices!.extract.call({
    caller: "agent",
    payload: input,
    trace_context: offlineTraceContext(requestContext),
  });
}

export async function validateWcp(
  input: unknown,
  requestContext?: RequestContext,
): Promise<DeterministicReport> {
  if (!useInProcess(requestContext)) {
    return complianceClient.post<DeterministicReport>("/internal/validate", input, traceHeaders(requestContext));
  }
  return inProcessServices!.validate.call({
    caller: "agent",
    payload: input as ExtractedWCP,
    trace_context: offlineTraceContext(requestContext),
  });
}

export async function persistDecision(
  input: unknown,
  requestContext?: RequestContext,
): Promise<{ id: string }> {
  if (!useInProcess(requestContext)) {
    return dataPlatformClient.post<{ id: string }>("/internal/decisions", input, traceHeaders(requestContext));
  }
  return inProcessServices!.decisions.persist({
    caller: "agent",
    payload: input as TrustScoredDecision,
    trace_context: offlineTraceContext(requestContext),
  });
}

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
