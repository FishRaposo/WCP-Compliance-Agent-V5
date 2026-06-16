import { extractTool } from "../tools/extract.js";
import { validateTool } from "../tools/validate.js";
import { persistTool } from "../tools/persist.js";
import { runVerdictAgent } from "../agents/wcp-verdict.js";
import {
  computeTrustComponents,
  computeTrustScore,
  determineTrustBand,
  safeVerdict,
} from "../agents/trust-score.js";
import { computeCostUsd } from "../observability/cost-tracking.js";
import {
  createWorkflow,
  startStep,
  completeStep,
  completeWorkflow,
  failWorkflow,
} from "./registry.js";
import type { ExtractedWCP, TrustScoredDecision } from "../types.js";

const PIPELINE_STEPS = ["validate", "verdict", "trust", "persist"];

export async function runWCPPipeline(
  text: string,
  promptVersion?: string,
  traceHeaders?: Record<string, string>
): Promise<TrustScoredDecision> {
  const extracted = await extractTool(text, traceHeaders);
  return runPipelineFromExtracted(extracted, promptVersion, traceHeaders);
}

export async function runPipelineFromExtracted(
  extracted: ExtractedWCP,
  promptVersion?: string,
  traceHeaders?: Record<string, string>
): Promise<TrustScoredDecision> {
  const pipelineStart = Date.now();
  const jobId = extracted.job_id;

  createWorkflow(jobId, PIPELINE_STEPS);

  try {
    return await runTrackedPipeline(
      extracted,
      jobId,
      pipelineStart,
      promptVersion,
      traceHeaders
    );
  } catch (err) {
    failWorkflow(jobId, err instanceof Error ? err.message : "pipeline failed");
    throw err;
  }
}

async function runTrackedPipeline(
  extracted: ExtractedWCP,
  jobId: string,
  pipelineStart: number,
  promptVersion?: string,
  traceHeaders?: Record<string, string>
): Promise<TrustScoredDecision> {
  startStep(jobId, "validate");
  const validateStart = Date.now();
  const deterministic = await validateTool(extracted, traceHeaders);
  const validateEnd = Date.now();
  completeStep(jobId, "validate");

  startStep(jobId, "verdict");
  const verdictStart = Date.now();
  const llmVerdict = await runVerdictAgent(
    extracted,
    deterministic,
    promptVersion,
    traceHeaders
  );
  const verdictEnd = Date.now();
  completeStep(jobId, "verdict");

  startStep(jobId, "trust");
  const trustStart = Date.now();
  const components = computeTrustComponents(deterministic, llmVerdict);
  const trustScore = computeTrustScore(components);
  const trustBand = determineTrustBand(trustScore);
  const finalVerdict = safeVerdict(deterministic, llmVerdict);
  const requiresHumanReview = trustBand === "require_human_review";
  const trustEnd = Date.now();
  completeStep(jobId, "trust");

  const violationCount = deterministic.violation_count;
  const warningCount = deterministic.warning_count;
  const reasoningSummary =
    violationCount === 0 && warningCount === 0
      ? llmVerdict.reasoning
      : `${llmVerdict.reasoning} (Deterministic: ${violationCount} violation(s), ${warningCount} warning(s))`;

  const costUsd = llmVerdict.token_usage
    ? computeCostUsd(
        llmVerdict.model || "gpt-4o-mini",
        llmVerdict.token_usage.prompt_tokens,
        llmVerdict.token_usage.completion_tokens
      )
    : 0;

  const persistStart = Date.now();

  const decision: TrustScoredDecision = {
    job_id: jobId,
    verdict: finalVerdict,
    trust_score: trustScore,
    trust_band: trustBand,
    requires_human_review: requiresHumanReview,
    violation_count: violationCount,
    warning_count: warningCount,
    llm_confidence: llmVerdict.confidence,
    reasoning_summary: reasoningSummary,
    citations: llmVerdict.citations,
    cost_usd: costUsd,
    latency_ms: Date.now() - pipelineStart,
    step_latencies: {
      extract_ms: validateStart - pipelineStart,
      validate_ms: validateEnd - validateStart,
      verdict_ms: verdictEnd - verdictStart,
      trust_ms: trustEnd - trustStart,
      persist_ms: -1,
    },
    phoenix_trace_id: llmVerdict.langfuse_trace_id,
    created_at: new Date().toISOString(),
  };

  startStep(jobId, "persist");
  const { decision_id } = await persistTool(decision, traceHeaders);
  const persistEnd = Date.now();
  decision.step_latencies!.persist_ms = persistEnd - persistStart;
  completeStep(jobId, "persist");
  completeWorkflow(jobId, decision_id);

  return decision;
}
