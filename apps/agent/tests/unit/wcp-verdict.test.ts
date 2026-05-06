import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@wcp/typescript-client", () => ({
  ServiceClient: vi.fn(() => ({
    post: vi.fn().mockResolvedValue({ results: [], total: 0 }),
    get: vi.fn(),
  })),
  ServiceClientError: class extends Error {},
}));

vi.mock("../observability/tracing.js", () => ({
  createTrace: vi.fn().mockResolvedValue({ id: "mock-trace" }),
  logGeneration: vi.fn().mockResolvedValue(undefined),
}));

describe("wcp-verdict agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mock mode returns deterministic verdict for pass", async () => {
    // Force mock mode
    vi.doMock("../../src/config.js", () => ({
      isMockMode: true,
      config: { LLM_MODE: "mock" },
    }));

    const { runVerdictAgent } = await import("../../src/agents/wcp-verdict.js");
    const extracted = { job_id: "job-001", employees: [{ trade_classification: "Electrician" }] } as any;
    const deterministic = {
      job_id: "job-001",
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    } as any;

    const result = await runVerdictAgent(extracted, deterministic);
    expect(result.verdict).toBe("approved");
    expect(result.confidence).toBe(0.95);
    expect(result.model).toBe("mock");
  });

  it("mock mode returns rejected for fail", async () => {
    vi.doMock("../../src/config.js", () => ({
      isMockMode: true,
      config: { LLM_MODE: "mock" },
    }));

    const { runVerdictAgent } = await import("../../src/agents/wcp-verdict.js");
    const extracted = { job_id: "job-002", employees: [] } as any;
    const deterministic = {
      job_id: "job-002",
      checks: [
        { check_id: "w1", status: "fail", message: "Wage violation" },
      ],
      overall_status: "fail",
      violation_count: 1,
      warning_count: 0,
    } as any;

    const result = await runVerdictAgent(extracted, deterministic);
    expect(result.verdict).toBe("rejected");
    expect(result.confidence).toBe(0.85);
  });

  it("mock mode returns needs_review for warnings", async () => {
    vi.doMock("../../src/config.js", () => ({
      isMockMode: true,
      config: { LLM_MODE: "mock" },
    }));

    const { runVerdictAgent } = await import("../../src/agents/wcp-verdict.js");
    const extracted = { job_id: "job-003", employees: [] } as any;
    const deterministic = {
      job_id: "job-003",
      checks: [{ check_id: "w1", status: "warning", message: "OT warning" }],
      overall_status: "warnings",
      violation_count: 0,
      warning_count: 1,
    } as any;

    const result = await runVerdictAgent(extracted, deterministic);
    expect(result.verdict).toBe("needs_review");
    expect(result.confidence).toBe(0.75);
  });
});
