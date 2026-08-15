# Phase 1: Monorepo Skeleton

> **Historical phase record.** Status and checkboxes below describe the original build sequence.

**Goal:** Create the complete V5 monorepo structure with all 5 services, shared packages, infrastructure config, and ported business logic. Every service has its config, entry point, models, and API routes scaffolded.

**Prerequisites:** Phase 0 complete (decisions locked).
**Status:** ✅ Complete.
**Estimated Time:** 3–4 sessions.

## Task Breakdown

### 1.1 Root Configuration

| # | Task | File | Status |
|---|---|---|---|
| 1.1.1 | Turborepo pipeline config | `turbo.json` | ✅ dev, build, typecheck, lint, test pipelines |
| 1.1.2 | pnpm workspace declaration | `pnpm-workspace.yaml` | ✅ `apps/*` + `packages/*` |
| 1.1.3 | Root package.json with scripts | `package.json` | ✅ turbo devDependency, all script entries |
| 1.1.4 | Git ignore | `.gitignore` | ✅ node_modules, dist, .env, __pycache__, .turbo, _archive |
| 1.1.5 | Initialize git repository | `.git/` | ✅ |

### 1.2 Infrastructure

| # | Task | File | Status |
|---|---|---|---|
| 1.2.1 | Docker Compose for PostgreSQL + Redis | `infra/docker-compose.yml` | ✅ pgvector/pgvector:pg16, redis:7-alpine |
| 1.2.2 | Mock compose override | `infra/docker-compose.mock.yml` | ✅ |
| 1.2.3 | Mock environment vars | `infra/.env.mock` | ✅ |

### 1.3 Shared Packages

| # | Task | File | Status | Details |
|---|---|---|---|---|
| 1.3.1 | Contract schemas (8 JSON schemas) | `packages/contracts/schemas/*.json` | ✅ | extracted-wcp, deterministic-report, decision-draft, decision-record, audit-event, contract, payroll-record, ingestion-job |
| 1.3.2 | Codegen script | `packages/contracts/generate.py` | ✅ | Produces TS (Zod) + Python (Pydantic) from JSON schemas |
| 1.3.3 | TypeScript HTTP client | `packages/typescript-client/src/index.ts` | ✅ | ServiceClient with GET/POST/PATCH/DELETE/postForm, timeout, error handling |
| 1.3.4 | Observability utilities | `packages/observability/src/index.ts` | ✅ | TraceContext, traceHeaders(), SPAN_NAMES constants |
| 1.3.5 | Test fixtures package | `packages/test-fixtures/` | ✅ | Empty scaffold for golden-set + sample PDFs |

### 1.4 Compliance Core Service (Python)

