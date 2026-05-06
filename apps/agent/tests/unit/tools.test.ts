import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock("@wcp/typescript-client", () => ({
  ServiceClient: vi.fn().mockImplementation(() => ({
    post: mockPost,
    get: mockGet,
  })),
  ServiceClientError: class extends Error {
    constructor(public service: string, public statusCode: number, message: string) {
      super(message);
    }
  },
}));

describe("agent tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extractTool sends text to compliance core", async () => {
    mockPost.mockResolvedValueOnce({ job_id: "job-001", contractor: { name: "Test" }, project: { name: "Test" }, employees: [] });
    const { extractTool } = await import("../../src/tools/extract.js");
    const result = await extractTool("test text");
    expect(result.job_id).toBe("job-001");
    expect(mockPost).toHaveBeenCalledWith("/internal/extract", { text: "test text" }, undefined);
  });

  it("validateTool sends extracted data to compliance core", async () => {
    const extracted = { job_id: "job-001", contractor: { name: "Test" }, project: { name: "Test" }, employees: [] };
    mockPost.mockResolvedValueOnce({ job_id: "job-001", checks: [], overall_status: "pass", violation_count: 0, warning_count: 0 });
    const { validateTool } = await import("../../src/tools/validate.js");
    const result = await validateTool(extracted as any);
    expect(result.overall_status).toBe("pass");
  });

  it("persistTool sends decision to data platform", async () => {
    const decision = { job_id: "job-001", verdict: "approved", trust_score: 0.95 };
    mockPost.mockResolvedValueOnce({ decision_id: "dec-001" });
    const { persistTool } = await import("../../src/tools/persist.js");
    const result = await persistTool(decision as any);
    expect(result.decision_id).toBe("dec-001");
  });

  it("dbwdLookupTool fetches rate from compliance core", async () => {
    mockGet.mockResolvedValueOnce({ trade: "Electrician", rate: 51.69, fringe: 34.63 });
    const { dbwdLookupTool } = await import("../../src/tools/dbwd-lookup.js");
    const result = await dbwdLookupTool("Electrician", "Washington, DC", "2025-01-01");
    expect(result.trade).toBe("Electrician");
    expect(result.rate).toBe(51.69);
  });

  it("searchTool sends query to compliance core", async () => {
    mockPost.mockResolvedValueOnce({ results: [], total: 0 });
    const { searchTool } = await import("../../src/tools/search.js");
    const result = await searchTool("test query", "Electrician", "Washington, DC");
    expect(result.results).toEqual([]);
  });

  it("tools propagate trace headers", async () => {
    const headers = { "x-request-id": "req-123", "x-trace-id": "trace-456" };
    mockPost.mockResolvedValueOnce({ job_id: "job-001", contractor: { name: "Test" }, project: { name: "Test" }, employees: [] });
    const { extractTool } = await import("../../src/tools/extract.js");
    await extractTool("test", headers);
    expect(mockPost).toHaveBeenCalledWith("/internal/extract", { text: "test" }, headers);
  });
});
