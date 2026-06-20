# WCP Compliance Agent V5

**Production-ready WH-347 certified payroll compliance platform for Davis-Bacon Act contractors.**

V5 is a five-service monorepo where each service has one clear responsibility. A payroll flows through extraction, deterministic validation, Mastra-based verdict synthesis, trust scoring, and audited persistence with request and trace IDs propagated across service boundaries.

**Current verification target:** 274 source-collected unit tests, 24 Data Platform integration tests, and 93 Compliance Core golden-set eval tests (92 examples plus one baseline regression). UI mock mode can run without backend services; Agent mock mode avoids LLM API keys while still exercising the Mastra workflow and internal service boundaries.

---

## Architecture

```text
Web (React 19) -> Gateway (Hono) -> Agent (Mastra)
                      |                |
                      |                -> Compliance Core (FastAPI) for extraction/validation
                      |
                      -> Data Platform (FastAPI + SQLAlchemy) for persistence/querying
```

| Service | Language | Port | Responsibility | Why It Exists |
|---|---|---:|---|---|
| **Web** | TypeScript/React 19 | 5173 | Upload flow, decision display, analytics, review queue | UI state management |
| **Gateway** | TypeScript/Hono | 3000 | Auth, CORS, rate limiting, routing, SSE streaming | Single entry point, security boundary |
| **Agent** | TypeScript/Mastra | 3001 | LLM orchestration, verdict synthesis, trust scoring, persistence handoff | LLM integration isolated from database writes |
| **Compliance Core** | Python/FastAPI | 8000 | Deterministic extraction, wage validation, DBWD lookup | Source of compliance truth |
| **Data Platform** | Python/FastAPI + SQLAlchemy | 8001 | Decision persistence, audit events, contracts, payrolls, analytics | Single source of truth for stored data |

**Critical boundary rule:** The Agent never writes to the database directly. Its Mastra workflow submits `TrustScoredDecision` objects to the Data Platform via `/internal/decisions`, and the Data Platform is the only service that persists official decision records and audit events. Compliance Core never persists; it returns structured extraction and validation results.

## Quick Start

### UI Mock Mode

```bash
git clone <repo-url> && cd wcp-compliance-agent-v5
pnpm install

VITE_MOCK_API=true WCP_MOCK_AUTH=true pnpm dev
```

Open `http://localhost:5173`.

### Full Local Workflow Mock Mode

`LLM_MODE=mock` avoids LLM API keys, but the Agent workflow still calls Compliance Core and Data Platform.

```bash
cd infra
docker compose up -d postgres redis

cd ../apps/compliance-core
poetry install
poetry run uvicorn wcp_compliance.main:app --port 8000

cd ../data-platform
poetry install
poetry run alembic upgrade head
poetry run uvicorn wcp_data.main:app --port 8001

cd ../..
LLM_MODE=mock WCP_MOCK_AUTH=true pnpm dev
```

### Real Mode

```bash
cd infra
docker compose up -d postgres redis

cd ../apps/data-platform
poetry run alembic upgrade head

cd ../..
LLM_MODE=real OPENAI_API_KEY=sk-... pnpm dev
```

## Pipeline

```text
Upload WH-347 (PDF or text)
  |
  |- 1. EXTRACT  Compliance Core parses into ExtractedWCP
  |- 2. VALIDATE Rule engine checks wages, overtime, fringe, signature, totals, classification
  |- 3. VERDICT  Mastra Agent synthesizes verdict with RAG context and citations
  |- 4. TRUST    Four-component weighted score (35/25/20/20)
  `- 5. PERSIST  Data Platform creates DecisionRecord + AuditEvent atomically
```

## Current Verification State

| Layer | Current count | Runner | Status |
|---|---:|---|---|
| Compliance Core unit tests | 75 | pytest | Source-collected; run with Poetry/CI |
| Data Platform unit tests | 63 | pytest | Source-collected; run with Poetry/CI |
| Agent unit tests | 65 | vitest | Passed locally |
| Gateway unit tests | 23 | vitest | Passed locally |
| Web unit tests | 29 | vitest | Passed locally |
| Contracts tests | 19 | vitest | Passed locally |
| **Unit-test total** | **274** | pytest + vitest | TypeScript subset 136/136 passed locally |
| Data Platform integration tests | 24 | pytest | Passed locally with in-memory SQLite fixtures |
| Golden-set eval tests | 93 | pytest parametrization | 92 examples plus one baseline regression; not counted as unit tests |
| End-to-end Docker flow | - | Docker Compose | Not yet fully covered |

```bash
pnpm test                               # All TypeScript tests via Turborepo on supported platforms
cd apps/agent && pnpm test              # 65 vitest tests
cd apps/gateway && pnpm test            # 23 vitest tests
cd apps/web && pnpm test                # 29 vitest tests
cd packages/contracts && pnpm test      # 19 vitest tests
cd apps/compliance-core && poetry run pytest tests/unit tests/eval -v
cd apps/data-platform && poetry run pytest tests/unit tests/integration -v
```

## Key Design Decisions

- **Deterministic validation is the source of compliance truth**: the LLM adds explanation and citations, not correctness.
- **Agent never writes to the database directly**: its Mastra workflow submits `TrustScoredDecision`; Data Platform creates official records.
- **Every decision is traceable**: `x-request-id` and `x-trace-id` propagate through the pipeline and persistence layer.
- **Mock modes are scoped**: `VITE_MOCK_API=true` runs the UI without backend services; `LLM_MODE=mock` runs Agent workflows without LLM API keys.
- **Safe verdict override**: LLM approval is overridden to `rejected` when deterministic violations exist.

## Project Structure

```text
apps/
  web/              React 19 + Vite + Shadcn/ui
  gateway/          Hono + Zod + jose
  agent/            Mastra + AI SDK v6 + Langfuse
  compliance-core/  FastAPI + Pydantic v2 + pdfplumber
  data-platform/    FastAPI + SQLAlchemy + Alembic
packages/
  contracts/        JSON schemas -> codegen (TS + Python)
  observability/    Trace context types
  typescript-client/ ServiceClient with GET/POST/DELETE + timeout
  test-fixtures/    Sample WH-347 files
docs/
  architecture/     Request flow, data ownership, data model, evolution, case study
  adrs/             Architecture decision records
  planning/         Plans, porting audit, known gaps
  operations/       Deployment guide
```

## Documentation

- [Request Flow](docs/architecture/v5-request-flow.md)
- [Service Boundaries](docs/architecture/v5-service-boundaries.md)
- [Data Ownership](docs/architecture/v5-data-ownership.md)
- [Data Model](docs/architecture/v5-data-model.md)
- [V2 to V5 Evolution](docs/architecture/v2-to-v5-evolution.md)
- [Case Study](docs/architecture/case-study.md)
- [ADR Index](docs/adrs/README.md)
- [Known Gaps](docs/planning/v5-known-gaps.md)
- [Deployment Guide](docs/operations/deployment.md)

## License

MIT