| # | Task | File | Status | Lines Ported |
|---|---|---|---|---|
| 1.4.1 | Poetry config | `apps/compliance-core/pyproject.toml` | ✅ | Python 3.12, FastAPI, pdfplumber, Pydantic v2 |
| 1.4.2 | App factory + lifespan | `apps/compliance-core/src/wcp_compliance/main.py` | ✅ | CORS, health check, router mount |
| 1.4.3 | Pydantic Settings config | `apps/compliance-core/src/wcp_compliance/config.py` | ✅ | Production safety validators |
| 1.4.4 | Core data models | `apps/compliance-core/src/wcp_compliance/models/schemas.py` | ✅ | 138 lines — all V3 Pydantic models ported |
| 1.4.5 | Enum definitions | `apps/compliance-core/src/wcp_compliance/models/enums.py` | ✅ | 43 lines — all V3 enums ported |
| 1.4.6 | Trade alias normalization | `apps/compliance-core/src/wcp_compliance/normalization/trade_aliases.py` | ✅ | 79 lines — 68-entry alias map + resolve_classification() |
| 1.4.7 | PDF/text extraction engine | `apps/compliance-core/src/wcp_compliance/extraction/pdf_extractor.py` | ✅ | 340 lines — pdfplumber extraction with table + field parsing |
| 1.4.8 | Wage rate check | `apps/compliance-core/src/wcp_compliance/checks/wage_check.py` | ✅ | 40 U.S.C. §3142 citation |
| 1.4.9 | Overtime check | `apps/compliance-core/src/wcp_compliance/checks/overtime_check.py` | ✅ | 29 C.F.R. §5.32 citation |
| 1.4.10 | Fringe benefit check | `apps/compliance-core/src/wcp_compliance/checks/fringe_check.py` | ✅ | 40 U.S.C. §3141(2)(B) citation |
| 1.4.11 | Signature check | `apps/compliance-core/src/wcp_compliance/checks/signature_check.py` | ✅ | 29 C.F.R. §5.5(a)(3)(ii)(B) citation |
| 1.4.12 | Total arithmetic check | `apps/compliance-core/src/wcp_compliance/checks/total_check.py` | ✅ | 29 C.F.R. §5.5(a)(3)(i) citation |
| 1.4.13 | Rule engine orchestrator | `apps/compliance-core/src/wcp_compliance/rules/engine.py` | ✅ | ~150 lines — orchestrates all checks per employee |
| 1.4.14 | Trust score computation | `apps/compliance-core/src/wcp_compliance/rules/trust_score.py` | ✅ | ~100 lines — weighted 4-component formula |
| 1.4.15 | DBWD rate lookup | `apps/compliance-core/src/wcp_compliance/dbwd_matching/rate_lookup.py` | ✅ | 271 lines — 20-trade corpus, alias resolution, Levenshtein fuzzy match |
| 1.4.16 | API router | `apps/compliance-core/src/wcp_compliance/api/router.py` | ✅ | Mounts health, extract, validate |
| 1.4.17 | Health endpoint | `apps/compliance-core/src/wcp_compliance/api/health.py` | ✅ | GET /health |
| 1.4.18 | Extract endpoint | `apps/compliance-core/src/wcp_compliance/api/extract.py` | ✅ | POST /internal/extract — text or PDF |
| 1.4.19 | Validate endpoint | `apps/compliance-core/src/wcp_compliance/api/validate.py` | ✅ | POST /internal/validate + POST /internal/extract-and-validate |
| 1.4.20 | Unit test stubs (5 files) | `apps/compliance-core/tests/unit/*.py` | ✅ | conftest + 5 test files |

### 1.5 Data Platform Service (Python)

