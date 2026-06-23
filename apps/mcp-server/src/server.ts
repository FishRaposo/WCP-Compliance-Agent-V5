import "dotenv/config";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { config } from "./config.js";
import { createMcpServer } from "./mcp.js";

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });
}

async function startStdio(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  // On stdio, stdout IS the protocol channel — log only to stderr.
  console.error(`[mcp] wcp-compliance ready on stdio (mode=${config.MCP_MODE})`);
}

/**
 * Stateless Streamable HTTP: a fresh server + transport per request (no session reuse), so
 * concurrent clients never share request-id state. Mounted on raw node:http.
 */
async function startHttp(): Promise<void> {
  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!(req.url ?? "").startsWith("/mcp")) {
      res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "Not found" }));
      return;
    }
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      const body = req.method === "POST" ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (err) {
      console.error("[mcp] http request failed:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: "Internal error" }));
      }
    }
  });
  httpServer.listen(config.HTTP_PORT, () =>
    console.error(`[mcp] wcp-compliance Streamable HTTP on :${config.HTTP_PORT}/mcp (mode=${config.MCP_MODE})`),
  );
}

async function main(): Promise<void> {
  if (config.MCP_TRANSPORT === "http") await startHttp();
  else await startStdio();
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    console.error("[mcp] fatal:", err);
    process.exit(1);
  });
}
