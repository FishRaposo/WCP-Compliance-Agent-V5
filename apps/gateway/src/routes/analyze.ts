import { Hono } from "hono";
import { z } from "zod";
import { agentClient } from "../clients/agent-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";
import { logUpstreamError } from "../lib/error-log.js";
import { config } from "../config.js";

export const analyzeRoutes = new Hono();

const AnalyzeRequest = z.object({
  text: z.string().min(1),
  job_id: z.string().optional(),
});

async function analyze(payload: z.infer<typeof AnalyzeRequest>, headers: Record<string, string>) {
  if (config.AGENT_SERVICE_TRANSPORT === "in-process") {
    const { runOfflineAgentPipeline } = await import("@wcp/agent/offline-composition");
    return runOfflineAgentPipeline(payload, headers);
  }
  return agentClient.post("/internal/workflows/wcp-pipeline", payload, headers);
}

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
    const decision = await analyze(parsed.data, getInternalHeaders(c));
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
