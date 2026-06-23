import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  checkPayrollTextInput,
  extractPayrollInput,
  lookupDbwdRateInput,
  searchWageRegsInput,
} from "./schemas.js";
import {
  checkPayrollText,
  extractPayroll,
  lookupDbwdRate,
  searchWageRegs,
} from "./compliance.js";

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  return {
    content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
    isError: true as const,
  };
}

/**
 * Build the WCP compliance MCP server: four tools over the deterministic compliance engine.
 * Each tool is a thin wrapper over `compliance.ts`, which itself is mock or real per MCP_MODE.
 * The factory is transport-agnostic so it can be driven by stdio, HTTP, or an in-memory
 * transport (tests).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "wcp-compliance", version: "5.0.0" });

  server.registerTool(
    "check_payroll_text",
    {
      title: "Check payroll compliance",
      description:
        "Extract a WH-347 certified payroll from raw text and run deterministic Davis-Bacon compliance checks (wage / overtime / fringe / arithmetic). Returns the structured payroll plus the violation report.",
      inputSchema: checkPayrollTextInput,
    },
    async ({ text }) => {
      try {
        return jsonResult(await checkPayrollText(text));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "extract_payroll",
    {
      title: "Extract payroll",
      description: "Parse raw WH-347 certified payroll text into a structured record (no validation).",
      inputSchema: extractPayrollInput,
    },
    async ({ text }) => {
      try {
        return jsonResult(await extractPayroll(text));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "lookup_dbwd_rate",
    {
      title: "Look up Davis-Bacon rate",
      description:
        "Look up the official Davis-Bacon prevailing wage and fringe rate for a trade classification, locality, and effective date.",
      inputSchema: lookupDbwdRateInput,
    },
    async ({ trade, locality, date }) => {
      try {
        return jsonResult(await lookupDbwdRate(trade, locality, date));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "search_wage_regulations",
    {
      title: "Search wage regulations",
      description: "Search Davis-Bacon wage determinations and regulation text relevant to a trade/locality.",
      inputSchema: searchWageRegsInput,
    },
    async ({ query, trade, locality, top_k }) => {
      try {
        return jsonResult(await searchWageRegs(query, trade, locality, top_k));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  return server;
}
