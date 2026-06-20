import { createWorkflow, createStep } from "@mastra/core/workflows";
import { noopObserve, isValidationError } from "@mastra/core/tools";
import type { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";

import {
  ExtractedWCPSchema,
  DeterministicReportSchema,
  LLMVerdictSchema,
  TrustScoredDecisionSchema,
  type DeterministicReport,
  type ExtractedWCP,
  type LLMVerdict,
  type TrustScoredDecision,
} from "../schemas.js";
import { extractTool } from "../tools/extract.tool.js";
import { validateTool } from "../tools/validate.tool.js";
import { persistTool } from "../tools/persist.tool.js";
import {
  buildReasoningSummary,
  computeTrustComponents,
  computeTrustScore,
  determineTrustBand,
  groundCitations,
  safeVerdict,
} from "../trust.js";
import { computeCostUsd } from "../cost.js";
import { memoryFor } from "../memory.js";
import { isMockMode } from "../../config.js";

/** requestContext keys used to thread per-run scalars + step timings. */
export const JOB_ID_KEY = "jobId";
export const START_KEY = "lat.start";

function num(rc: RequestContext, key: string): number {
  const v = rc.get(key);
  return typeof v === "number" ? v : 0;
}

/** A recorded step latency: the number if the step ran (including 0ms), else null. */
function latency(rc: RequestContext, key: string): number | null {
  return rc.has(key) ? num(rc, key) : null;
}

function markStart(rc: RequestContext): void {
  if (!rc.has(START_KEY)) rc.set(START_KEY, Date.now());
}

/** Call a createTool tool directly from a workflow step (validated input/output). */
async function callTool<T>(
  tool: { id: string; execute?: (input: any, ctx: any) => Promise<any> },
  input: unknown,
  requestContext: RequestContext,
): Promise<T> {
  if (!tool.execute) throw new Error(`Tool ${tool.id} has no execute`);
  const out = await tool.execute(input, { requestContext, observe: noopObserve });
  if (isValidationError(out)) throw new Error(`Tool ${tool.id} failed: ${out.message}`);
  return out as T;
}

/**
 * Deterministic verdict from the report alone (no LLM). Used in mock mode, as the
 * structured-output schema-validation fallback, AND as the degraded-mode fallback when the
 * LLM call itself fails (outage / bad key / timeout) so the pipeline still emits a sane,
 * deterministically-correct decision instead of failing the whole request.
 */
function mockVerdict(report: DeterministicReport): LLMVerdict {
  const ids = report.checks.map((c) => c.check_id);
  const referenced_check_ids = ids.length > 0 ? ids : ["deterministic"];
  if (report.overall_status === "pass") {
    return {
      verdict: "approved",
      reasoning: "All deterministic checks passed. No violations detected.",
      citations: [],
      confidence: 0.95,
      referenced_check_ids,
    };
  }
  if (report.overall_status === "fail") {
    const msgs = report.checks.filter((c) => c.status === "fail").map((c) => c.message);
    return {
      verdict: "rejected",
      reasoning: `Deterministic checks failed: ${msgs.join("; ")}`,
      citations: [],
      confidence: 0.85,
      referenced_check_ids,
    };
  }
  return {
    verdict: "needs_review",
    reasoning: `Warnings detected: ${report.warning_count} check(s) require human review.`,
    citations: [],
    confidence: 0.75,
    referenced_check_ids,
  };
}

function buildVerdictMessage(extracted: ExtractedWCP, report: DeterministicReport): string {
  return [
    "Review this WH-347 certified payroll for Davis-Bacon compliance.",
    "",
    "Extracted payroll:",
    JSON.stringify(extracted, null, 2),
    "",
    "Deterministic check results (authoritative):",
    JSON.stringify(report, null, 2),
  ].join("\n");
}

// ─────────────────────────────── steps ───────────────────────────────

const extractStep = createStep({
  id: "extract",
  inputSchema: z.object({ text: z.string().min(1) }),
  outputSchema: ExtractedWCPSchema,
  execute: async ({ inputData, requestContext }) => {
    markStart(requestContext);
    const t0 = Date.now();
    const extracted = await callTool<ExtractedWCP>(extractTool, { text: inputData.text }, requestContext);
    requestContext.set("lat.extract_ms", Date.now() - t0);
    const jobId = requestContext.get(JOB_ID_KEY);
    return typeof jobId === "string" && jobId ? { ...extracted, job_id: jobId } : extracted;
  },
});

const validateStep = createStep({
  id: "validate",
  inputSchema: ExtractedWCPSchema,
  outputSchema: z.object({ extracted: ExtractedWCPSchema, report: DeterministicReportSchema }),
  execute: async ({ inputData, requestContext }) => {
    markStart(requestContext);
    const t0 = Date.now();
    const report = await callTool<DeterministicReport>(validateTool, inputData, requestContext);
    requestContext.set("lat.validate_ms", Date.now() - t0);
    return { extracted: inputData, report };
  },
});

const VerdictStepOutput = z.object({
  extracted: ExtractedWCPSchema,
  report: DeterministicReportSchema,
  llm: LLMVerdictSchema,
  model_id: z.string(),
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
  trace_id: z.string().default(""),
});

const verdictStep = createStep({
  id: "verdict",
  inputSchema: z.object({ extracted: ExtractedWCPSchema, report: DeterministicReportSchema }),
  outputSchema: VerdictStepOutput,
  execute: async ({ inputData, requestContext, mastra }) => {
    const { extracted, report } = inputData;
    const t0 = Date.now();

    if (isMockMode) {
      requestContext.set("lat.verdict_ms", Date.now() - t0);
      return {
        extracted,
        report,
        llm: mockVerdict(report),
        model_id: "mock",
        input_tokens: 0,
        output_tokens: 0,
        trace_id: "",
      };
    }

    const agent = mastra!.getAgent("wcpVerdictAgent");
    try {
      const result = await agent.generate(buildVerdictMessage(extracted, report), {
        structuredOutput: {
          schema: LLMVerdictSchema,
          errorStrategy: "fallback",
          fallbackValue: mockVerdict(report),
        },
        requestContext,
        memory: memoryFor(extracted.contractor.name, extracted.job_id),
        modelSettings: { temperature: 0 },
        maxSteps: 4,
      });

      requestContext.set("lat.verdict_ms", Date.now() - t0);
      const modelId = (result.response as { modelId?: string })?.modelId ?? "unknown";
      return {
        extracted,
        report,
        llm: result.object,
        model_id: modelId,
        input_tokens: result.usage?.inputTokens ?? 0,
        output_tokens: result.usage?.outputTokens ?? 0,
        trace_id: result.traceId ?? "",
      };
    } catch (err) {
      // structuredOutput's fallbackValue only covers schema-validation failures, NOT a failed
      // model call (outage / bad key / timeout / exhausted fallback chain). The deterministic
      // report is already computed, so degrade to a deterministic verdict rather than 500 the
      // whole compliance decision because the explainer is unavailable.
      mastra!.getLogger?.()?.warn?.("verdict LLM call failed; using deterministic fallback", {
        error: err instanceof Error ? err.message : String(err),
        job_id: extracted.job_id,
      });
      requestContext.set("lat.verdict_ms", Date.now() - t0);
      return {
        extracted,
        report,
        llm: mockVerdict(report),
        model_id: "fallback",
        input_tokens: 0,
        output_tokens: 0,
        trace_id: "",
      };
    }
  },
});

const trustStep = createStep({
  id: "trust-score",
  inputSchema: VerdictStepOutput,
  outputSchema: TrustScoredDecisionSchema,
  execute: async ({ inputData, requestContext }) => {
    const t0 = Date.now();
    const { extracted, report, llm, model_id, input_tokens, output_tokens, trace_id } = inputData;

    const components = computeTrustComponents(report, llm);
    const trust_score = computeTrustScore(components);
    const trust_band = determineTrustBand(trust_score);
    const verdict = safeVerdict(report, llm);
    const requires_human_review = trust_band === "require_human_review";

    const reasoning_summary = buildReasoningSummary(report, llm, verdict);
    const citations = groundCitations(report, llm.citations);

    const cost_usd =
      input_tokens > 0 || output_tokens > 0 ? computeCostUsd(model_id, input_tokens, output_tokens) : 0;

    requestContext.set("lat.trust_ms", Date.now() - t0);

    const decision: TrustScoredDecision = {
      job_id: extracted.job_id,
      verdict,
      trust_score,
      trust_band,
      requires_human_review,
      violation_count: report.violation_count,
      warning_count: report.warning_count,
      llm_confidence: llm.confidence,
      reasoning_summary,
      citations,
      cost_usd,
      latency_ms: null,
      step_latencies: {
        extract_ms: latency(requestContext, "lat.extract_ms"),
        validate_ms: latency(requestContext, "lat.validate_ms"),
        verdict_ms: latency(requestContext, "lat.verdict_ms"),
        trust_ms: Date.now() - t0,
        persist_ms: null,
      },
      phoenix_trace_id: trace_id,
      created_at: new Date().toISOString(),
    };
    return decision;
  },
});

const persistStep = createStep({
  id: "persist",
  inputSchema: TrustScoredDecisionSchema,
  outputSchema: TrustScoredDecisionSchema,
  execute: async ({ inputData, requestContext }) => {
    const t0 = Date.now();
    await callTool<{ id: string }>(persistTool, inputData, requestContext);
    const persist_ms = Date.now() - t0;
    const start = num(requestContext, START_KEY) || t0;
    return {
      ...inputData,
      latency_ms: Date.now() - start,
      step_latencies: { ...inputData.step_latencies, persist_ms },
    };
  },
});

// ─────────────────────────────── workflows ───────────────────────────────

/** Full pipeline from raw WH-347 text. */
export const wcpPipeline = createWorkflow({
  id: "wcp-pipeline",
  inputSchema: z.object({ text: z.string().min(1) }),
  outputSchema: TrustScoredDecisionSchema,
})
  .then(extractStep)
  .then(validateStep)
  .then(verdictStep)
  .then(trustStep)
  .then(persistStep)
  .commit();

/** Pipeline starting from an already-extracted payroll (PDF path extracts upstream). */
export const wcpPipelineFromExtracted = createWorkflow({
  id: "wcp-pipeline-from-extracted",
  inputSchema: ExtractedWCPSchema,
  outputSchema: TrustScoredDecisionSchema,
})
  .then(validateStep)
  .then(verdictStep)
  .then(trustStep)
  .then(persistStep)
  .commit();
