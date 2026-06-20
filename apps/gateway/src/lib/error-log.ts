import type { Context } from "hono";

/**
 * Logs an upstream/internal error server-side without leaking the raw error
 * (which may contain the upstream response body) to the external client.
 *
 * Callers return a STABLE generic message to the client; the detail only ever
 * reaches the server logs, correlated by the inbound x-request-id.
 */
export function logUpstreamError(c: Context, route: string, err: unknown): void {
  const requestId = c.req.header("x-request-id") ?? "unknown";
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[gateway] upstream error route=${route} request-id=${requestId}: ${detail}`);
}
