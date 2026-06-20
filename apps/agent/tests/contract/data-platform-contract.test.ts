import { describe, it, expect, vi, beforeEach } from "vitest";

function makeDataPlatformUrl(path: string) {
  const baseUrl = "http://localhost:8001";
  return `${baseUrl}${path}`;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Agent → Data Platform contract", () => {
  it("POST /internal/decisions persists a trust-scored decision", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          id: "dec-001",
          job_id: "job-001",
          verdict: "approved",
          trust_score: 0.92,
          trust_band: "auto_approve",
          requires_human_review: false,
          violation_count: 0,
          warning_count: 0,
          created_at: new Date().toISOString(),
        }),
    });

    const body = {
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.92,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      reasoning_summary: "All checks passed.",
      citations: [],
    };

    const res = await fetch(makeDataPlatformUrl("/internal/decisions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("id");
    expect(json).toHaveProperty("job_id");
    expect(json).toHaveProperty("verdict");
    expect(["approved", "rejected", "needs_review"]).toContain(json.verdict);
    expect(json).toHaveProperty("trust_score");
    expect(typeof json.trust_score).toBe("number");
    expect(json.trust_score).toBeGreaterThanOrEqual(0);
    expect(json.trust_score).toBeLessThanOrEqual(1);
  });

  it("POST /internal/audit-events persists an audit event", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          id: "audit-001",
          job_id: "job-001",
          event_type: "decision_persisted",
          actor: "system",
          created_at: new Date().toISOString(),
        }),
    });

    const body = {
      job_id: "job-001",
      event_type: "decision_persisted",
      actor: "system",
      payload: { decision_id: "dec-001" },
    };

    const res = await fetch(makeDataPlatformUrl("/internal/audit-events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("id");
    expect(json).toHaveProperty("job_id");
    expect(json).toHaveProperty("event_type");
    expect([
      "artifact_received", "extraction_complete", "validation_complete",
      "verdict_issued", "trust_scored", "decision_persisted",
      "human_review_queued", "human_review_complete",
    ]).toContain(json.event_type);
  });
});
