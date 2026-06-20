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

describe("Gateway to Data Platform contract", () => {
  it("GET /internal/decisions returns decision records", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: "dec-001",
            job_id: "job-001",
            verdict: "approved",
            trust_score: 0.92,
            trust_band: "auto_approve",
            requires_human_review: false,
            violation_count: 0,
            warning_count: 0,
            created_at: new Date().toISOString(),
          },
        ]),
    });

    const res = await fetch(makeDataPlatformUrl("/internal/decisions?limit=20&offset=0"));
    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toHaveProperty("id");
    expect(json[0]).toHaveProperty("job_id");
    expect(["approved", "rejected", "needs_review"]).toContain(json[0].verdict);
    expect(["auto_approve", "flag_for_review", "require_human_review"]).toContain(
      json[0].trust_band,
    );
  });

  it("GET /internal/contracts returns contract records", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: "contract-001",
            contract_number: "C-2025-001",
            project_name: "Bridge Repair",
            contractor_name: "Test Corp",
            locality: "Washington, DC",
            status: "active",
            decision_count: 3,
            payroll_record_count: 12,
            created_at: new Date().toISOString(),
          },
        ]),
    });

    const res = await fetch(makeDataPlatformUrl("/internal/contracts"));
    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0]).toHaveProperty("contract_number");
    expect(json[0]).toHaveProperty("project_name");
    expect(json[0]).toHaveProperty("locality");
    expect(["active", "completed", "terminated", "suspended"]).toContain(json[0].status);
  });
});
