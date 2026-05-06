import { generateObject } from "ai";
import { z } from "zod";

import { isMockMode, config } from "../config.js";
import { promptRegistry } from "../prompts/registry.js";
import { searchTool } from "../tools/search.js";
import { createTrace, logGeneration } from "../observability/tracing.js";
import { computeCostUsd } from "../observability/cost-tracking.js";
import { llmRouter, type RoutingContext } from "../model-router/llm-router.js";
import type {
  DeterministicReport,
  ExtractedWCP,
  LLMVerdict,
} from "../types.js";

const LLMOutputSchema = z.object({
  verdict: z.enum(["approved", "rejected", "needs_review"]),
  reasoning: z.string(),
  citations: z.array(
    z.object({
      regulation: z.string(),
      section: z.string().default(""),
      text: z.string().default(""),
    })
  ),
  confidence: z.number().min(0).max(1),
  referenced_check_ids: z.array(z.string()).min(1),
});

type LLMOutput = z.infer<typeof LLMOutputSchema>;

function mockVerdict(
  jobId: string,
  deterministic: DeterministicReport
): LLMVerdict {
  const status = deterministic.overall_status;
  let verdict: LLMVerdict["verdict"];
  let confidence: number;
  let reasoning: string;

  if (status === "pass") {
    verdict = "approved";
    confidence = 0.95;
    reasoning = "All deterministic checks passed. No violations detected.";
  } else if (status === "fail") {
    verdict = "rejected";
    confidence = 0.85;
    const failMsgs = deterministic.checks
      .filter((c) => c.status === "fail")
      .map((c) => c.message);
    reasoning = `Deterministic checks failed: ${failMsgs.join("; ")}`;
  } else {
    verdict = "needs_review";
    confidence = 0.75;
    reasoning = `Warnings detected: ${deterministic.warning_count} check(s) raised warnings requiring human review.`;
  }

  return {
    job_id: jobId,
    verdict,
    reasoning,
    citations: [],
    confidence,
    referenced_check_ids: deterministic.checks.map((c) => c.check_id),
    rag_context_used: false,
    model: "mock",
    prompt_version: "mock",
    langfuse_trace_id: "",
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

async function buildRagContext(extracted: ExtractedWCP): Promise<string> {
  const trades = [
    ...new Set(extracted.employees.map((e) => e.trade_classification)),
  ];
  const locality = extracted.project.location || "Washington, DC";

  const queries = trades.map(
    (trade) => `Davis-Bacon prevailing wage rate ${trade} ${locality}`
  );

  const results = await Promise.all(
    queries.map((q) =>
      searchTool(q, undefined, locality).catch(() => [])
    )
  );

  const chunks = results.flat();
  if (chunks.length === 0) return "No RAG context retrieved.";

  return chunks
    .map((c, i: number) => `[${i + 1}] ${c.text || c.chunk_id || ""}`)
    .join("\n");
}

function interpolatePrompt(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function runVerdictAgent(
  extracted: ExtractedWCP,
  deterministic: DeterministicReport,
  promptVersion?: string
): Promise<LLMVerdict> {
  const jobId = extracted.job_id;

  if (isMockMode) {
    return mockVerdict(jobId, deterministic);
  }

  const startMs = Date.now();
  const trace = await createTrace(jobId, promptVersion ?? "v1");
  const traceId = trace.id;

  let ragContext: string;
  try {
    ragContext = await buildRagContext(extracted);
  } catch {
    ragContext = "RAG context unavailable.";
  }

  const prompt = await promptRegistry.getPrompt("wcp-verdict", promptVersion);
  const filledPrompt = interpolatePrompt(prompt.template, {
    extracted_wcp: JSON.stringify(extracted, null, 2),
    deterministic_report: JSON.stringify(deterministic, null, 2),
    rag_context: ragContext,
  });

  const routingContext: RoutingContext = {
    complianceCritical: deterministic.violation_count > 0,
  };

  const selectedConfig = llmRouter.selectProvider(routingContext);
  const model = llmRouter.createModel(selectedConfig);
  let output: LLMOutput;
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const activeModel = selectedConfig.model;

  try {
    const result = await generateObject({
      model,
      schema: LLMOutputSchema,
      prompt: filledPrompt,
    });

    output = result.object;
    usage = {
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
    };
  } catch {
    output = {
      verdict: "needs_review",
      reasoning: "LLM generation failed; decision requires human review.",
      citations: [],
      confidence: 0.0,
      referenced_check_ids: deterministic.checks.map((c) => c.check_id),
    };
  }

  try {
    await logGeneration(
      traceId,
      filledPrompt,
      JSON.stringify(output),
      activeModel,
      { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }
    );
  } catch {}

  const latencyMs = Date.now() - startMs;
  const costUsd = computeCostUsd(
    activeModel,
    usage.promptTokens,
    usage.completionTokens
  );

  return {
    job_id: jobId,
    verdict: output.verdict,
    reasoning: output.reasoning,
    citations: output.citations,
    confidence: output.confidence,
    referenced_check_ids: output.referenced_check_ids,
    rag_context_used: ragContext.length > 0 && !ragContext.startsWith("No RAG"),
    model: activeModel,
    prompt_version: promptVersion ?? "v1",
    langfuse_trace_id: traceId,
    token_usage: {
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
    },
  };
}
