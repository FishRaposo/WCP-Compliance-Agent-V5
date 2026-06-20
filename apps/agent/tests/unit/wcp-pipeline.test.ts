import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("@wcp/typescript-client", () => ({
  ServiceClient: vi.fn().mockImplementation(() => ({ post: mockPost, get: mockGet })),
  ServiceClientError: class extends Error {
    constructor(
      public service: string,
      public statusCode: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { RequestContext } from "@mastra/core/request-context";

const extracted = {
  job_id: "job-001",
  contractor: { name: "Test Contractor" },
  project: { name: "Test Project" },
  employees: [
    {
      name: "John",
      trade_classification: "Electrician",
      hours_worked: 40,
      overtime_hours: 0,
      hourly_wage: 55,
      fringe_benefits: 1400,
      gross_earnings: 2200,
      deductions: 150,
      net_wages: 2050,
    },
  ],
};

function routeMocks(report: Record<string, unknown>) {
  mockPost.mockImplementation((path: string) => {
    if (path === "/internal/extract") return Promise.resolve(extracted);
    if (path === "/internal/validate") return Promise.resolve(report);
    if (path === "/internal/decisions") return Promise.resolve({ id: "dec-001" });
    return Promise.resolve({});
  });
}

const passReport = {
  job_id: "job-001",
  checks: [],
  overall_status: "pass",
  violation_count: 0,
  warning_count: 0,
};

const failReport = {
  job_id: "job-002",
  checks: [
    {
      check_id: "w1",
      check_type: "wage_rate",
      employee_name: "John",
      status: "fail",
      message: "Wage below prevailing rate",
    },
  ],
  overall_status: "fail",
  violation_count: 1,
  warning_count: 0,
};

describe("wcp pipeline (Mastra workflow, mock mode)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs from-extracted to a contract-shaped TrustScoredDecision", async () => {
    routeMocks(passReport);
    const { mastra } = await import("../../src/mastra/index.js");
    const run = await mastra.getWorkflow("wcpPipelineFromExtracted").createRun();
    const result = await run.start({ inputData: extracted, requestContext: new RequestContext() });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    const decision = result.result;
    expect(decision.job_id).toBe("job-001");
    expect(decision.verdict).toBe("approved");
    expect(decision.trust_band).toBe("auto_approve");
    expect(decision.trust_score).toBeGreaterThan(0);
    expect(decision.latency_ms).toBeGreaterThanOrEqual(0);
    expect(decision.step_latencies?.validate_ms).toBeGreaterThanOrEqual(0);
    expect(decision.step_latencies?.verdict_ms).toBeGreaterThanOrEqual(0);
    expect(decision.step_latencies?.trust_ms).toBeGreaterThanOrEqual(0);
    expect(decision.step_latencies?.persist_ms).toBeGreaterThanOrEqual(0);
  });

  it("rejects when deterministic violations exist", async () => {
    routeMocks(failReport);
    const { mastra } = await import("../../src/mastra/index.js");
    const run = await mastra.getWorkflow("wcpPipelineFromExtracted").createRun();
    const result = await run.start({
      inputData: { ...extracted, job_id: "job-002" },
      requestContext: new RequestContext(),
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.verdict).toBe("rejected");
    expect(result.result.violation_count).toBe(1);
  });

  it("runs the full text pipeline (extract -> validate -> verdict -> trust -> persist)", async () => {
    routeMocks(passReport);
    const { mastra } = await import("../../src/mastra/index.js");
    const requestContext = new RequestContext();
    requestContext.set("jobId", "job-001");
    const run = await mastra.getWorkflow("wcpPipeline").createRun();
    const result = await run.start({ inputData: { text: "Contractor: Test ..." }, requestContext });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.result.verdict).toBe("approved");
  });
});