| # | Task | File | Status | Details |
|---|---|---|---|---|
| 1.5.1 | Poetry config | `apps/data-platform/pyproject.toml` | ✅ | Python 3.12, FastAPI, SQLAlchemy async, asyncpg, Alembic |
| 1.5.2 | Alembic config | `apps/data-platform/alembic.ini` | ✅ | Points to `src/wcp_data/migrations/` |
| 1.5.3 | App factory + lifespan | `apps/data-platform/src/wcp_data/main.py` | ✅ | CORS, init_db on startup, router mount |
| 1.5.4 | Pydantic Settings config | `apps/data-platform/src/wcp_data/config.py` | ✅ | DATABASE_URL, REDIS_URL |
| 1.5.5 | Async DB engine + session | `apps/data-platform/src/wcp_data/db/session.py` | ✅ | create_async_engine, async_sessionmaker, get_session dependency |
| 1.5.6 | SQLAlchemy table definitions | `apps/data-platform/src/wcp_data/models/tables.py` | ✅ | 7 tables: decisions, audit_events, contracts, payroll_records, ingestion_jobs, dbwd_rates, users |
| 1.5.7 | Pydantic request/response schemas | `apps/data-platform/src/wcp_data/models/schemas.py` | ✅ | All entity schemas with validators |
| 1.5.8 | Consolidated initial migration | `apps/data-platform/src/wcp_data/migrations/versions/001_initial.py` | ✅ | V3 migrations 001-006 merged into one |
| 1.5.9 | Alembic async env | `apps/data-platform/src/wcp_data/migrations/env.py` | ✅ | Async migration runner |
| 1.5.10 | Decision repository | `apps/data-platform/src/wcp_data/repositories/decision_repo.py` | ✅ | CRUD with pagination/filtering |
| 1.5.11 | Audit event repository | `apps/data-platform/src/wcp_data/repositories/audit_repo.py` | ✅ | Create + list |
| 1.5.12 | Contract repository | `apps/data-platform/src/wcp_data/repositories/contract_repo.py` | ✅ | CRUD + duplicate detection |
| 1.5.13 | Payroll repository | `apps/data-platform/src/wcp_data/repositories/payroll_repo.py` | ✅ | Bulk import + partition creation |
| 1.5.14 | DBWD repository | `apps/data-platform/src/wcp_data/repositories/dbwd_repo.py` | ✅ | Rate storage + retrieval |
| 1.5.15 | Artifact repository (stub) | `apps/data-platform/src/wcp_data/repositories/artifact_repo.py` | ✅ | Placeholder |
| 1.5.16 | Decision service | `apps/data-platform/src/wcp_data/services/decision_service.py` | ✅ | Creates DecisionRecord + AuditEvents from TrustScoredDecision |
| 1.5.17 | Audit service | `apps/data-platform/src/wcp_data/services/audit_service.py` | ✅ | Audit trail management |
| 1.5.18 | Contract service | `apps/data-platform/src/wcp_data/services/contract_service.py` | ✅ | Business logic with bulk import |
| 1.5.19 | Payroll service | `apps/data-platform/src/wcp_data/services/payroll_service.py` | ✅ | Bulk import with partitioning |
| 1.5.20 | DBWD service | `apps/data-platform/src/wcp_data/services/dbwd_service.py` | ✅ | Rate retrieval + refresh stub |
| 1.5.21 | API router (9 sub-routers) | `apps/data-platform/src/wcp_data/api/router.py` | ✅ | health, artifacts, decisions, audit_events, contracts, payrolls, dbwd, ingestion, analytics |
| 1.5.22 | All API route files (9 files) | `apps/data-platform/src/wcp_data/api/*.py` | ✅ | Full CRUD routes on each |
| 1.5.23 | Unit test stubs (4 files) | `apps/data-platform/tests/unit/*.py` | ✅ | conftest + 4 test files |

### 1.6 Gateway Service (TypeScript)

| # | Task | File | Status | Details |
|---|---|---|---|---|
| 1.6.1 | Package.json | `apps/gateway/package.json` | ✅ | Hono, Zod, jose, workspace deps |
| 1.6.2 | TypeScript config | `apps/gateway/tsconfig.json` | ✅ | ES2022, strict, `@/*` alias |
| 1.6.3 | Hono server entry | `apps/gateway/src/server.ts` | ✅ | Middleware chain, route mounting |
| 1.6.4 | Zod-validated config | `apps/gateway/src/config.ts` | ✅ | Service URLs, JWT secret, rate limits |
| 1.6.5 | JWT auth middleware | `apps/gateway/src/middleware/auth.ts` | ✅ | jose HS256, AUTH_DISABLED mode |
| 1.6.6 | CORS middleware | `apps/gateway/src/middleware/cors.ts` | ✅ | Configurable origins |
| 1.6.7 | Rate limiter middleware | `apps/gateway/src/middleware/rate-limiter.ts` | ✅ | In-memory sliding window |
| 1.6.8 | Request ID middleware | `apps/gateway/src/middleware/request-id.ts` | ✅ | Generate or pass-through |
| 1.6.9 | JWT signing utility | `apps/gateway/src/auth/jwt.ts` | ✅ | signToken() with jose |
| 1.6.10 | Agent service client | `apps/gateway/src/clients/agent-client.ts` | ✅ | startAnalysis, getWorkflowStatus |
| 1.6.11 | Compliance Core client | `apps/gateway/src/clients/compliance-client.ts` | ✅ | extractText, extractPdf, validate |
| 1.6.12 | Data Platform client | `apps/gateway/src/clients/data-platform-client.ts` | ✅ | Full CRUD for all entities |
| 1.6.13 | Health route | `apps/gateway/src/routes/health.ts` | ✅ | GET /health |
| 1.6.14 | Auth route | `apps/gateway/src/routes/auth.ts` | ✅ | POST /api/v1/auth/login |
| 1.6.15 | Analyze route | `apps/gateway/src/routes/analyze.ts` | ✅ | POST /api/v1/analyze |
| 1.6.16 | Analyze PDF route | `apps/gateway/src/routes/analyze-pdf.ts` | ✅ | POST /api/v1/analyze/pdf |
| 1.6.17 | Decisions route | `apps/gateway/src/routes/decisions.ts` | ✅ | GET list + GET by ID |
| 1.6.18 | Contracts route | `apps/gateway/src/routes/contracts.ts` | ✅ | Full CRUD + bulk |
| 1.6.19 | Payrolls route | `apps/gateway/src/routes/payrolls.ts` | ✅ | List + bulk import |
| 1.6.20 | Ingestion route | `apps/gateway/src/routes/ingestion.ts` | ✅ | Create + get jobs |
| 1.6.21 | Analytics route | `apps/gateway/src/routes/analytics.ts` | ✅ | Overview proxy |

