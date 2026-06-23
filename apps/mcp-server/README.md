# @wcp/mcp-server

A **Model Context Protocol (MCP) server** that exposes the WCP deterministic compliance engine
as agent-callable tools. Any MCP client — Claude Desktop, Claude Code, or another agent — can run
Davis-Bacon WH-347 compliance checks, look up prevailing wage rates, and search wage
determinations, turning the platform into an **agent-native compliance API**.

Built on `@modelcontextprotocol/sdk` 1.29. Part of the V6 evolution (see
[docs/planning/v6-platform-evolution.md](../../docs/planning/v6-platform-evolution.md)).

## Tools

| Tool | Input | Returns |
|---|---|---|
| `check_payroll_text` | `{ text }` | Extracts a WH-347 payroll from raw text and runs deterministic checks → `{ extracted, report }` (violations + citations). The headline tool. |
| `extract_payroll` | `{ text }` | Parses raw payroll text into a structured `ExtractedWCP` (no validation). |
| `lookup_dbwd_rate` | `{ trade, locality, date }` | The Davis-Bacon prevailing wage + fringe rate. |
| `search_wage_regulations` | `{ query, trade?, locality?, top_k? }` | Relevant wage-determination / regulation snippets. |

Each tool is a thin wrapper over a Compliance Core `/internal/*` endpoint (real mode) or a
deterministic stub (mock mode). The deterministic engine stays the source of truth — these tools
surface its output; they do not re-implement compliance logic.

## Modes

- **`MCP_MODE=mock`** (default) — zero external services; returns deterministic stub compliance
  data. The server runs standalone for demos and Claude Desktop with no backend.
- **`MCP_MODE=real`** — calls Compliance Core at `COMPLIANCE_CORE_URL`, forwarding
  `X-Internal-Token`.

## Transports

- **stdio** (default, `MCP_TRANSPORT=stdio`) — for Claude Desktop / Claude Code (local process).
- **Streamable HTTP** (`MCP_TRANSPORT=http`, stateless) — for remote / multi-client use, served
  on `:$HTTP_PORT/mcp` via raw Node `http`.

## Run

```bash
cd apps/mcp-server
pnpm dev          # tsx watch (stdio by default)
pnpm build        # tsc
pnpm typecheck
pnpm test         # vitest (in-memory MCP round-trip + real-mode client)
pnpm lint

# remote HTTP transport
MCP_TRANSPORT=http HTTP_PORT=3002 pnpm dev
# real mode against a running Compliance Core
MCP_MODE=real COMPLIANCE_CORE_URL=http://localhost:8000 INTERNAL_SERVICE_TOKEN=… pnpm dev
```

## Use from Claude Desktop / Claude Code

Add to `claude_desktop_config.json` (or the Claude Code MCP config):

```json
{
  "mcpServers": {
    "wcp-compliance": {
      "command": "node",
      "args": ["C:/path/to/WCP-Compliance-Agent-V5/apps/mcp-server/dist/server.js"],
      "env": { "MCP_MODE": "mock" }
    }
  }
}
```

(Use `MCP_MODE=real` + `COMPLIANCE_CORE_URL` to hit the live engine.)

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `MCP_MODE` | `mock` | `mock` \| `real` |
| `MCP_TRANSPORT` | `stdio` | `stdio` \| `http` |
| `HTTP_PORT` | `3002` | port for the HTTP transport |
| `COMPLIANCE_CORE_URL` | `http://localhost:8000` | Compliance Core base URL (real mode) |
| `INTERNAL_SERVICE_TOKEN` | `""` | forwarded as `X-Internal-Token` (real mode) |

## Layout

```
src/
  config.ts       env config + mock/real flag
  schemas.ts      Zod input shapes (raw shapes for registerTool) + domain types
  compliance.ts   the engine as the tools see it (mock or real ServiceClient)
  mcp.ts          createMcpServer() — registers the 4 tools (transport-agnostic)
  server.ts       entry: stdio or stateless Streamable HTTP
tests/
  server.test.ts          in-memory MCP round-trip (listTools / callTool) in mock mode
  compliance.real.test.ts real-mode client → Compliance Core (mocked ServiceClient)
```

## Notes

- The MCP SDK's `registerTool` takes a **raw Zod shape** (`{ field: z.string() }`), not a wrapped
  `z.object(...)`. Pinned to `@modelcontextprotocol/sdk@^1.29.0` and verified against the installed
  type definitions — the project's GitHub `main` shows an unreleased v2 API; do not copy it.
- On stdio, **stdout is the protocol channel** — the server logs only to stderr.
