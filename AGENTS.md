# AGENTS.md

## Five-Service Architecture

V5 is a monorepo with five services, managed by Turborepo + pnpm workspaces.

| Service | Stack | Port | Package Manager |
|---|---|---|---|
| **web** | React 19, Vite, Tailwind, Shadcn/ui, TanStack Query | 5173 | pnpm |
| **gateway** | TypeScript, Hono, Zod, jose (JWT) | 3000 | pnpm |
| **agent** | TypeScript, **Mastra 1.45** (`@mastra/core`), AI SDK v6, Langfuse | 3001 | pnpm |
| **compliance-core** | Python 3.12, FastAPI, Pydantic v2, pdfplumber | 8000 | Poetry |
| **data-platform** | Python 3.12, FastAPI, SQLAlchemy, Alembic | 8001 | Poetry |

Infrastructure: PostgreSQL 16 (pgvector), Redis 7.

## Verification Tally

| Layer | Count | Framework |
|---|---:|---|
| Compliance Core unit | 75 | pytest |
| Data Platform unit | 60 | pytest |
| Agent (Mastra) | 65 | vitest |
| Gateway unit | 22 | vitest |
| Web unit | 29 | vitest |
| Contracts | 17 | vitest |
| **Unit-test total** | **268** | pytest + vitest |
| Data Platform integration | 24 | pytest |
| Golden-set eval examples | 92 | pytest parametrization |

**Current local verification:** direct Vitest package runs pass for Agent, Gateway, Web, and Contracts (133 tests). Python pytest suites require Poetry/CI dependencies; Android/Termux cannot build some native Python packages cleanly. E2E Docker flow is not yet fully covered.

## Commands

### Root (Turborepo)

```bash
pnpm install                  # Install all TS dependencies
pnpm dev                      # Start all TS services in parallel
pnpm build                    # Build all TS packages and services
pnpm typecheck                # Type check all TS packages
pnpm test                     # Run all TS tests
```

### Web App

```bash
cd apps/web
pnpm dev                      # Vite dev server on port 5173
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run

VITE_MOCK_API=true pnpm dev   # Mock mode (no backend needed)
```

### Gateway

```bash
cd apps/gateway
pnpm dev                      # tsx watch on port 3000
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run
```

### Agent (Mastra)

```bash
cd apps/agent
pnpm dev                      # tsx watch on port 3001 (Hono server embedding the Mastra instance)
pnpm playground               # mastra dev --dir src/mastra (interactive Mastra playground)
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run (incl. a real Mastra workflow run in mock mode)
```