### 1.7 Agent Orchestration Service (TypeScript)

| # | Task | File | Status | Details |
|---|---|---|---|---|
| 1.7.1 | Package.json | `apps/agent/package.json` | ✅ | Mastra, AI SDK v6, Langfuse, workspace deps |
| 1.7.2 | TypeScript config | `apps/agent/tsconfig.json` | ✅ | ES2022, strict, `@/*` alias |
| 1.7.3 | Hono internal server | `apps/agent/src/server.ts` | ✅ | Health + workflow routes |
| 1.7.4 | Zod-validated config | `apps/agent/src/config.ts` | ✅ | Multi-provider LLM, mock mode, Langfuse |
| 1.7.5 | Zod type definitions | `apps/agent/src/types.ts` | ✅ | Full domain model as Zod schemas |
| 1.7.6 | WCP verdict agent | `apps/agent/src/agents/wcp-verdict.ts` | ✅ | generateObject with structured output, mock mode |
| 1.7.7 | Trust score computation | `apps/agent/src/agents/trust-score.ts` | ✅ | Weighted formula + safeVerdict() enforcement |
| 1.7.8 | 5-step pipeline workflow | `apps/agent/src/workflows/wcp-pipeline.ts` | ✅ | extract → validate → verdict → trust → persist |
| 1.7.9 | Extract tool | `apps/agent/src/tools/extract.ts` | ✅ | Calls Compliance Core |
| 1.7.10 | Validate tool | `apps/agent/src/tools/validate.ts` | ✅ | Calls Compliance Core |
| 1.7.11 | DBWD lookup tool | `apps/agent/src/tools/dbwd-lookup.ts` | ✅ | Calls Compliance Core |
| 1.7.12 | Search tool (stub) | `apps/agent/src/tools/search.ts` | ✅ | Placeholder for future RAG |
| 1.7.13 | Persist tool | `apps/agent/src/tools/persist.ts` | ✅ | Calls Data Platform |
| 1.7.14 | Prompt registry | `apps/agent/src/prompts/registry.ts` | ✅ | Langfuse-hosted + local fallback |
| 1.7.15 | V1 prompt template | `apps/agent/src/prompts/versions/wcp-verdict-v1.ts` | ✅ | Davis-Bacon compliance review |
| 1.7.16 | LLM router | `apps/agent/src/model-router/llm-router.ts` | ✅ | Context-aware provider selection + fallback chain |
| 1.7.17 | Langfuse client | `apps/agent/src/observability/langfuse.ts` | ✅ | Lazy singleton |
| 1.7.18 | Cost tracking | `apps/agent/src/observability/cost-tracking.ts` | ✅ | Per-model cost lookup |
| 1.7.19 | Tracing helpers | `apps/agent/src/observability/tracing.ts` | ✅ | Span creation |
| 1.7.20 | Workflow routes | `apps/agent/src/routes/workflows.ts` | ✅ | Pipeline entry points |
| 1.7.21 | Health route | `apps/agent/src/routes/health.ts` | ✅ | GET /health |

### 1.8 Web App (React)

