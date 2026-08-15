# WCP Compliance Agent V5

**Production-ready WH-347 compliance platform: deterministic validation decides, the LLM explains, and every decision is traceable.**

V5 is a five-service monorepo where each service has one clear responsibility. A payroll flows through extraction, deterministic validation, Mastra-based verdict synthesis, trust scoring, and audited persistence with request and trace IDs propagated across service boundaries.

**Shipped proof:** the offline portfolio path runs without credentials, Docker, Redis,
PostgreSQL, or network access. The current TypeScript gate covers 42 Contracts, 66
Agent, 45 Gateway, and 29 Web tests, plus four tooling tests. Compliance Core passed
84 unit tests and 101 eval tests over 100 golden examples and one baseline regression.
The Python 3.12/Poetry and optional-infrastructure gates run in CI.

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

### Prerequisites and install

- Node.js 20 and pnpm 9.15.0 (the exact pnpm version is declared in `package.json`).
- Python 3.12 and Poetry 1.8.5 for the two Python services.

```bash
pnpm install --frozen-lockfile

cd apps/compliance-core
poetry install --no-interaction

cd ../data-platform
poetry install --no-interaction
```

### Credential-free portfolio proof

```bash
pnpm evidence
pnpm test:e2e
```

`pnpm evidence` executes the fixed five-service scenario through local adapters,
writes a normalized bundle under `artifacts/portfolio/`, verifies its checksums, and
compares it with the tracked golden fixture. `pnpm test:e2e` runs desktop and mobile
browser smoke tests with `VITE_MOCK_API=true`. See
[Portfolio Evidence](docs/portfolio-evidence.md) for the bundle and replay contract.

### UI Mock Mode

```bash
git clone <repo-url> && cd wcp-compliance-agent-v5
pnpm install --frozen-lockfile

VITE_MOCK_API=true WCP_MOCK_AUTH=true pnpm dev
```

Open `http://localhost:5173`.

### Full Local Workflow Mock Mode

`LLM_MODE=mock` avoids LLM API keys, but the Agent workflow still calls Compliance Core and Data Platform.

```bash
cd infra
docker compose up -d postgres redis

cd ../apps/compliance-core
poetry install --no-interaction
poetry run uvicorn wcp_compliance.main:app --port 8000

cd ../data-platform
poetry install --no-interaction
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
| Compliance Core unit tests | 84 | pytest | Passed locally in the project virtual environment |
| Compliance Core eval tests | 101 | pytest | 100 examples plus one baseline regression passed |
| Data Platform unit/integration | command gate | pytest | Python 3.12/Poetry CI job; PostgreSQL and Redis are service fixtures for integration |
| Agent tests | 66 | vitest | Passed in the finalization gate |
| Gateway tests | 45 | vitest | Passed in the finalization gate |
| Web tests | 29 | vitest | Passed in the finalization gate |
| Contracts tests | 42 | vitest | Passed in the finalization gate |
| Tooling contract tests | 4 | node:test | Passed in the finalization gate |
| Browser smoke | 2 | Playwright | Desktop Chromium-compatible Chrome and 390x844 mobile passed |
| Portfolio evidence | 1 bundle | SHA-256 verifier | Passed with reproducibility hash pinned in the fixture |

```bash
pnpm test                               # TypeScript and tooling tests via Turborepo
pnpm test:golden                        # Compliance Core golden-set regression gate
pnpm evidence                           # Generate and verify the offline evidence bundle
pnpm test:e2e                           # Desktop and mobile browser smoke tests in UI mock mode
cd apps/compliance-core && poetry run pytest tests/unit tests/eval -v
cd apps/data-platform && poetry run pytest tests/unit tests/integration -v
```

## Key Design Decisions

- **Deterministic validation is the source of compliance truth**: the LLM adds explanation and citations, not correctness.
- **Agent never writes to the database directly**: its Mastra workflow submits `TrustScoredDecision`; Data Platform creates official records.
- **Every decision is traceable**: `x-request-id` and `x-trace-id` propagate through the pipeline and persistence layer.
- **Mock modes are scoped**: `VITE_MOCK_API=true` runs the UI without backend services; `LLM_MODE=mock` runs Agent workflows without LLM API keys.
- **Offline composition is a proof adapter, not a new source of truth**: it invokes
  the canonical Compliance Core engine, then exercises Agent, Data Platform, cache,
  SSE, audit, and UI-fixture contracts in one deterministic scenario.
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
- [Setup and Entry Points](docs/operations/setup-and-entrypoints.md)
- [Security](docs/operations/security.md)
- [Failure Modes](docs/operations/failure-modes.md)
- [Testing](docs/testing.md)
- [Portfolio Evidence](docs/portfolio-evidence.md)
- [Known Gaps](docs/planning/v5-known-gaps.md)
- [Deployment Guide](docs/operations/deployment.md)

The documents under `docs/planning/` that describe the V3/V4 port are historical
execution records. Current capability and deferred-boundary claims live in this
README, `docs/planning/v5-known-gaps.md`, and the operational documents above.

## License

MIT
