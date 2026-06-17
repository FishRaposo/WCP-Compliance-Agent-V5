import type { Context } from "hono";
import { config } from "../config.js";

export function getTraceHeaders(c: Context): Record<string, string> {
  const requestId = c.req.header("x-request-id") ?? c.get("requestId") ?? crypto.randomUUID();
  const traceId = c.req.header("x-trace-id") ?? requestId;

  return {
    "x-request-id": requestId,
    "x-trace-id": traceId,
  };
}

export function getInternalHeaders(c: Context): Record<string, string> {
  return {
    ...getTraceHeaders(c),
    ...(config.INTERNAL_SERVICE_TOKEN
      ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
      : {}),
  };
}
