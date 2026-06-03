import { Hono } from "hono";
import { z } from "zod";
import { config } from "../config.js";
import { runWCPPipeline, runPipelineFromExtracted } from "../workflows/wcp-pipeline.js";
import { ExtractedWCPSchema } from "../types.js";

export const workflowRoutes = new Hono();

const PipelineRequest = z.object({
  text: z.string().min(1),
  job_id: z.string().optional(),
  prompt_version: z.string().optional(),
});

function getTraceHeaders(c: any): Record<string, string> {
  const requestId = c.req.header("x-request-id") || "";
  const traceId = c.req.header("x-trace-id") || requestId;
  if (!requestId && !traceId) return {};
  return {
    "x-request-id": requestId,
    "x-trace-id": traceId,
  };
}

/**
 * Middleware to verify internal service token.
 * If INTERNAL_SERVICE_TOKEN is not configured (dev mode), skip the check with a warning.
 */
async function verifyInternalToken(c: any, next: any) {
  // Skip validation in dev mode when token is not configured
  if (!config.INTERNAL_SERVICE_TOKEN) {
    console.warn(
      "INTERNAL_SERVICE_TOKEN not configured - skipping internal route authentication. " +
      "This is only acceptable in development."
    );
    return next();
  }

  const token = c.req.header("X-Internal-Token");
  if (!token) {
    return c.json({ error: "Missing X-Internal-Token header" }, 401);
  }

  if (token !== config.INTERNAL_SERVICE_TOKEN) {
    return c.json({ error: "Invalid internal service token" }, 403);
  }

  return next();
}

workflowRoutes.use("/*", verifyInternalToken);

workflowRoutes.post("/wcp-pipeline", async (c) => {
  const body = await c.req.json();
  const parsed = PipelineRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  try {
    const decision = await runWCPPipeline(parsed.data.text, parsed.data.prompt_version, getTraceHeaders(c));
    return c.json(decision, 200);
  } catch (err) {
    console.error("Pipeline failed:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      500,
    );
  }
});

workflowRoutes.post("/wcp-pipeline-from-extracted", async (c) => {
  const body = await c.req.json();
  const parsed = ExtractedWCPSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid extracted data", details: parsed.error.format() }, 400);
  }

  try {
    const decision = await runPipelineFromExtracted(parsed.data, undefined, getTraceHeaders(c));
    return c.json(decision, 200);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      500,
    );
  }
});

workflowRoutes.get("/:workflowId/status", async (c) => {
  const workflowId = c.req.param("workflowId");
  return c.json({ workflow_id: workflowId, status: "completed" });
});
