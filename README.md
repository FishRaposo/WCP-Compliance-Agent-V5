# WCP Compliance Agent V5

**Automated WH-347 certified payroll compliance validation for Davis-Bacon Act contractors.**

> A five-service monorepo where every service has a single responsibility, a distinct failure mode, and a clear reason to change. Upload a WH-347 payroll PDF and watch it flow through extraction, deterministic validation, LLM verdict synthesis, trust scoring, and auditable persistence — all with distributed tracing.

**373 tests, 0 failures.** Mock mode works with zero dependencies.

---

## Architecture

```
Web (React 19) ──→ Gateway (Hono) ──→ Agent (Vercel AI SDK)
                      │                     │
                      ├──→ Compliance Core (FastAPI) ── deterministic validation
                      │                     
                      └──→ Data Platform (FastAPI + SQLAlchemy) ── persistence
```

| Service | Language | Port | Responsibility | Why It Exists |
|---|---|---|---|---|
| **Web** | TypeScript/React 19 | 5173 | Upload flow, decision display, analytics, review queue | UI state management |
| **Gateway** | TypeScript/Hono | 3000 | Auth, CORS, rate limiting, routing, SSE streaming | Single entry point, security boundary |
| **Agent** | TypeScript/Vercel AI SDK | 3001 | LLM orchestration, verdict synthesis, trust scoring | LLM integration isolated from persistence |
| **Compliance Core** | Python/FastAPI | 8000 | Deterministic extraction, wage validation, DBWD lookup | Source of compliance truth |
| **Data Platform** | Python/FastAPI + SQLAlchemy | 8001 | Decision persistence, audit events, contracts, payrolls, analytics | Single source of truth for all data |

**Critical boundary rule:** The Agent never writes to the database. It returns `TrustScoredDecision` objects, and the Data Platform is the only service that persists them. Compliance Core never persists — it returns structured validation results.

## Quick Start

### Mock Mode (no API keys, no database)

```bash
git clone <repo-url> && cd wcp-compliance-agent-v5
pnpm install

# Start everything in mock mode
VITE_MOCK_API=true WCP_MOCK_AUTH=true LLM_MODE=mock pnpm dev

# Start Python services
cd apps/compliance-core && poetry install && poetry run uvicorn wcp_compliance.main:app --port 8000 &
cd apps/data-platform && poetry install && poetry run uvicorn wcp_data.main:app --port 8001 &

# Open http://localhost:5173
```

### Real Mode

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
cd apps/data-platform && poetry run alembic upgrade head
cd ../.. && python infra/scripts/seed_database.py
LLM_MODE=real OPENAI_API_KEY=sk-... pnpm dev
```

## Pipeline

```
Upload WH-347 (PDF or text)
  │
  ├─ 1. EXTRACT ─── Compliance Core parses into ExtractedWCP
  ├─ 2. VALIDATE ── Rule engine runs 5+ checks per employee against DBWD rates
  ├─ 3. VERDICT ─── LLM agent synthesizes verdict with RAG context + citations
  ├─ 4. TRUST ───── 4-component weighted score (35/25/20/20)
  └─ 5. PERSIST ─── Data Platform creates DecisionRecord + AuditEvent atomically
