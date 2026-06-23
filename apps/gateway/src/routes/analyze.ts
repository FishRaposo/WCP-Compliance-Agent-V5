import { Hono } from "hono";
import { AnalyzeRequest } from "@wcp/contracts";
import { agentClient } from "../clients/agent-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";
import { logUpstreamError } from "../lib/error-log.js";

export const analyzeRoutes = new Hono();

analyzeRoutes.post("/api/v1/analyze", async (c) => {
  const body = await c.req.json();
  const parsed = AnalyzeRequest.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.format() },
      400,
    );
  }

  try {
    const decision = await agentClient.post(
      "/internal/workflows/wcp-pipeline",
      parsed.data,
      getInternalHeaders(c),
    );
    return c.json(decision, 200);
  } catch (err) {
    if (err instanceof ServiceClientError) {
      logUpstreamError(c, "analyze", err);
      return c.json({ error: "Upstream service error" }, 502);
    }
    logUpstreamError(c, "analyze", err);
    return c.json({ error: "Internal error" }, 500);
  }
});
