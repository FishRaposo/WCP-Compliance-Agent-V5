import { Hono } from "hono";
import { z } from "zod";
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
