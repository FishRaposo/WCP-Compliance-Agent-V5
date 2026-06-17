import { Hono } from "hono";
import { z } from "zod";
import { agentClient } from "../clients/agent-client.js";
import { ServiceClientError } from "@wcp/typescript-client";
import { getInternalHeaders } from "../lib/request-headers.js";

export const analyzeRoutes = new Hono();

const AnalyzeRequest = z.object({
  text: z.string().min(1),
  job_id: z.string().optional(),
});

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
      return c.json({ error: err.message }, 502);
    }
    return c.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      500,
    );
  }
});