```

## Testing

| Service | Tests | Framework | What's Covered |
|---|---|---|---|
| Compliance Core | 92 + 93 eval | pytest | Checks, extraction, rules, trust score, DBWD lookup, citation grounding, retrieval |
| Data Platform | 59 | pytest | Repositories, services, API endpoints, event envelope |
| Agent | 62 | vitest | Pipeline, tools, router + fallback, workflow registry, prompts, cost, types |
| Gateway | 22 | vitest | Middleware, routes, auth, config |
| Web | 28 | vitest | Components, API client, mock data, routing |
| Contracts | 17 | vitest | JSON schema validation across all boundaries |
| **Total** | **373** | | **0 failures** |

```bash
pnpm test                               # All TypeScript tests
poetry run pytest tests/unit -v         # Python unit tests
poetry run pytest tests/eval -v         # Golden-set evaluation (92 examples)
```

## Key Design Decisions

- **Deterministic validation is the source of compliance truth** — The LLM adds explanation and citations, not correctness
- **Agent never writes to the database** — Returns `TrustScoredDecision`; Data Platform creates official records
- **Every decision is traceable** — From input artifact through all 5 pipeline steps to persisted record with audit events
- **All cross-service requests carry `x-request-id` and `x-trace-id`** — Request tracing across 16-step flow
- **Mock mode requires zero dependencies** — `VITE_MOCK_API=true LLM_MODE=mock WCP_MOCK_AUTH=true` runs the full stack
- **Safe verdict override** — LLM approval is overridden to "rejected" when deterministic violations exist

## V2 → V5 Evolution

| Version | Services | Key Lesson |
|---|---|---|
| **V2** | 1 (TypeScript monolith) | AI-assisted compliance validation can work, but LLM can't be trusted alone |
| **V3** | 2 (Python + TypeScript) | Deterministic math checks belong in Python; LLM adds context, not correctness |
| **V4** | 3 (Python monolith, TS agent, React) | "Data platform" doing everything is a monolith — unclear reason to change |
| **V5** | 5 (by responsibility) | Each service has a distinct failure mode, test strategy, and scaling pattern |

## Project Structure

```
├── apps/
│   ├── web/              React 19 + Vite + Shadcn/ui
│   ├── gateway/          Hono + Zod + jose
│   ├── agent/            Vercel AI SDK + Langfuse
│   ├── compliance-core/  FastAPI + Pydantic v2 + pdfplumber
│   └── data-platform/    FastAPI + SQLAlchemy + Alembic
├── packages/
│   ├── contracts/        JSON schemas → codegen (TS + Python)
│   ├── observability/    Trace context types
│   ├── typescript-client/ ServiceClient with GET/POST/DELETE + timeout
│   └── test-fixtures/    Sample WH-347 files
├── infra/                Docker Compose (dev + prod)
├── docs/
│   ├── architecture/     Request flow, data ownership, data model, evolution, case study
│   ├── adrs/             7 architecture decision records
│   ├── planning/         Phase plans, implementation plan, porting audit, known gaps
│   └── operations/       Deployment guide
├── scripts/              Demo script, seed scripts
├── tests/                E2E smoke test
└── .github/workflows/    CI (3 parallel jobs) + weekly golden-set eval
```

## CI/CD

| Pipeline | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Push/PR to master | TypeScript (typecheck → lint → build → test), Compliance Core (ruff → mypy → pytest), Data Platform (ruff → mypy → pytest) |
| `eval.yml` | Weekly (Monday) + manual | Golden-set evaluation with regression detection |

## Commands

```bash
pnpm dev          # Start all TS services in parallel
pnpm build        # Build all TS packages
pnpm typecheck    # Type check all TS packages
pnpm test         # Run all TS tests

# Python
cd apps/compliance-core && poetry run pytest tests/unit -v
cd apps/data-platform && poetry run pytest tests/unit -v
```

## Documentation

- [Request Flow](docs/architecture/v5-request-flow.md) — 16-step sequence diagram
- [Data Ownership](docs/architecture/v5-data-ownership.md) — 13-entity R/W matrix
- [Data Model](docs/architecture/v5-data-model.md) — 7 tables with relationships
- [V2→V5 Evolution](docs/architecture/v2-to-v5-evolution.md) — Version history and lessons
- [Case Study](docs/architecture/case-study.md) — Problem, architecture, pipeline, RAG, lessons learned
- [ADR Index](docs/adrs/README.md) — 7 architecture decisions
- [Porting Audit](docs/planning/v5-porting-audit.md) — 76/88 V3 files ported
- [Known Gaps](docs/planning/v5-known-gaps.md) — Documented limitations
- [Deployment Guide](docs/operations/deployment.md) — Docker Compose, env vars, scaling

## License

MIT
