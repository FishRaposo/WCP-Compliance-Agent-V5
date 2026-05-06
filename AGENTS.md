# AGENTS.md

## Five-Service Architecture

V5 is a monorepo with five services, managed by Turborepo + pnpm workspaces.

| Service | Stack | Port | Package Manager |
|---|---|---|---|
| **web** | React 19, Vite, Tailwind, Shadcn/ui, TanStack Query | 5173 | pnpm |
| **gateway** | TypeScript, Hono, Zod, jose (JWT) | 3000 | pnpm |
| **agent** | TypeScript, Mastra, Vercel AI SDK, Langfuse | 3001 | pnpm |
| **compliance-core** | Python 3.12, FastAPI, Pydantic v2, pdfplumber | 8000 | Poetry |
| **data-platform** | Python 3.12, FastAPI, SQLAlchemy, Alembic | 8001 | Poetry |

Infrastructure: PostgreSQL 16 (pgvector), Redis 7.

## Test Tally: 271 tests, 0 failures

| Service | Tests | Framework |
|---|---|---|
| Compliance Core | 66 + 73 eval | pytest |
| Data Platform | 30 | pytest |
| Agent | 55 | vitest |
| Gateway | 20 | vitest |
| Web | 10 | vitest |
| Contracts | 17 | vitest |

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

### Agent

```bash
cd apps/agent
pnpm dev                      # tsx watch on port 3001
pnpm typecheck                # tsc --noEmit
pnpm test                     # vitest run
```

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

Three parallel Turborepo pipelines on push/PR to master:

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
