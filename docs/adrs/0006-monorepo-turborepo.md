# ADR 0006: Monorepo with Turborepo and pnpm Workspaces

**Status:** Accepted

**Date:** 2026-05-05

## Decision

V5 uses a monorepo structure managed by Turborepo and pnpm workspaces. TypeScript services and packages are managed by pnpm. Python services are managed by Poetry independently.

## Context

V3 had three independent services (backend, agent, frontend), each with their own package manager and no root-level build orchestration. This made cross-service refactoring, shared type generation, and consistent CI difficult.

## Rationale

A monorepo with Turborepo provides:

1. **Task graph caching** — Turborepo understands which packages depend on which, and only rebuilds what changed.
2. **Parallel execution** — builds, tests, and type checks run concurrently where possible.
3. **Shared packages** — contracts, types, clients, and utilities live in `packages/` and are consumed by multiple services.
4. **Single CI pipeline** — one repo, one CI config, one source of truth.
5. **Python independence** — Poetry manages Python service dependencies without conflicting with the pnpm/Node ecosystem.

## Structure

```
apps/
  web/            # React (pnpm)
  gateway/        # Hono TS (pnpm)
  agent/          # Mastra TS (pnpm)
  compliance-core/  # Python FastAPI (Poetry)
  data-platform/    # Python FastAPI (Poetry)

packages/
  contracts/        # JSON schemas + codegen
  typescript-client/  # Shared HTTP client
  test-fixtures/    # Golden set + sample PDFs
  observability/    # Shared tracing utilities
```

## Consequences

- Simpler cross-service refactoring.
- Shared contract types generated from JSON schemas.
- `pnpm dev` starts all TypeScript services in parallel.
- Python services are started independently with `poetry run uvicorn`.
- Turborepo handles the build/test/lint pipeline in CI.
