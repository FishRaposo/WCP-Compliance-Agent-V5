# Setup and entry points

## Supported toolchains

- Node.js 20 with pnpm 9.15.0;
- Python 3.12 with Poetry 1.8.5;
- Docker Compose only for the optional full-stack/infrastructure path.

Install from the repository root:

```bash
pnpm install --frozen-lockfile
cd apps/compliance-core && poetry install --no-interaction
cd ../data-platform && poetry install --no-interaction
```

## Credential-free entry points

| Purpose | Command | External services |
|---|---|---|
| Deterministic evidence | `pnpm evidence` | None |
| TypeScript tests | `pnpm test` | None |
| Browser smoke | `pnpm test:e2e` | None; Web fixture mode |
| Web development | `VITE_MOCK_API=true pnpm --filter @wcp/web dev` | None |
| Agent tests | `pnpm --filter @wcp/agent test` | None; mock mode |

The evidence path is the canonical portfolio demonstration because it composes all
five service contracts without changing the Compliance Core source-of-truth rule.

## Service entry points

| Service | Development command | Primary entry point |
|---|---|---|
| Web | `pnpm --filter @wcp/web dev` | `apps/web/src/main.tsx` |
| Gateway | `pnpm --filter @wcp/gateway dev` | `apps/gateway/src/server.ts` |
| Agent | `pnpm --filter @wcp/agent dev` | `apps/agent/src/server.ts` |
| Compliance Core | `poetry run uvicorn wcp_compliance.main:app --port 8000` | `wcp_compliance.main:app` |
| Data Platform | `poetry run uvicorn wcp_data.main:app --port 8001` | `wcp_data.main:app` |

For a live persistence deployment, run PostgreSQL and apply Alembic migrations before
starting Data Platform. Redis is optional: cache and SSE code use deterministic
in-memory behavior when it is absent. Real LLMs, SAM.gov refresh, and Langfuse are
opt-in integrations and require their own credentials and network access.
