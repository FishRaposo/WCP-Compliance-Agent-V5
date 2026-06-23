# @wcp/contracts

The **single source of truth** for cross-service data shapes and the public Gateway API
contract. Replaces the old hand-rolled `generate.py` (which had drifted into an orphaned,
lossy generator — the generated Python was imported by no service). Part of the V6 evolution
(see [docs/planning/v6-platform-evolution.md](../../docs/planning/v6-platform-evolution.md)).

## What it provides

- **`src/schemas.ts`** — Zod schemas + inferred types for every cross-service DTO
  (`TrustScoredDecision`, `DecisionSummary`, `Citation`, `AnalyzeRequest`, `ReviewRequest`,
  analytics, contracts, payrolls, …). TypeScript services import these instead of re-declaring
  them, which is what eliminates field drift.
- **`src/contract.ts`** — the [ts-rest](https://ts-rest.com) contract (`apiContract`) for the
  public `/api/v1/*` Gateway API: typed routes, params, bodies, and responses.
- **`src/openapi.ts`** — emits an OpenAPI 3 document from the contract.

```
TypeScript ──┐
             ├─ import { DecisionSummary, AnalyzeRequest, apiContract } from "@wcp/contracts"
Zod schemas ─┤
(source)     └─ generate OpenAPI ─→ generated/openapi.json ─→ (CI) Pydantic models for Python
```

## Consumers

- **Web** (`apps/web/src/types/api.ts`) re-exports the types — no hand-declared shapes.
- **Gateway** validates request bodies against the shared schemas (`AnalyzeRequest`,
  `ReviewRequest`) and is typed by the contract.
- **Agent** can import the same `TrustScoredDecision` shape.

## Scripts

```bash
pnpm --filter @wcp/contracts typecheck
pnpm --filter @wcp/contracts openapi        # regenerate generated/openapi.json (committed)
pnpm --filter @wcp/contracts test           # schema + OpenAPI drift tests
pnpm --filter @wcp/contracts gen:pydantic   # CI/Python: OpenAPI -> Pydantic v2 models
```

## Generated artifacts

- `generated/openapi.json` — committed; the drift test (`tests/contract.test.ts`) fails CI if it
  no longer matches the contract, so the contract and the OpenAPI can never silently diverge.
- `generated/python/models.py` — **generated in CI** by `gen:pydantic` (needs
  `datamodel-code-generator`, a Python tool — not runnable in the JS toolchain). Python services
  (compliance-core, data-platform) can adopt these for their request/response DTOs incrementally.

## Why ts-rest (not `@hono/zod-openapi`)

`@hono/zod-openapi` 1.x peer-requires **Zod 4**, which would force a repo-wide Zod 3→4 migration.
`ts-rest` 3.52 runs on Zod 3 (the repo's version) and provides the typed contract + client
inference + OpenAPI emission without that churn.
