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
import { noopObserve } from "@mastra/core/tools";

function ctx(headers: Record<string, string> = {}) {
  const requestContext = new RequestContext();
  for (const [k, v] of Object.entries(headers)) requestContext.set(k, v);
  return { requestContext, observe: noopObserve };
}

describe("agent tools (createTool)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extractTool posts text to compliance core", async () => {
    mockPost.mockResolvedValueOnce({
      job_id: "job-001",
      contractor: { name: "Test" },
      project: { name: "Test" },
      employees: [],
    });
    const { extractTool } = await import("../../src/mastra/tools/extract.tool.js");
    const result = (await extractTool.execute!({ text: "test text" }, ctx())) as { job_id: string };
    expect(result.job_id).toBe("job-001");
    expect(mockPost).toHaveBeenCalledWith("/internal/extract", { text: "test text" }, {});
  });

  it("propagates trace headers from requestContext", async () => {
    mockPost.mockResolvedValueOnce({
      job_id: "j",
      contractor: { name: "T" },
      project: { name: "T" },
      employees: [],
    });
    const { extractTool } = await import("../../src/mastra/tools/extract.tool.js");
    await extractTool.execute!({ text: "x" }, ctx({ "x-request-id": "req-1", "x-trace-id": "tr-1" }));
    expect(mockPost).toHaveBeenCalledWith("/internal/extract", { text: "x" }, {
      "x-request-id": "req-1",
      "x-trace-id": "tr-1",
    });
  });

  it("validateTool posts extracted data to compliance core", async () => {
    const extracted = {
      job_id: "job-001",
      contractor: { name: "Test" },
      project: { name: "Test" },
      employees: [],
    };
    mockPost.mockResolvedValueOnce({
      job_id: "job-001",
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    });
    const { validateTool } = await import("../../src/mastra/tools/validate.tool.js");
    const result = (await validateTool.execute!(extracted, ctx())) as { overall_status: string };
    expect(result.overall_status).toBe("pass");
  });

  it("persistTool accepts the data platform decision response", async () => {
    const decision = {
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.95,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      llm_confidence: 0.95,
      reasoning_summary: "ok",
      citations: [],
    };
    mockPost.mockResolvedValueOnce({
      id: "dec-001",
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.95,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      created_at: new Date().toISOString(),
    });
    const { persistTool } = await import("../../src/mastra/tools/persist.tool.js");
    const result = (await persistTool.execute!(decision, ctx())) as { id: string };
    expect(result.id).toBe("dec-001");
    expect(mockPost).toHaveBeenCalledWith("/internal/decisions", expect.objectContaining({ job_id: "job-001" }), {});
  });

  it("dbwdLookupTool fetches a rate from compliance core", async () => {
    mockGet.mockResolvedValueOnce({
      trade: "Electrician",
      locality: "Washington, DC",
      rate: 51.69,
      fringe: 34.63,
      effective_date: "2025-01-01",
    });
    const { dbwdLookupTool } = await import("../../src/mastra/tools/dbwd-lookup.tool.js");
    const result = (await dbwdLookupTool.execute!(
      { trade: "Electrician", locality: "Washington, DC", date: "2025-01-01" },
      ctx(),
    )) as { trade: string; rate: number };
    expect(result.trade).toBe("Electrician");
    expect(result.rate).toBe(51.69);
  });

  it("searchTool posts a query and returns results", async () => {
    mockPost.mockResolvedValueOnce({ query: "test query", results: [], total: 0 });
    const { searchTool } = await import("../../src/mastra/tools/search.tool.js");
    const result = (await searchTool.execute!(
      { query: "test query", trade: "Electrician", locality: "Washington, DC", top_k: 5 },
      ctx(),
    )) as { results: unknown[] };
    expect(result.results).toEqual([]);
    expect(mockPost).toHaveBeenCalledWith(
      "/internal/search/",
      { query: "test query", trade: "Electrician", locality: "Washington, DC", top_k: 5 },
      {},
    );
  });
});
