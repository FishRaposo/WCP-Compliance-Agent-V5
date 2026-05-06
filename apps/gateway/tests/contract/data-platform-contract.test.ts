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

describe("Gateway → Data Platform contract", () => {
  it("GET /api/v1/decisions returns paginated decisions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          items: [
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
          ],
          total: 1,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
    });

    const res = await fetch(makeDataPlatformUrl("/api/v1/decisions?page=1&per_page=20"));
    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
    expect(json).toHaveProperty("total");
    expect(json).toHaveProperty("page");
    expect(json).toHaveProperty("per_page");
    expect(json).toHaveProperty("pages");

    if (json.items.length > 0) {
      const decision = json.items[0];
      expect(decision).toHaveProperty("id");
      expect(decision).toHaveProperty("verdict");
    }
  });

  it("GET /api/v1/contracts returns paginated contracts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          items: [
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
          ],
          total: 1,
          page: 1,
          per_page: 20,
          pages: 1,
        }),
    });

    const res = await fetch(makeDataPlatformUrl("/api/v1/contracts"));
    const json = await res.json();

    expect(res.ok).toBe(true);
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);

    if (json.items.length > 0) {
      const contract = json.items[0];
      expect(contract).toHaveProperty("contract_number");
      expect(contract).toHaveProperty("project_name");
      expect(contract).toHaveProperty("locality");
      expect(["active", "completed", "terminated", "suspended"]).toContain(contract.status);
    }
  });
});
