import { Hono } from "hono";
import { ReviewRequest } from "@wcp/contracts";
import { dataPlatformClient } from "../clients/data-platform-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";
import { logUpstreamError } from "../lib/error-log.js";

export const decisionsRoutes = new Hono();

decisionsRoutes.get("/api/v1/decisions", async (c) => {
  const params: Record<string, string> = {};
  const limit = c.req.query("limit");
  const offset = c.req.query("offset");
  const verdict = c.req.query("verdict");
  const trust_band = c.req.query("trust_band");
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  if (verdict) params.verdict = verdict;
  if (trust_band) params.trust_band = trust_band;

  try {
    const query = new URLSearchParams(params).toString();
    const path = query ? `/internal/decisions?${query}` : "/internal/decisions";
    const data = await dataPlatformClient.get<unknown[]>(path, getInternalHeaders(c));
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "decisions/list", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "decisions/list", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

decisionsRoutes.get("/api/v1/decisions/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const data = await dataPlatformClient.get<unknown>(
      `/internal/decisions/${encodeURIComponent(id)}`,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "decisions/get", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "decisions/get", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Human-review override: an auditor's verdict is persisted by the Data Platform (the only
// DB writer), which records a human_review_complete audit event atomically.
decisionsRoutes.post("/api/v1/decisions/:id/review", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (body === null) return c.json({ error: "Invalid JSON body" }, 400);
  const parsed = ReviewRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid review payload", details: parsed.error.format() }, 400);
  }

  try {
    const data = await dataPlatformClient.post<unknown>(
      `/internal/decisions/${encodeURIComponent(id)}/override`,
      parsed.data,
      getInternalHeaders(c),
    );
    return c.json(data, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "decisions/review", err);
      // Preserve a meaningful 404 (decision not found) instead of masking it as 502.
      if (err.statusCode === 404) return c.json({ error: "Decision not found" }, 404);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "decisions/review", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
