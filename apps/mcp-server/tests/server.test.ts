import { describe, it, expect } from "vitest";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpServer } from "../src/mcp.js";

async function connectedClient() {
  const server = createMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function textPayload(res: { content: unknown[] }): unknown {
  return JSON.parse((res.content[0] as { text: string }).text);
}

describe("wcp-compliance MCP server (mock mode, in-memory transport)", () => {
  it("exposes the four compliance tools with descriptions", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "check_payroll_text",
      "extract_payroll",
      "lookup_dbwd_rate",
      "search_wage_regulations",
    ]);
    expect(tools.every((t) => typeof t.description === "string" && t.description.length > 0)).toBe(true);
  });

  it("check_payroll_text passes a compliant payroll", async () => {
    const client = await connectedClient();
    const res = await client.callTool({
      name: "check_payroll_text",
      arguments: { text: "Electrician 40h at 55.00/hr" },
    });
    const payload = textPayload(res as { content: unknown[] }) as {
      report: { overall_status: string; violation_count: number };
    };
    expect(payload.report.overall_status).toBe("pass");
    expect(payload.report.violation_count).toBe(0);
  });

  it("check_payroll_text flags a below-prevailing-wage violation with a grounded citation", async () => {
    const client = await connectedClient();
    const res = await client.callTool({
      name: "check_payroll_text",
      arguments: { text: "lowball Electrician 40h at 30.00/hr" },
    });
    const payload = textPayload(res as { content: unknown[] }) as {
      report: { overall_status: string; violation_count: number; checks: Array<{ regulation_cite: string }> };
    };
    expect(payload.report.overall_status).toBe("fail");
    expect(payload.report.violation_count).toBe(1);
    expect(payload.report.checks[0].regulation_cite).toBe("29 CFR 5.5");
  });

  it("lookup_dbwd_rate returns a rate for a trade/locality/date", async () => {
    const client = await connectedClient();
    const res = await client.callTool({
      name: "lookup_dbwd_rate",
      arguments: { trade: "Electrician", locality: "Washington, DC", date: "2025-01-01" },
    });
    const payload = textPayload(res as { content: unknown[] }) as { trade: string; rate: number };
    expect(payload.trade).toBe("Electrician");
    expect(payload.rate).toBeGreaterThan(0);
  });

  it("search_wage_regulations returns results", async () => {
    const client = await connectedClient();
    const res = await client.callTool({
      name: "search_wage_regulations",
      arguments: { query: "overtime premium" },
    });
    const payload = textPayload(res as { content: unknown[] }) as unknown[];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBeGreaterThan(0);
  });

  it("rejects input that fails the tool's zod schema", async () => {
    const client = await connectedClient();
    const errored = await client
      .callTool({ name: "check_payroll_text", arguments: {} })
      .then((res) => (res as { isError?: boolean }).isError === true)
      .catch(() => true);
    expect(errored).toBe(true);
  });
});
