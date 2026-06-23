import { describe, it, expect, vi, beforeEach } from "vitest";

// Real mode: the compliance functions call Compliance Core via ServiceClient.
process.env.MCP_MODE = "real";

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("@wcp/typescript-client", () => ({
  ServiceClient: vi.fn().mockImplementation(() => ({ post: mockPost, get: mockGet })),
  ServiceClientError: class extends Error {},
}));

describe("compliance client (real mode → Compliance Core)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validatePayroll posts the extracted payroll to /internal/validate", async () => {
    mockPost.mockResolvedValueOnce({
      job_id: "j",
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    });
    const { validatePayroll } = await import("../src/compliance.js");
    const report = await validatePayroll({
      job_id: "j",
      contractor: { name: "Acme" },
      project: { name: "Proj" },
      employees: [],
    });
    expect(report.overall_status).toBe("pass");
    expect(mockPost).toHaveBeenCalledWith("/internal/validate", expect.objectContaining({ job_id: "j" }));
  });

  it("lookupDbwdRate GETs the encoded DBWD path", async () => {
    mockGet.mockResolvedValueOnce({
      trade: "Electrician",
      locality: "Washington, DC",
      rate: 46.1,
      fringe: 18.75,
      effective_date: "2025-01-01",
    });
    const { lookupDbwdRate } = await import("../src/compliance.js");
    const rate = await lookupDbwdRate("Electrician", "Washington, DC", "2025-01-01");
    expect(rate.rate).toBe(46.1);
    expect(mockGet).toHaveBeenCalledWith("/internal/dbwd/Electrician/Washington%2C%20DC/2025-01-01");
  });

  it("searchWageRegs unwraps the results envelope", async () => {
    mockPost.mockResolvedValueOnce({ query: "q", results: [{ chunk_id: "c1", text: "t" }], total: 1 });
    const { searchWageRegs } = await import("../src/compliance.js");
    const results = await searchWageRegs("q", "Electrician", "DC", 5);
    expect(results).toHaveLength(1);
    expect(mockPost).toHaveBeenCalledWith(
      "/internal/search/",
      expect.objectContaining({ query: "q", top_k: 5 }),
    );
  });
});
