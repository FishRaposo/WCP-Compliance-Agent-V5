# V5 Implementation Plan

> **Historical plan.** This checklist records the original V5 build sequence. It is
> not the current roadmap and its unchecked boxes are not current-state assertions.
> See `README.md`, `docs/testing.md`, and `docs/planning/v5-known-gaps.md` for the
> finalized repository state and deliberate deferrals.

## Phase 0: Architecture Freeze (Complete)

**Goal:** Lock all decisions, create repo skeleton.

| Item | Status |
|---|---|
| Design document | ✅ Complete |
| Service boundary decisions | ✅ Gateway + Agent split, Data Platform extraction |
| DBWD ownership | ✅ Compliance Core matching, Data Platform storage |
| Tech choices | ✅ Hono gateway, Python Data Platform, Turborepo monorepo |
| MVP scope | ✅ Minimal vertical slice (defer ES, Prefect, Celery, Parquet, GE, Redis Streams) |
| ADRs 0001–0006 | ✅ Written |
| Monorepo skeleton | ✅ Created |
| Shared contracts package | ✅ Created with 8 JSON schemas |

## Phase 1: Monorepo Skeleton (Complete)

**Goal:** All 5 services boot with `/health`, CI can lint/type/test.

| Item | Status |
|---|---|
| Root: turbo.json, pnpm-workspace.yaml, .gitignore | ✅ |
| apps/web: React 19 + Vite + Tailwind + Shadcn/ui | ✅ |
| apps/gateway: Hono server, health, auth, middleware stubs | ✅ |
| apps/agent: Hono server, health, Mastra skeleton | ✅ |
| apps/compliance-core: FastAPI, /health, Pydantic models | ✅ |
| apps/data-platform: FastAPI, /health, SQLAlchemy, Alembic | ✅ |
| infra/docker-compose.yml (PostgreSQL + Redis) | ✅ |
| packages/contracts: JSON schemas + codegen | ✅ |

**Exit criteria:**
- [ ] All TS services boot on `pnpm dev`
- [ ] All Python services boot on `poetry run uvicorn`
- [ ] All services return `/health` 200
- [ ] CI runs basic lint/type/test

## Phase 2: Boot & Fix (Complete)

**Goal:** All 5 services boot with `/health`, CI can lint/type/test.

| Item | Status |
|---|---|
| `@hono/node-server` dependency in gateway + agent | ✅ Fixed |
| `pnpm-lock.yaml` regenerated | ✅ Created |
| Python `.venv/` created for both Python services | ✅ Created |
| `.env.example` files for all 5 services | ✅ Created |
| 5 API path mismatches resolved | ✅ Fixed |
| Gateway → Agent analysis flow | ✅ Wired |
| Agent → Compliance Core extraction + validation | ✅ Wired |
| Agent → Data Platform decision + audit persistence | ✅ Wired |
| DBWD seed scripts ready | ✅ `scripts/seed_dbwd.py` |
| Dev user seed script ready | ✅ `scripts/seed_user.py` |

**Exit criteria:**
- [x] All TS services boot on `pnpm dev`
- [x] All Python services boot on `poetry run uvicorn`
- [x] All 4 TS services return `/health` 200 (Web serves HTML)
- [x] Data Platform boots with `SKIP_DB_STARTUP=true`
- [x] CI runs lint/type/test (Windows: ruff 0, mypy 0, typecheck 0, tests all pass)

## Phase 3: Contracts & Types (Complete)

**Goal:** Codegen produces valid TS + Python types, hand-written types aligned, contract tests pass.

| Item | Status |
|---|---|
| Run codegen: `generate.py` → valid TS + Python | ✅ Done |
| TS output compiles (`pnpm typecheck` passes) | ✅ Done |
| Python output imports successfully | ✅ Done |
| CC enums aligned to JSON schema values | ✅ Done |
| Agent types aligned to JSON schema values | ✅ Done |
| Web types aligned to JSON schema values | ✅ Done |
| Workspace package imports resolve | ✅ Verified |
| Schema validation test (17 tests) | ✅ Passing |
| Gateway → Agent contract test | ✅ Passing |
| Gateway → Data Platform contract test | ✅ Passing |
| Agent → Compliance Core contract test | ✅ Passing |
| Agent → Data Platform contract test | ✅ Passing |
| DBWD seed script | ✅ `scripts/seed_dbwd.py` |
| User seed script | ✅ `scripts/seed_user.py` |