See [Agent Layer (Mastra)](#agent-layer-mastra) below for the Mastra structure and conventions.

### Compliance Core (Python)

```bash
cd apps/compliance-core
poetry install
poetry run uvicorn wcp_compliance.main:app --reload --port 8000
poetry run pytest tests/unit -v
poetry run pytest tests/eval -v
poetry run ruff check .
poetry run mypy src/
```

### Data Platform (Python)

```bash
cd apps/data-platform
poetry install
poetry run uvicorn wcp_data.main:app --reload --port 8001
poetry run alembic upgrade head
poetry run pytest tests/unit -v
poetry run ruff check .
poetry run mypy src/
```

### Infrastructure

```bash
cd infra
docker compose up -d postgres redis
docker compose -f docker-compose.prod.yml up -d  # Full production stack
docker compose down
```

### Contracts

```bash
cd packages/contracts
python3 generate.py           # Regenerate TS + Python types from JSON schemas
```

## CI Pipeline

Three parallel Turborepo pipelines on push/PR to main:

1. **TypeScript**: `typecheck` → `lint` → `build` → `test` across all TS packages
2. **Python compliance-core**: `ruff check` → `mypy src/` → `pytest tests/unit`
3. **Python data-platform**: `ruff check` → `mypy src/` → `pytest tests/unit`

Golden-set evaluation runs weekly (Monday 6 AM) and on manual trigger.

## Key Architecture Facts

- **Gateway calls Agent, Compliance Core, and Data Platform** via internal HTTP routes prefixed with `/internal/`.
- **Agent calls Compliance Core for extraction and validation** via `/internal/extract`, `/internal/validate`.
- **Agent calls Data Platform for persistence** via `/internal/decisions`, `/internal/audit-events`.
- **Compliance Core never writes to the database** — it returns structured data.
- **Agent never writes to the database** — it returns DecisionDrafts.
- **Data Platform is the only service that creates official DecisionRecords and AuditEvents.**
- **Shared JSON schemas** in `packages/contracts/schemas/` define cross-service contracts.
- **Codegen** produces TypeScript (Zod) and Python (Pydantic) types from JSON schemas.
- **Trace IDs** (`x-request-id`, `x-trace-id`) propagate through all services.

## Agent Layer (Mastra)

The agent service is built on **Mastra 1.45** (`@mastra/core@^1.45`). Mastra owns orchestration — agents, tools, workflows, RAG, memory, scorers, and tracing are first-class primitives, not hand-rolled. **Do not reintroduce bespoke orchestration; use Mastra.**

### Ecosystem versions (keep aligned)

`@mastra/core@^1.45` · `@mastra/rag@^2.3` · `@mastra/memory@^1.21` · `@mastra/libsql@^1.14` · `@mastra/pg@^1.14` · `@mastra/loggers@^1.2` · `@mastra/evals@^1.4` · `@mastra/observability@^1.15` · `@mastra/langfuse@^1.4` · `mastra@^1.15` (dev CLI). Model layer: **AI SDK v6** (`ai@^6`, `@ai-sdk/openai@^3`, `@ai-sdk/anthropic@^3`, `ollama-ai-provider-v2@^3.6`) and **`zod@^3.25`** (Mastra peer floor; AI SDK v4 / zod 3.24 are NOT compatible).

### Structure (`apps/agent/src/mastra/`)

| File | Role |
|---|---|
| `index.ts` | The `Mastra` instance — registers agents, workflows, tools, vectors, storage, scorers, logger, observability. Embedded in the Hono server and loaded by `mastra dev`. |
| `agents/verdict-agent.ts` | The verdict `Agent` — dynamic instructions/model, retrieval tools, memory, live scorers. |
| `workflows/wcp-pipeline.ts` | `createWorkflow` pipelines: `wcpPipeline` (text) + `wcpPipelineFromExtracted`. Steps: extract → validate → verdict → trust → persist. |
| `workflows/human-review.ts` | `humanReviewWorkflow` — suspend/resume human-in-the-loop (opt-in; the sync endpoints stay contract-compatible). |
| `tools/*.tool.ts` | `createTool` wrappers (extract, validate, persist, search, dbwd-lookup). |
| `rag.ts` | Davis-Bacon RAG: vector store (PgVector real / LibSQLVector mock) + `createVectorQueryTool` + seed corpus. |
| `memory.ts` | `Memory` (LibSQL) keyed by contractor. |
| `model-router.ts` | Dynamic per-request model selection (compliance / cost / synthesis + fallback chains). |
| `scorers/*` | `verdict-agreement` (code) + `citation-groundedness` (LLM judge); used live + over the golden set. |
| `observability.ts` | `Observability` + `LangfuseExporter` (real) / NoOp (mock) + `PinoLogger`. |
| `schemas.ts` | Zod schemas (contract-aligned, snake_case). `src/types.ts` re-exports these. |
| `trust.ts` / `cost.ts` | Pure deterministic trust scoring + token cost. |

### Mastra 1.45 conventions (these differ from older Mastra/docs — follow them)

- **Imports are subpath-specific:** `Mastra` from `@mastra/core`; `Agent` from `@mastra/core/agent`; `createTool` from `@mastra/core/tools`; `createWorkflow`/`createStep` from `@mastra/core/workflows`; `createScorer` from `@mastra/core/evals`.
- **Tools:** `createTool({ id, description, inputSchema, outputSchema, execute })`. `execute` is `(inputData, ctx)` — **two positional args**. The DI container is **`ctx.requestContext`** (a `RequestContext` map), **NOT `runtimeContext`**. Tracing/logging via `ctx.observe`. Tools attach to an agent as a **keyed record** (the key is the model-facing name).
- **Agents:** require `id`, `name`, `instructions`, `model`. **Structured output** = `agent.generate(message, { structuredOutput: { schema, errorStrategy: 'fallback', fallbackValue } })` → read **`result.object`** (NOT `output`/`experimental_output`). Token usage is **`result.usage.inputTokens` / `outputTokens`** (not promptTokens). Dynamic config is a function `({ requestContext, mastra }) => ...`. `model` accepts a router string (`'openai/gpt-4o'`) or an AI SDK v6 instance. Temperature goes under `modelSettings`.
- **Workflows:** `createRun()` is **async — `await` it**. `run.start({ inputData, requestContext })`; result is a discriminated union on `result.status` and the output is on **`result.result`** (NOT `result.output`). Suspend with `await suspend(payload)` and resume with `run.resume({ step, resumeData })`. Always end the builder with **`.commit()`**.
- **Memory:** per-call selector is **`{ thread, resource }`** (NOT `threadId`/`resourceId`). `LibSQLStore`/`LibSQLVector` require an **`id`**. Semantic recall needs both `vector` and `embedder`.
- **RAG:** `createVectorQueryTool({ vectorStoreName, indexName, model: embedder })` — `model` is the **embedder**, not the LLM. `MDocument.chunk({ strategy, maxSize, overlap })` — it's **`maxSize`**, not `size`. The `vectorStoreName` must match a key in `new Mastra({ vectors: { ... } })`.
- **Scorers:** `createScorer({ id, description }).generateScore(({ run }) => number).generateReason(...)`; run with `scorer.run({ input, output, groundTruth })`. Built-ins live at `@mastra/evals/scorers/prebuilt`. The legacy `Metric`/`measure()` API is **removed**.
- **Observability:** the `Mastra` config key is **`observability`** (NOT `telemetry`). `new Observability({ configs: { default: { serviceName, exporters: [...] } } })`. Omitting it installs NoOp tracing — exactly what mock mode wants.

### Mock mode & boundaries

- `LLM_MODE=mock` (default) bypasses the LLM in the verdict step (deterministic verdict from the report) — **no API keys needed**, and the full Mastra workflow still runs. RAG embeddings + Langfuse + live LLM scoring activate only in real mode (keys present). If the LLM call fails in real mode, the verdict step degrades to the deterministic verdict rather than failing the request.
- **Deterministic truth wins on the whole payload, not just the verdict:** `safeVerdict` forces `rejected` for any non-rejected LLM verdict when violations exist; `buildReasoningSummary`/`groundCitations` (in `trust.ts`) lead the persisted reasoning with deterministic facts and drop ungrounded citations on violation-bearing payrolls, so attacker-influenced payroll text can't poison the audit record.
- **Suspend/resume durability:** workflow storage is in-memory (`file::memory:`) in mock/test, so suspended human-review runs survive only within a single live process. Set a file or Postgres `MASTRA_DB_URL` for durability across restarts/replicas.
- **Observability & PII:** in real mode Langfuse receives agent/tool/workflow spans (Mastra applies a `SensitiveDataFilter` by default); payroll data still leaves the trust boundary, so ensure a DPA and consider field masking. `LOG_LEVEL` defaults to `info` to keep payroll out of debug logs.
- The **agent never writes the database**; persistence goes through the `persist` tool to the Data Platform.
- Agent env: `LLM_MODE` (mock|real), `LLM_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, `OLLAMA_BASE_URL`/`OLLAMA_MODEL`, `EMBEDDING_MODEL`, `VECTOR_DB_URL`, `MEMORY_DB_URL`, `MASTRA_DB_URL`, `LANGFUSE_*`, `INTERNAL_SERVICE_TOKEN`, `COMPLIANCE_CORE_URL`, `DATA_PLATFORM_URL`.

### Golden-set eval

`apps/compliance-core/tests/eval/golden_set/examples.json` (100 examples) is the shared source of truth. The Mastra `verdictAgreementScorer` runs over it (`apps/agent/tests/eval/golden-set.test.ts`); the full pipeline eval stays in compliance-core pytest + `eval.yml`.

## Environment

- Copy `.env.example` (to be created) to each service directory.
- **Gateway config**: `JWT_SECRET`, `AUTH_DISABLED`, `AGENT_URL`, `COMPLIANCE_CORE_URL`, `DATA_PLATFORM_URL`.
- **Agent config**: `LLM_PROVIDER` (openai|anthropic|ollama), `LLM_MODE` (mock|real), `OPENAI_API_KEY`, `COMPLIANCE_CORE_URL`, `DATA_PLATFORM_URL`.
- **Compliance Core config**: `DATA_PLATFORM_URL` (for rate lookups post-MVP).
- **Data Platform config**: `DATABASE_URL`, `REDIS_URL`.
- **Web config**: `VITE_API_URL` (default http://localhost:3000), `VITE_MOCK_API`.

## Conventions

- **Python**: ruff line-length 100, Python 3.12, mypy strict. Pydantic v2 everywhere.
- **TypeScript**: ES modules, Node 20+, strict mode.
- **Frontend**: `@` path alias → `./src`. TanStack Query for server state. Shadcn/ui pattern.
- **API versioning**: External routes under `/api/v1/`. Internal routes under `/internal/`.
- **No direct database access** from any service except Data Platform.

## Mock Modes

| Service | Env Var | Behavior |
|---|---|---|
| Web | `VITE_MOCK_API=true` | All API calls return fixture data |
| Gateway | `WCP_MOCK_AUTH=true` | Bypasses JWT verification |
| Agent | `LLM_MODE=mock` | Returns deterministic verdicts |
| Compliance Core | Always works locally | Uses in-memory DBWD corpus |
| Data Platform | SQLite mode (future) | Uses in-memory DB adapter |

## Documentation

- `docs/architecture/v5-request-flow.md` — 16-step sequence diagram
- `docs/architecture/v5-data-ownership.md` — 13-entity R/W matrix
- `docs/architecture/v5-data-model.md` — 7 tables with relationships
- `docs/architecture/v2-to-v5-evolution.md` — Version history
- `docs/architecture/case-study.md` — Full case study
- `docs/adrs/` — 7 Architecture Decision Records
- `docs/planning/v5-porting-audit.md` — V3→V5 porting completeness
- `docs/planning/v5-known-gaps.md` — Documented limitations
- `docs/operations/deployment.md` — Deployment guide
