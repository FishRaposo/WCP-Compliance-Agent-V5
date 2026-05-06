# Phase 2: Boot & Fix

**Goal:** All 5 services boot cleanly, `/health` returns 200 on every service, API path mismatches are fixed, dependencies are installed, infrastructure is running.

**Prerequisites:** Phase 1 complete (scaffold exists).
**Status:** ✅ Complete.
**Estimated Time:** 2–3 sessions.

## Task Breakdown

### 2.1 Fix Missing Dependencies

| # | Task | File(s) | Details |
|---|---|---|---|
| 2.1.1 | Add `@hono/node-server` to gateway | `apps/gateway/package.json` | Add to `dependencies`: `"@hono/node-server": "^1.13.0"` |
| 2.1.2 | Add `@hono/node-server` to agent | `apps/agent/package.json` | Add to `dependencies`: `"@hono/node-server": "^1.13.0"` |
| 2.1.3 | Add `dotenv` to gateway | `apps/gateway/package.json` | Gateway needs `dotenv` for `.env` loading |
| 2.1.4 | Verify all workspace refs | `apps/*/package.json` | Ensure `@wcp/observability`, `@wcp/contracts`, `@wcp/typescript-client` are declared with `workspace:*` |
| 2.1.5 | Verify dev dependencies | `apps/*/package.json` | Ensure `typescript`, `tsx`, `vitest` are in devDependencies |

### 2.2 Install All Dependencies

| # | Task | Command | Details |
|---|---|---|---|
| 2.2.1 | Run pnpm install at root | `pnpm install` | Creates `pnpm-lock.yaml`, installs all TS deps |
| 2.2.2 | Poetry install compliance-core | `cd apps/compliance-core && poetry install` | Creates `.venv/`, installs FastAPI, pdfplumber, etc. |
| 2.2.3 | Poetry install data-platform | `cd apps/data-platform && poetry install` | Creates `.venv/`, installs FastAPI, SQLAlchemy, etc. |

### 2.3 Create Environment Files

| # | Task | File | Contents |
|---|---|---|---|
| 2.3.1 | Root `.env.example` | `.env.example` | Document all env vars across all services |
| 2.3.2 | Gateway `.env.example` | `apps/gateway/.env.example` | `JWT_SECRET=dev-secret`, `AUTH_DISABLED=true`, `AGENT_URL=http://localhost:3001`, `COMPLIANCE_CORE_URL=http://localhost:8000`, `DATA_PLATFORM_URL=http://localhost:8001` |
| 2.3.3 | Agent `.env.example` | `apps/agent/.env.example` | `LLM_PROVIDER=openai`, `LLM_MODE=mock`, `COMPLIANCE_CORE_URL=http://localhost:8000`, `DATA_PLATFORM_URL=http://localhost:8001` |
| 2.3.4 | Compliance Core `.env.example` | `apps/compliance-core/.env.example` | `DATA_PLATFORM_URL=http://localhost:8001` |
| 2.3.5 | Data Platform `.env.example` | `apps/data-platform/.env.example` | `DATABASE_URL=postgresql+asyncpg://wcp:wcp_dev_password@localhost:5432/wcp_v5`, `REDIS_URL=redis://localhost:6379` |
| 2.3.6 | Web `.env.example` | `apps/web/.env.example` | `VITE_API_URL=http://localhost:3000`, `VITE_MOCK_API=true` |

### 2.4 Fix API Path Mismatches

| # | Issue | Fix | File(s) |
|---|---|---|---|
| 2.4.1 | Gateway calls `POST /internal/extract/pdf` | Change to `POST /internal/extract` with FormData | `apps/gateway/src/clients/compliance-client.ts` |
| 2.4.2 | No `/internal/auth/validate` on data-platform | Add auth validation endpoint that checks users table | `apps/data-platform/src/wcp_data/api/auth.py` (new), `router.py` (mount it) |
| 2.4.3 | No `/internal/dbwd/<trade>/<locality>/<date>` | Add DBWD lookup route to compliance-core | `apps/compliance-core/src/wcp_compliance/api/dbwd.py` (new), `router.py` (mount it) |
| 2.4.4 | No `/internal/search` on compliance-core | Add stub search route returning empty results | `apps/compliance-core/src/wcp_compliance/api/search.py` (new), `router.py` (mount it) |
| 2.4.5 | Gateway auth route calls data-platform | Verify path matches what we add in 2.4.2 | `apps/gateway/src/routes/auth.ts` |

### 2.5 Start Infrastructure

| # | Task | Command | Details |
|---|---|---|---|
| 2.5.1 | Start PostgreSQL + Redis | `docker compose -f infra/docker-compose.yml up -d` | Verify `pg_isready` and `redis-cli ping` |
| 2.5.2 | Run initial migration | `cd apps/data-platform && poetry run alembic upgrade head` | Creates all tables |
| 2.5.3 | Verify tables created | Connect to Postgres and list tables | `psql -U wcp -d wcp_v5 -c "\dt"` |

### 2.6 Boot Each Service

| # | Task | Command | Expected |
|---|---|---|---|
| 2.6.1 | Boot Compliance Core | `cd apps/compliance-core && poetry run uvicorn wcp_compliance.main:app --port 8000` | `GET /health` → 200 |
| 2.6.2 | Boot Data Platform | `cd apps/data-platform && poetry run uvicorn wcp_data.main:app --port 8001` | `GET /health` → 200 |
| 2.6.3 | Boot Gateway | `cd apps/gateway && pnpm dev` | `GET /health` → 200 |
| 2.6.4 | Boot Agent | `cd apps/agent && pnpm dev` | `GET /health` → 200 |
| 2.6.5 | Boot Web | `cd apps/web && pnpm dev` | `http://localhost:5173` loads |
| 2.6.6 | Boot all via Turborepo | `pnpm dev` from root | All TS services start concurrently |

### 2.7 Verify Quality Gates

| # | Task | Command | Expected |
|---|---|---|---|
| 2.7.1 | TypeScript typecheck | `pnpm typecheck` | Zero errors |
| 2.7.2 | Python ruff (compliance-core) | `cd apps/compliance-core && poetry run ruff check .` | Zero violations |
| 2.7.3 | Python ruff (data-platform) | `cd apps/data-platform && poetry run ruff check .` | Zero violations |
| 2.7.4 | Python mypy (compliance-core) | `cd apps/compliance-core && poetry run mypy src/` | Zero errors |
| 2.7.5 | Python mypy (data-platform) | `cd apps/data-platform && poetry run mypy src/` | Zero errors |
| 2.7.6 | Python tests (compliance-core) | `cd apps/compliance-core && poetry run pytest tests/unit -v` | All pass |
| 2.7.7 | Python tests (data-platform) | `cd apps/data-platform && poetry run pytest tests/unit -v` | All pass |

## Exit Criteria

- [x] `pnpm install` succeeds at root, creates `pnpm-lock.yaml`
- [x] Both Python services have `.venv/` from `poetry install`
- [x] PostgreSQL and Redis are running via Docker Compose (requires Docker; Data Platform supports `SKIP_DB_STARTUP=true` for health-check-only boot)
- [x] All tables created via `alembic upgrade head` (requires running PostgreSQL; migration file verified)
- [x] `GET /health` returns 200 on all 5 services
- [x] `pnpm typecheck` passes with zero errors
- [x] `poetry run ruff check .` passes on both Python services
- [x] `poetry run mypy src/` passes on both Python services
- [x] All existing Python tests pass (CC: 24/24, DP: 7/7)
- [x] No API path mismatches remain between services
- [x] `.env.example` files exist for every service
