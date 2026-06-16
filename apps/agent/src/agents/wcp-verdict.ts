import { z } from "zod";

import { isMockMode, config } from "../config.js";
import { promptRegistry } from "../prompts/registry.js";
import { searchTool, type SearchResult } from "../tools/search.js";
import { createTrace, logGeneration } from "../observability/tracing.js";
import { computeCostUsd } from "../observability/cost-tracking.js";
import { llmRouter, type RoutingContext } from "../model-router/llm-router.js";
import type {
  Citation,
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
    // Mock mode still emits real, grounded citations from the deterministic
    // report so the offline demo is fully traceable.
    citations: deterministic.citations ?? [],
    confidence,
    referenced_check_ids: deterministic.checks.map((c) => c.check_id),
    rag_context_used: false,
    model: "mock",
    prompt_version: "mock",
    langfuse_trace_id: "",
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

async function retrieveRagChunks(
  extracted: ExtractedWCP,
  headers?: Record<string, string>
): Promise<SearchResult[]> {
  const trades = [
    ...new Set(extracted.employees.map((e) => e.trade_classification)),
  ];
  const locality = extracted.project.location || "Washington, DC";

  const queries = trades.map(
    (trade) => `Davis-Bacon prevailing wage rate ${trade} ${locality}`
  );

  const results = await Promise.all(
    queries.map((q) =>
      searchTool(q, undefined, locality, headers).catch(() => [])
    )
  );

  return results.flat();
}

function buildRagContextText(chunks: SearchResult[]): string {
  if (chunks.length === 0) return "No RAG context retrieved.";
  return chunks
    .map((c, i: number) => `[${i + 1}] ${c.text || c.chunk_id || ""}`)
    .join("\n");
}

/**
 * Ground the LLM's citations against authoritative sources. Deterministic
 * report citations (already grounded against the regulation corpus) are always
 * included so no required citation is lost; LLM-surfaced citations are kept and
 * enriched with retrieved regulation text when the model omitted it.
 */
function groundCitations(
  llmCitations: Citation[],
  deterministic: DeterministicReport,
  ragChunks: SearchResult[]
): Citation[] {
  const result: Citation[] = [];
  const seen = new Set<string>();

  const add = (c: Citation): void => {
    const key = `${c.regulation}|${c.section}`.toLowerCase().trim();
    if (!c.regulation || seen.has(key)) return;
    seen.add(key);
    result.push(c);
  };

  for (const c of deterministic.citations ?? []) add(c);

  for (const c of llmCitations) {
    let text = c.text;
    if (!text) {
      const needle = (c.section || c.regulation).toLowerCase();
      const match = ragChunks.find((r) =>
        (r.text || "").toLowerCase().includes(needle)
      );
      text = match?.text ?? "";
    }
    add({ regulation: c.regulation, section: c.section, text });
  }

  return result;
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
  promptVersion?: string,
  traceHeaders?: Record<string, string>
): Promise<LLMVerdict> {
  const jobId = extracted.job_id;

  if (isMockMode) {
    return mockVerdict(jobId, deterministic);
  }

  const startMs = Date.now();
  const trace = await createTrace(jobId, promptVersion ?? "v1");
  const traceId = trace.id;

  let ragChunks: SearchResult[] = [];
  let ragContext: string;
  try {
    ragChunks = await retrieveRagChunks(extracted, traceHeaders);
    ragContext = buildRagContextText(ragChunks);
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

  let output: LLMOutput;
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let activeModel = llmRouter.selectProvider(routingContext).model;

  try {
    // Generate with provider fallback: a single provider outage degrades to a
    // fallback model rather than an immediate needs_review.
    const result = await llmRouter.generateObjectWithFallback(
      LLMOutputSchema,
      filledPrompt,
      routingContext
    );
    output = result.object;
    usage = result.usage;
    activeModel = result.model;
  } catch {
    output = {
      verdict: "needs_review",
      reasoning: "LLM generation failed across all providers; decision requires human review.",
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
    citations: groundCitations(output.citations, deterministic, ragChunks),
    confidence: output.confidence,
    referenced_check_ids: output.referenced_check_ids,
    rag_context_used: ragChunks.length > 0,
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
