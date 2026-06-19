# CLAUDE.md

Guidance for Claude Code working in this repository. **[AGENTS.md](AGENTS.md) is the canonical project doc** (five-service architecture, commands, CI, conventions, and the full [Agent Layer (Mastra)](AGENTS.md#agent-layer-mastra) reference). This file highlights the rules most likely to trip you up.

## What this is

WCP Compliance Agent V5 — a five-service monorepo (Turborepo + pnpm) for WH-347 Davis-Bacon certified-payroll compliance. Web (React) → Gateway (Hono) → **Agent (Mastra)** → Compliance Core (FastAPI, deterministic validation) + Data Platform (FastAPI, persistence). Pipeline: extract → validate → LLM verdict → trust score → persist.

Use pnpm (this repo pins `pnpm@9.15.0`; if pnpm isn't on PATH, run it via `corepack pnpm …`). Common: `pnpm install`, `pnpm dev`, `pnpm typecheck`, `pnpm test`.

## The agent layer is Mastra — use Mastra, don't reinvent it

`apps/agent` runs on **Mastra 1.45** (`@mastra/core@^1.45`, AI SDK v6, `zod@^3.25`). Mastra owns orchestration: agents, tools, workflows, RAG, memory, scorers, observability. Everything lives under `apps/agent/src/mastra/`. When adding agent capability, reach for the Mastra primitive — do **not** hand-roll pipelines, model routers, prompt registries, or tracing.

### Mastra 1.45 API rules (these differ from older Mastra and from many online examples)

- **Imports:** `Mastra` from `@mastra/core`; `Agent` from `@mastra/core/agent`; `createTool` from `@mastra/core/tools`; `createWorkflow`/`createStep` from `@mastra/core/workflows`; `createScorer` from `@mastra/core/evals`.
- **Tools** — `createTool({ id, description, inputSchema, outputSchema, execute })`. `execute` is `(inputData, ctx)` (two positional args). Use **`ctx.requestContext`** (a `RequestContext` map), **not `runtimeContext`**, to read/propagate `x-request-id`/`x-trace-id`. Attach to an agent as a keyed record (key = model-facing tool name).
- **Agents** — require `id`, `name`, `instructions`, `model`. Structured output: `agent.generate(msg, { structuredOutput: { schema, errorStrategy: 'fallback', fallbackValue } })` → read **`result.object`** (never `output`/`experimental_output`). Tokens: `result.usage.inputTokens`/`outputTokens`. Dynamic config = `({ requestContext, mastra }) => …`. `model` = a router string (`'openai/gpt-4o'`) or an AI SDK v6 instance; temperature under `modelSettings`.
- **Workflows** — `await workflow.createRun()` (async). `run.start({ inputData, requestContext })`; narrow on **`result.status`** and read output from **`result.result`** (not `result.output`). Suspend via `await suspend(payload)`, resume via `run.resume({ step, resumeData })`. End the builder with **`.commit()`**. Suspend/resume snapshots live in workflow storage (`MASTRA_DB_URL`); in mock/test that's in-memory, so resume only works within one live process.
- **Memory** — per-call selector `{ thread, resource }` (not `threadId`/`resourceId`). `LibSQLStore`/`LibSQLVector` require an `id`. Semantic recall needs `vector` + `embedder`.
- **RAG** — `createVectorQueryTool({ vectorStoreName, indexName, model: embedder })` (`model` is the embedder). `MDocument.chunk({ strategy, maxSize, overlap })` — it's `maxSize`, not `size`. `vectorStoreName` must match a key in `new Mastra({ vectors: { … } })`.
- **Scorers** — `createScorer({ id, description }).generateScore(({ run }) => number).generateReason(…)`; `scorer.run({ input, output, groundTruth })`. Built-ins at `@mastra/evals/scorers/prebuilt`. The legacy `Metric`/`measure()` API is removed.
- **Observability** — Mastra config key is **`observability`** (not `telemetry`): `new Observability({ configs: { default: { serviceName, exporters: [new LangfuseExporter(...)] } } })`. Omit it for NoOp tracing (mock mode).

### Hard constraints — don't break these

- **Preserve the gateway↔agent HTTP contract.** Endpoints under `/internal/workflows/*` return the raw `TrustScoredDecision` JSON; `X-Internal-Token` → 401/403; validation → 400 `{error, details}`; errors → 500; `x-trace-id` falls back to `x-request-id`.
- **The agent never writes the database.** Persist via the `persist` tool → Data Platform only.
- **Mock mode (`LLM_MODE=mock`, the default) needs zero external services/keys** and must keep working. It bypasses the LLM in the verdict step; the rest of the Mastra workflow still runs.
- **Deterministic checks are the source of compliance truth** — the LLM explains and cites; it never overrides a violation (see `trust.ts` `safeVerdict`).

## Verify before claiming done

From `apps/agent`: `pnpm typecheck` → `pnpm build` → `pnpm test` (the suite includes a real Mastra workflow run in mock mode). The Python services have their own `poetry run pytest` / `ruff` / `mypy` (see AGENTS.md).