| # | Task | File | Status | Details |
|---|---|---|---|---|
| 1.8.1 | Package.json + Vite config | `apps/web/package.json`, `vite.config.ts` | ✅ | React 19, TanStack Query, proxy to Gateway |
| 1.8.2 | TypeScript + Tailwind config | `apps/web/tsconfig.json`, `tailwind.config.ts` | ✅ | Strict mode, Shadcn CSS variables |
| 1.8.3 | App shell + routing | `apps/web/src/App.tsx` | ✅ | 7 routes, auth guard, 404 catch-all |
| 1.8.4 | 8 Shadcn UI primitives | `apps/web/src/components/ui/*.tsx` | ✅ | badge, button, card, input, select, separator, skeleton, textarea |
| 1.8.5 | 8 feature components | `apps/web/src/components/*.tsx` | ✅ | Layout, ErrorBoundary, UploadDropzone, PipelineVisualizer, DecisionCard, TrustScoreBadge, HumanReviewQueue, AuditTrail, CostDashboard |
| 1.8.6 | 7 page components | `apps/web/src/pages/*.tsx` | ✅ | Login, Dashboard, Analyze, Decisions, ReviewQueue, Analytics, Settings |
| 1.8.7 | 4 TanStack Query hooks | `apps/web/src/hooks/*.ts` | ✅ | useAnalyze, useDecisions, useDecisionStream, useAnalytics |
| 1.8.8 | API client with mock mode | `apps/web/src/utils/api-client.ts` | ✅ | JWT auth, 401 redirect, 17+ mock fixtures |
| 1.8.9 | Mock data fixtures | `apps/web/src/utils/mock-data.ts` | ✅ | 309 lines of comprehensive fixtures |
| 1.8.10 | TypeScript types | `apps/web/src/types/api.ts` | ✅ | Full domain model |
| 1.8.11 | Entry points + CSS | `apps/web/src/main.tsx`, `index.css`, `index.html` | ✅ | React 19 bootstrap, Tailwind directives |

### 1.9 Documentation

| # | Task | File | Status |
|---|---|---|---|
| 1.9.1 | AGENTS.md | `AGENTS.md` | ✅ |
| 1.9.2 | README.md | `README.md` | ✅ |
| 1.9.3 | CHANGELOG.md | `CHANGELOG.md` | ✅ |
| 1.9.4 | llms.txt | `llms.txt` | ✅ |
| 1.9.5 | Service boundaries doc | `docs/architecture/v5-service-boundaries.md` | ✅ |
| 1.9.6 | Implementation plan | `docs/planning/v5-implementation-plan.md` | ✅ |
| 1.9.7 | Porting guide | `docs/planning/v5-porting-guide.md` | ✅ |
| 1.9.8 | 6 ADRs | `docs/adrs/0001-0006*.md` | ✅ |

## Exit Criteria

- [x] Root config: `turbo.json`, `pnpm-workspace.yaml`, `package.json`, `.gitignore`
- [x] Infrastructure: `docker-compose.yml` with PostgreSQL 16 (pgvector) + Redis 7
- [x] 8 JSON schemas in `packages/contracts/schemas/`
- [x] Codegen script at `packages/contracts/generate.py`
- [x] Shared TypeScript client at `packages/typescript-client/`
- [x] Shared observability at `packages/observability/`
- [x] Compliance Core: 26 files, real extraction + checks + rules + DBWD
- [x] Data Platform: 43 files, real DB + tables + repos + services + API
- [x] Gateway: 22 files, real Hono server + auth + middleware + routes + clients
- [x] Agent: 21 files, real Mastra agents + pipeline + tools + router + prompts
- [x] Web: 44 files, real React 19 + 7 pages + 17 components + mock data
- [x] 6 ADRs written
- [x] Git repository initialized

## What's NOT Done (Why Phase 2 Exists)

- No `pnpm install` run — no lockfile, no node_modules (except web)
- No `poetry install` run — no Python venvs
- `@hono/node-server` missing from gateway and agent package.json
- 5 API path mismatches between services
- No `.env.example` files
- No seed scripts
- No generated contract types (codegen never run)
- Tests are stubs (10 files, minimal assertions)
