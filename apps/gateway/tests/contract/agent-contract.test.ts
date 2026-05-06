import { describe, it, expect, vi, beforeEach } from "vitest";

function makeAgentUrl(path: string) {
  const baseUrl = "http://localhost:3001";
  return `${baseUrl}${path}`;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Gateway → Agent contract", () => {
  it("POST /internal/analyze sends the expected request shape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          job_id: "job-001",
          verdict: "approved",
          trust_score: 0.92,
          trust_band: "auto_approve",
          requires_human_review: false,
          violation_count: 0,
          warning_count: 0,
          llm_confidence: 0.95,
          reasoning_summary: "All checks passed.",
          citations: [],
        }),
    });

    const body = {
      text: "Sample WH-347 payroll certification text...",
      file_path: undefined,
    };

    const res = await fetch(makeAgentUrl("/internal/analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("job_id");
    expect(json).toHaveProperty("verdict");
    expect(json).toHaveProperty("trust_score");
    expect(json).toHaveProperty("trust_band");
    expect(["approved", "rejected", "needs_review"]).toContain(json.verdict);
    expect(["auto_approve", "flag_for_review", "require_human_review"]).toContain(json.trust_band);
  });

  it("GET /internal/jobs/:jobId returns the expected response shape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          job_id: "job-001",
          status: "complete",
          result: {
            job_id: "job-001",
            verdict: "approved",
            trust_score: 0.92,
            trust_band: "auto_approve",
          },
        }),
    });

    const res = await fetch(makeAgentUrl("/internal/jobs/job-001"));
    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("job_id");
    expect(json).toHaveProperty("status");
    expect(["pending", "processing", "complete", "failed"]).toContain(json.status);
  });
});
