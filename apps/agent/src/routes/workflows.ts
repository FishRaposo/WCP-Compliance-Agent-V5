import { Hono, type Context, type Next } from "hono";
import { timingSafeEqual } from "node:crypto";
import { RequestContext } from "@mastra/core/request-context";

import { config } from "../config.js";
import { mastra } from "../mastra/index.js";
import { JOB_ID_KEY } from "../mastra/workflows/wcp-pipeline.js";
import { PROMPT_VERSION_KEY } from "../mastra/agents/verdict-agent.js";
import { ROUTING_MODE_KEY } from "../mastra/model-router.js";
import { reviewResumeSchema } from "../mastra/workflows/human-review.js";
import {
  ExtractedWCPSchema,
  PipelineRequestSchema,
  TrustScoredDecisionSchema,
} from "../mastra/schemas.js";

export const workflowRoutes = new Hono();

/** Parse a JSON body, returning null (not throwing) on malformed input so handlers can 400. */
async function readJsonBody(c: Context): Promise<unknown | null> {
  return c.req.json().catch(() => null);
}

/** Build a RequestContext seeded with trace headers + per-run scalars for the Mastra run. */
function buildRequestContext(c: Context, extras: Record<string, unknown> = {}): RequestContext {
  const requestId = c.req.header("x-request-id") || "";
  const traceId = c.req.header("x-trace-id") || requestId;
  const rc = new RequestContext();
  if (requestId) rc.set("x-request-id", requestId);
  if (traceId) rc.set("x-trace-id", traceId);
  rc.set(ROUTING_MODE_KEY, "compliance");
  for (const [k, v] of Object.entries(extras)) {
    if (v !== undefined && v !== null) rc.set(k, v);
  }
  return rc;
}

/**
 * Verify the internal service token with a constant-time comparison. When the token is unset,
 * the check is skipped ONLY in development/test (with a warning); any other environment fails
 * closed rather than serving an open internal API.
 */
async function verifyInternalToken(c: Context, next: Next) {
  if (!config.INTERNAL_SERVICE_TOKEN) {
    if (config.NODE_ENV === "development" || config.NODE_ENV === "test") {
      console.warn(
        "INTERNAL_SERVICE_TOKEN not configured - skipping internal auth (dev/test only).",
      );
      return next();
    }
    return c.json({ error: "INTERNAL_SERVICE_TOKEN is not configured" }, 500);
  }

  const token = c.req.header("X-Internal-Token");
  if (!token) return c.json({ error: "Missing X-Internal-Token header" }, 401);

  const presented = Buffer.from(token);
  const expected = Buffer.from(config.INTERNAL_SERVICE_TOKEN);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return c.json({ error: "Invalid internal service token" }, 403);
  }
  return next();
}

workflowRoutes.use("/*", verifyInternalToken);

/** POST /internal/workflows/wcp-pipeline — full pipeline from raw WH-347 text. */
workflowRoutes.post("/wcp-pipeline", async (c) => {
  const body = await readJsonBody(c);
  if (body === null) return c.json({ error: "Invalid JSON body" }, 400);
  const parsed = PipelineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  const jobId = parsed.data.job_id ?? crypto.randomUUID();
  const requestContext = buildRequestContext(c, {
    [JOB_ID_KEY]: jobId,
    [PROMPT_VERSION_KEY]: parsed.data.prompt_version,
  });

  try {
    const run = await mastra.getWorkflow("wcpPipeline").createRun();
    const result = await run.start({ inputData: { text: parsed.data.text }, requestContext });
    if (result.status === "success") return c.json(result.result, 200);
    const message = result.status === "failed" ? result.error?.message : `Pipeline ${result.status}`;
    return c.json({ error: message ?? "Pipeline failed" }, 500);
  } catch (err) {
    console.error("Pipeline failed:", err);
    return c.json({ error: err instanceof Error ? err.message : "Pipeline failed" }, 500);
  }
});

/** POST /internal/workflows/wcp-pipeline-from-extracted — pipeline from an extracted payroll. */
workflowRoutes.post("/wcp-pipeline-from-extracted", async (c) => {
  const body = await readJsonBody(c);
  if (body === null) return c.json({ error: "Invalid JSON body" }, 400);
  const parsed = ExtractedWCPSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid extracted data", details: parsed.error.format() }, 400);
  }

  const requestContext = buildRequestContext(c, { [JOB_ID_KEY]: parsed.data.job_id });

  try {
    const run = await mastra.getWorkflow("wcpPipelineFromExtracted").createRun();
    const result = await run.start({ inputData: parsed.data, requestContext });
    if (result.status === "success") return c.json(result.result, 200);
    const message = result.status === "failed" ? result.error?.message : `Pipeline ${result.status}`;
    return c.json({ error: message ?? "Pipeline failed" }, 500);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Pipeline failed" }, 500);
  }
});

/** GET /internal/workflows/:workflowId/status — back-compat status stub. */
workflowRoutes.get("/:workflowId/status", async (c) => {
  const workflowId = c.req.param("workflowId");
  return c.json({ workflow_id: workflowId, status: "completed" });
});

/**
 * POST /internal/workflows/human-review/start — opt-in human-in-the-loop review.
 * Suspends when the decision needs a human; returns the run id + suspend payload.
 */
workflowRoutes.post("/human-review/start", async (c) => {
  const body = await readJsonBody(c);
  if (body === null) return c.json({ error: "Invalid JSON body" }, 400);
  const parsed = TrustScoredDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid decision", details: parsed.error.format() }, 400);
  }
  const requestContext = buildRequestContext(c);
  try {
    const run = await mastra.getWorkflow("humanReviewWorkflow").createRun();
    const result = await run.start({ inputData: parsed.data, requestContext });
    if (result.status === "suspended") {
      return c.json({ run_id: run.runId, status: "suspended", suspend: result.suspendPayload }, 202);
    }
    if (result.status === "success") {
      return c.json({ run_id: run.runId, status: "completed", decision: result.result }, 200);
    }
    return c.json({ error: `Review ${result.status}` }, 500);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Review failed" }, 500);
  }
});

/** POST /internal/workflows/human-review/:runId/resume — apply a reviewer's verdict. */
workflowRoutes.post("/human-review/:runId/resume", async (c) => {
  const runId = c.req.param("runId");
  const body = await readJsonBody(c);
  if (body === null) return c.json({ error: "Invalid JSON body" }, 400);
  const parsed = reviewResumeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid review payload", details: parsed.error.format() }, 400);
  }
  const requestContext = buildRequestContext(c);
  try {
    const run = await mastra.getWorkflow("humanReviewWorkflow").createRun({ runId });
    const result = await run.resume({ step: "human-review", resumeData: parsed.data, requestContext });
    if (result.status === "success") {
      return c.json({ run_id: runId, status: "completed", decision: result.result }, 200);
    }
    return c.json({ error: `Review ${result.status}` }, 500);
  } catch (err) {
    // The most common resume failure is a missing/expired run snapshot (e.g. after a restart,
    // since mock/test workflow storage is in-memory). Surface that as 404 rather than 500.
    const message = err instanceof Error ? err.message : "Resume failed";
    const notFound = /not found|no .*snapshot|does not exist/i.test(message);
    return c.json({ error: message }, notFound ? 404 : 500);
  }
});
