import { describe, expect, it } from "vitest";

import {
  InMemoryDecisionStore,
  InProcessServiceAdapter,
  OfflineServiceError,
  type ServiceTraceContext,
} from "../offline-service-adapters.js";

const trace: ServiceTraceContext = {
  schema_version: "v1",
  request_id: "request-42",
  trace_id: "trace-42",
};

describe("in-process service adapters", () => {
  it("runs the Gateway -> Agent -> Compliance Core -> Data Platform chain offline", async () => {
    const dataPlatform = new InMemoryDecisionStore<{ job_id: string; verdict: string }>({
      service: "data-platform",
      allowedCallers: ["agent"],
    });
    const compliance = new InProcessServiceAdapter<string, { job_id: string; status: string }>({
      service: "compliance-core",
      operation: "validate",
      allowedCallers: ["agent"],
      idempotent: true,
      execute: async (text) => ({ job_id: "job-42", status: text.includes("fail") ? "fail" : "pass" }),
    });
    const agent = new InProcessServiceAdapter<string, { job_id: string; verdict: string; trace_context: ServiceTraceContext }>({
      service: "agent",
      operation: "pipeline",
      allowedCallers: ["gateway"],
      idempotent: true,
      execute: async (text, context) => {
        const report = await compliance.call({ caller: "agent", payload: text, trace_context: context });
        const decision = { job_id: report.job_id, verdict: report.status === "pass" ? "approved" : "rejected" };
        const persisted = await dataPlatform.persist({ caller: "agent", payload: decision, trace_context: context });
        return { ...persisted, trace_context: context };
      },
    });
    const gateway = new InProcessServiceAdapter<string, { job_id: string; verdict: string; trace_context: ServiceTraceContext }>({
      service: "gateway",
      operation: "analyze",
      allowedCallers: ["external"],
      idempotent: true,
      execute: (text, context) => agent.call({ caller: "gateway", payload: text, trace_context: context }),
    });

    await expect(gateway.call({ caller: "external", payload: "valid payroll", trace_context: trace })).resolves.toEqual({
      job_id: "job-42",
      verdict: "approved",
      trace_context: trace,
    });
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

  it("deduplicates persistence by job id without retrying an unsafe write", async () => {
    const store = new InMemoryDecisionStore<{ job_id: string; verdict: string }>({
      service: "data-platform",
      allowedCallers: ["agent"],
      max_attempts: 3,
    });
    const request = { caller: "agent" as const, payload: { job_id: "job-42", verdict: "approved" }, trace_context: trace };

    const first = await store.persist(request);
    const second = await store.persist(request);

    expect(second).toEqual(first);
    expect(store.size).toBe(1);
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