**Exit criteria:**
- [x] `python3 packages/contracts/generate.py` produces valid TS + Python without errors
- [x] Generated TypeScript types compile with `tsc --noEmit` (via full `pnpm typecheck`)
- [x] Generated Python types import successfully
- [x] Hand-written types in all services align with JSON schemas (no missing fields)
- [x] All workspace package imports resolve
- [x] 25 contract tests pass (17 schema + 8 contract)

**Goal:** One full WH-347 analysis works locally end-to-end.

| Item | Status |
|---|---|
| Port extraction engine (340 lines) | ✅ Ported |
| Port all 5 compliance checks (~430 lines) | ✅ Ported |
| Port rule engine + trust score (~250 lines) | ✅ Ported |
| Port DBWD rate lookup with in-memory corpus | ✅ Ported |
| Wire Compliance Core /internal/extract and /internal/validate | ✅ Wired |
| Port DB tables + audit logic to Data Platform | ✅ Ported |
| Write consolidated initial migration | ✅ Written |
| Wire Data Platform decision + audit + artifact routes | ✅ Wired |
| Port LLM verdict agent | ✅ Ported |
| Port trust score computation | ✅ Ported |
| Port 5-step pipeline workflow | ✅ Ported |
| Port LLM router with fallback chain | ✅ Ported |
| Port prompt registry + templates | ✅ Ported |
| Wire Agent tools (extract, validate, dbwd, persist) | ✅ Wired |
| Port Gateway auth + JWT signing | ✅ Ported |
| Port Gateway analyze + analyze-pdf routes | ✅ Ported |
| Port Gateway auth middleware + rate limiter | ✅ Ported |
| Port Web api-client + mock data + hooks | ✅ Ported |
| Port Web pages (Login, Dashboard, Analyze, Decisions, Review) | ✅ Ported |
| Port Web components (DecisionCard, TrustScoreBadge, etc.) | ✅ Ported |
| Seed DBWD data into Data Platform | ⬜ Run seed script |
| Write E2E smoke test | ⬜ Write test |
| Wire turbo.json dev pipeline | ⬜ Verify |

**Exit criteria:**
- [ ] Upload WH-347 PDF → Gateway validates → Agent orchestrates → Compliance Core extracts and validates → Agent synthesizes verdict → Data Platform persists decision and audit event → Web displays result
- [ ] Trace ID connects the full request path
- [ ] Decision is persisted through Data Platform only
- [ ] Agent never writes directly to database

## Phase 4: V4 Data Platform Feature Migration (Future)

| Item | Status |
|---|---|
| Contract CRUD with bulk import | ⬜ |
| Payroll record storage with partitioning | ⬜ |
| Bulk CSV ingestion pipeline | ⬜ |
| Ingestion job status tracking | ⬜ |
| DBWD rate snapshots and refresh | ⬜ |
| DuckDB analytics queries | ⬜ |
| Redis Streams event publishing | ⬜ |
| Parquet archive export | ⬜ |
| Great Expectations data quality | ⬜ |
| Prefect ETL flows | ⬜ |

## Phase 5: Observability and Eval Hardening (Future)

| Item | Status |
|---|---|
| Langfuse prompt tracking | ⬜ |
| OpenTelemetry traces across all services | ⬜ |
| Golden-set CI | ⬜ |
| Cost and latency tracking | ⬜ |
| Prompt/version comparison | ⬜ |

## Phase 6: README and Portfolio Packaging (Future)

| Item | Status |
|---|---|
| Final README | ⬜ |
| Architecture diagrams | ⬜ |
| ADR index | ⬜ |
| V2 to V5 evolution writeup | ⬜ |
| Demo GIFs | ⬜ |
| llms.txt | ⬜ |
