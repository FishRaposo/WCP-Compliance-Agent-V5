import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExtract = vi.fn();
const mockValidate = vi.fn();
const mockPersist = vi.fn();
const mockVerdict = vi.fn();

vi.mock("../../src/tools/extract.js", () => ({ extractTool: mockExtract }));
vi.mock("../../src/tools/validate.js", () => ({ validateTool: mockValidate }));
vi.mock("../../src/tools/persist.js", () => ({ persistTool: mockPersist }));
vi.mock("../../src/agents/wcp-verdict.js", () => ({ runVerdictAgent: mockVerdict }));

describe("wcp-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes full 5-step pipeline", async () => {
    const extracted = {
      job_id: "job-001",
      contractor: { name: "Test" },
      project: { name: "Test" },
      employees: [{
        name: "John", trade_classification: "Electrician",
        hours_worked: 40, overtime_hours: 0, hourly_wage: 55,
        fringe_benefits: 1400, gross_earnings: 2200,
        deductions: 150, net_wages: 2050,
      }],
    };

    mockValidate.mockResolvedValueOnce({
      job_id: "job-001",
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    });

    mockVerdict.mockResolvedValueOnce({
      job_id: "job-001",
      verdict: "approved",
      reasoning: "All checks passed",
      citations: [],
      confidence: 0.95,
      referenced_check_ids: [],
      rag_context_used: false,
      model: "gpt-4o-mini",
      prompt_version: "v1",
      langfuse_trace_id: "",
      token_usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });

    mockPersist.mockResolvedValueOnce({ decision_id: "dec-001" });

    const { runPipelineFromExtracted } = await import("../../src/workflows/wcp-pipeline.js");
    const result = await runPipelineFromExtracted(extracted as any, "v1", {});

    expect(result.job_id).toBe("job-001");
    expect(result.verdict).toBe("approved");
    expect(result.trust_score).toBeGreaterThan(0);
    expect(result.cost_usd).toBeGreaterThanOrEqual(0);
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("handles extraction failure gracefully", async () => {
    mockExtract.mockRejectedValueOnce(new Error("Extraction failed"));

    const { runWCPPipeline } = await import("../../src/workflows/wcp-pipeline.js");
    await expect(runWCPPipeline("bad text", "v1")).rejects.toThrow("Extraction failed");
  });

  it("propagates step latencies", async () => {
    mockValidate.mockResolvedValueOnce({
      job_id: "job-002",
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    });
    mockVerdict.mockResolvedValueOnce({
      job_id: "job-002",
      verdict: "approved",
      reasoning: "OK",
      citations: [],
      confidence: 0.9,
      referenced_check_ids: [],
      rag_context_used: false,
      model: "gpt-4o-mini",
      prompt_version: "v1",
      langfuse_trace_id: "",
    });
    mockPersist.mockResolvedValueOnce({ decision_id: "dec-002" });

    const { runPipelineFromExtracted } = await import("../../src/workflows/wcp-pipeline.js");
    const result = await runPipelineFromExtracted({
      job_id: "job-002",
      contractor: { name: "Test" },
      project: { name: "Test" },
      employees: [],
    } as any, "v1");

    expect(result.step_latencies).toBeDefined();
    expect(result.step_latencies!.validate_ms).toBeGreaterThanOrEqual(0);
    expect(result.step_latencies!.verdict_ms).toBeGreaterThanOrEqual(0);
    expect(result.step_latencies!.trust_ms).toBeGreaterThanOrEqual(0);
    expect(result.step_latencies!.persist_ms).toBeGreaterThanOrEqual(0);
  });

  it("safeVerdict overrides when violations exist", async () => {
    mockValidate.mockResolvedValueOnce({
      job_id: "job-003",
      checks: [{ check_id: "w1", status: "fail", message: "Violation" }],
      overall_status: "fail",
      violation_count: 1,
      warning_count: 0,
    });
    mockVerdict.mockResolvedValueOnce({
      job_id: "job-003",
      verdict: "approved",
      reasoning: "LLM says OK but there are violations",
      citations: [],
      confidence: 0.9,
      referenced_check_ids: [],
      rag_context_used: false,
      model: "gpt-4o-mini",
      prompt_version: "v1",
      langfuse_trace_id: "",
    });
    mockPersist.mockResolvedValueOnce({ decision_id: "dec-003" });

    const { runPipelineFromExtracted } = await import("../../src/workflows/wcp-pipeline.js");
    const result = await runPipelineFromExtracted({
      job_id: "job-003",
      contractor: { name: "Test" },
      project: { name: "Test" },
      employees: [],
    } as any, "v1");

    // safeVerdict should override to "rejected"
    expect(result.verdict).toBe("rejected");
  });
});
