import { describe, expect, it } from "vitest";

import {
  InMemoryDecisionStore,
  InProcessServiceAdapter,
  OfflineServiceError,
  type ServiceTraceContext,
} from "../offline-service-adapters.js";
import {
  computeTrustComponents,
  computeTrustScore,
  determineTrustBand,
  safeVerdict,
} from "../../../apps/agent/src/mastra/trust.js";
import type {
  DeterministicReport,
  LLMVerdict,
  TrustScoredDecision,
} from "../../../apps/agent/src/mastra/schemas.js";

const trace: ServiceTraceContext = {
  schema_version: "v1",
  request_id: "request-42",
  trace_id: "trace-42",
};

describe("in-process service adapters", () => {
  it("runs the Gateway -> Agent -> Compliance Core -> Data Platform chain offline", async () => {
    const dataPlatform = new InMemoryDecisionStore({
      service: "data-platform",
      allowedCallers: ["agent"],
    });
    const compliance = new InProcessServiceAdapter<{ job_id: string }, DeterministicReport>({
      service: "compliance-core",
      operation: "validate",
      allowedCallers: ["agent"],
      idempotent: true,
      execute: async ({ job_id }) => ({
        job_id,
        checks: [
          {
            check_id: "signature-warning",
            check_type: "signature",
            employee_name: "",
            status: "warning",
            message: "Certification signature requires review.",
          },
        ],
        overall_status: "warnings",
        violation_count: 0,
        warning_count: 1,
      }),
    });
    const agent = new InProcessServiceAdapter<
      { job_id: string },
      { decision: Awaited<ReturnType<typeof dataPlatform.persist>>; trace_context: ServiceTraceContext }
    >({
      service: "agent",
      operation: "pipeline",
      allowedCallers: ["gateway"],
      idempotent: true,
      execute: async (payload, context) => {
        const report = await compliance.call({ caller: "agent", payload, trace_context: context });
        const llm: LLMVerdict = {
          verdict: "needs_review",
          reasoning: "A certification warning needs human review.",
          citations: [],
          confidence: 0.75,
          referenced_check_ids: ["signature-warning"],
        };
        const trust_score = computeTrustScore(computeTrustComponents(report, llm));
        const trust_band = determineTrustBand(trust_score);
        const decision: TrustScoredDecision = {
          job_id: report.job_id,
          verdict: safeVerdict(report, llm),
          trust_score,
          trust_band,
          requires_human_review: trust_band === "require_human_review",
          violation_count: report.violation_count,
          warning_count: report.warning_count,
          llm_confidence: llm.confidence,
          reasoning_summary: llm.reasoning,
          citations: llm.citations,
        };
        const persisted = await dataPlatform.persist({ caller: "agent", payload: decision, trace_context: context });
        return { decision: persisted, trace_context: context };
      },
    });
    const gateway = new InProcessServiceAdapter<
      { job_id: string },
      { decision: Awaited<ReturnType<typeof dataPlatform.persist>>; trace_context: ServiceTraceContext }
    >({
      service: "gateway",
      operation: "analyze",
      allowedCallers: ["external"],
      idempotent: true,
      execute: (payload, context) => agent.call({ caller: "gateway", payload, trace_context: context }),
    });

    const result = await gateway.call({ caller: "external", payload: { job_id: "job-42" }, trace_context: trace });

    expect(result.trace_context).toEqual(trace);
    expect(result.decision).toMatchObject({
      id: expect.any(String),
      job_id: "job-42",
      verdict: "needs_review",
      trust_band: "flag_for_review",
      warning_count: 1,
    });
    expect(result.decision.trust_score).toBeCloseTo(0.8375);
    expect(dataPlatform.getAuditEvents("job-42")).toEqual([
      expect.objectContaining({
        job_id: "job-42",
        event_type: "decision_persisted",
        actor: "agent",
        trace_id: "trace-42",
      }),
    ]);
  });

  it("returns additive timeout metadata without changing the upstream result contract", async () => {
    const adapter = new InProcessServiceAdapter<string, string>({
      service: "compliance-core",
      operation: "validate",
      allowedCallers: ["agent"],
      idempotent: true,
      timeout_ms: 5,
      execute: () => new Promise(() => undefined),
    });

    await expect(adapter.call({ caller: "agent", payload: "payroll", trace_context: trace })).rejects.toMatchObject({
      metadata: {
        code: "timeout",
        service: "compliance-core",
        operation: "validate",
        attempts: 1,
        timeout_ms: 5,
        trace_context: trace,
      },
    });
  });

  it("exhausts a bounded retry budget only for idempotent calls", async () => {
    let attempts = 0;
    const adapter = new InProcessServiceAdapter<string, string>({
      service: "compliance-core",
      operation: "validate",
      allowedCallers: ["agent"],
      idempotent: true,
      max_attempts: 3,
      execute: async () => {
        attempts += 1;
        throw new Error("temporarily unavailable");
      },
    });

    await expect(adapter.call({ caller: "agent", payload: "payroll", trace_context: trace })).rejects.toMatchObject({
      metadata: { code: "retry_exhausted", attempts: 3, trace_context: trace },
    });
    expect(attempts).toBe(3);
  });

  it("preserves timeout as the primary error code when timeout retries exhaust", async () => {
    let attempts = 0;
    const adapter = new InProcessServiceAdapter<string, string>({
      service: "compliance-core",
      operation: "validate",
      allowedCallers: ["agent"],
      idempotent: true,
      timeout_ms: 5,
      max_attempts: 3,
      execute: () => {
        attempts += 1;
        return new Promise(() => undefined);
      },
    });

    await expect(adapter.call({ caller: "agent", payload: "payroll", trace_context: trace })).rejects.toMatchObject({
      metadata: { code: "timeout", attempts: 3, trace_context: trace },
    });
    expect(attempts).toBe(3);
  });

  it("upserts TrustScoredDecision by job id and emits Data Platform audit events", async () => {
    const store = new InMemoryDecisionStore({
      service: "data-platform",
      allowedCallers: ["agent"],
      max_attempts: 3,
    });
    const firstDecision: TrustScoredDecision = {
      job_id: "job-42",
      verdict: "approved",
      trust_score: 0.95,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      llm_confidence: 0.95,
      reasoning_summary: "All checks passed.",
      citations: [],
    };
    const secondDecision: TrustScoredDecision = {
      ...firstDecision,
      verdict: "needs_review",
      trust_score: 0.55,
      trust_band: "require_human_review",
      requires_human_review: true,
      warning_count: 1,
      reasoning_summary: "Certification requires review.",
    };

    const first = await store.persist({ caller: "agent", payload: firstDecision, trace_context: trace });
    const second = await store.persist({ caller: "agent", payload: secondDecision, trace_context: trace });

    expect(first).toMatchObject({ id: expect.any(String), job_id: "job-42", verdict: "approved" });
    expect(second).toMatchObject({
      id: first.id,
      job_id: "job-42",
      verdict: "needs_review",
      trust_score: 0.55,
      warning_count: 1,
      reasoning_summary: "Certification requires review.",
    });
    expect(store.size).toBe(1);
    expect(store.getAuditEvents("job-42").map((event) => event.event_type)).toEqual([
      "decision_persisted",
      "decision_persisted",
      "human_review_queued",
    ]);
  });

  it("rejects calls that bypass the declared service boundary", async () => {
    const adapter = new InProcessServiceAdapter<string, string>({
      service: "data-platform",
      operation: "persist",
      allowedCallers: ["agent"],
      execute: async (value) => value,
    });

    await expect(adapter.call({ caller: "gateway", payload: "decision", trace_context: trace })).rejects.toBeInstanceOf(OfflineServiceError);
    await expect(adapter.call({ caller: "gateway", payload: "decision", trace_context: trace })).rejects.toMatchObject({
      metadata: { code: "boundary_violation", service: "data-platform", trace_context: trace },
    });
  });
});
