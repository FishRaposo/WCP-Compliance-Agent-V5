export interface TraceContext {
  request_id: string;
  trace_id?: string;
  tenant_id?: string;
  artifact_id?: string;
  workflow_id?: string;
  decision_id?: string;
}

export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

export function createTraceContext(overrides?: Partial<TraceContext>): TraceContext {
  return {
    request_id: crypto.randomUUID(),
    ...overrides,
  };
}

export function traceHeaders(ctx: TraceContext): Record<string, string> {
  const headers: Record<string, string> = {
    "x-request-id": ctx.request_id,
  };
  if (ctx.trace_id) headers["x-trace-id"] = ctx.trace_id;
  if (ctx.tenant_id) headers["x-tenant-id"] = ctx.tenant_id;
  return headers;
}

export const SPAN_NAMES = {
  GATEWAY_RECEIVE: "gateway.receive_upload",
  GATEWAY_VALIDATE: "gateway.validate_request",
  GATEWAY_FORWARD: "gateway.forward_workflow",
  AGENT_WORKFLOW_START: "agent.workflow.start",
  AGENT_TOOL_EXTRACT: "agent.tool.extract",
  COMPLIANCE_EXTRACT: "compliance.extract",
  AGENT_TOOL_VALIDATE: "agent.tool.validate",
  COMPLIANCE_VALIDATE: "compliance.validate",
  AGENT_TOOL_LOOKUP_RATE: "agent.tool.lookup_rate",
  COMPLIANCE_MATCH_DBWD: "compliance.match_dbwd_rate",
  AGENT_SYNTHESIZE: "agent.synthesize_verdict",
  DATA_CREATE_DECISION: "data.create_decision",
  DATA_CREATE_AUDIT: "data.create_audit_events",
  GATEWAY_STREAM: "gateway.stream_response",
} as const;
