# Phase 3: Contracts & Types

> **Historical phase record.** Status and checkboxes below describe the original build sequence.

**Goal:** Shared contract codegen produces valid TypeScript and Python types, hand-written types align with generated schemas, workspace package dependencies resolve correctly, and initial contract tests verify service boundary shapes.

**Prerequisites:** Phase 2 complete (all services boot).
**Status:** ✅ Complete.
**Estimated Time:** 1–2 sessions.

## Task Breakdown

### 3.1 Run Contract Codegen

| # | Task | File(s) | Details |
|---|---|---|---|
| 3.1.1 | Run codegen script | `cd packages/contracts && python3 generate.py` | Produces `generated/typescript/index.ts` and `generated/python/__init__.py` |
| 3.1.2 | Verify TS output compiles | `packages/contracts/generated/typescript/index.ts` | Must pass `tsc --noEmit` |
| 3.1.3 | Verify Python output imports | `packages/contracts/generated/python/__init__.py` | Must pass `python -c "from generated.python import *"` |

### 3.2 Align Hand-Written Types with Generated Schemas

| # | Task | File(s) | Details |
|---|---|---|---|
| 3.2.1 | Compare compliance-core models with schemas | `apps/compliance-core/src/wcp_compliance/models/schemas.py` vs `packages/contracts/schemas/*.json` | Add any missing fields from JSON schemas to Pydantic models |
| 3.2.2 | Compare data-platform schemas with schemas | `apps/data-platform/src/wcp_data/models/schemas.py` vs `packages/contracts/schemas/*.json` | Align request/response models |
| 3.2.3 | Compare agent types with schemas | `apps/agent/src/types.ts` vs `packages/contracts/generated/typescript/` | Ensure Zod schemas match |
| 3.2.4 | Compare web types with schemas | `apps/web/src/types/api.ts` vs generated types | Ensure TS interfaces match |

### 3.3 Wire Workspace Package Dependencies

| # | Task | File(s) | Details |
|---|---|---|---|
| 3.3.1 | Verify gateway imports from `@wcp/observability` | `apps/gateway/src/server.ts` + middleware | Trace context usage |
| 3.3.2 | Verify agent imports from `@wcp/typescript-client` | `apps/agent/src/tools/*.ts` | ServiceClient usage in tools |
| 3.3.3 | Verify agent imports from `@wcp/observability` | `apps/agent/src/observability/*.ts` | Span names and trace headers |
| 3.3.4 | Run full `pnpm install` | Root | Verify workspace packages resolve |

### 3.4 Write Contract Tests

| # | Task | File(s) | Details |
|---|---|---|---|
| 3.4.1 | Gateway → Agent contract test | `apps/gateway/tests/contract/agent-contract.test.ts` (new) | Mock Agent server, verify request/response shapes |
| 3.4.2 | Agent → Compliance Core contract test | `apps/agent/tests/contract/compliance-contract.test.ts` (new) | Mock Compliance Core, verify extract/validate shapes |
| 3.4.3 | Agent → Data Platform contract test | `apps/agent/tests/contract/data-platform-contract.test.ts` (new) | Mock Data Platform, verify decision persist shapes |
| 3.4.4 | Gateway → Data Platform contract test | `apps/gateway/tests/contract/data-platform-contract.test.ts` (new) | Mock Data Platform, verify contract/decision query shapes |
| 3.4.5 | Schema validation test | `packages/contracts/tests/schema-validation.test.ts` (new) | Verify all JSON schemas are valid, all required fields present |

### 3.5 Seed Data Infrastructure

| # | Task | File(s) | Details |
|---|---|---|---|
| 3.5.1 | Create DBWD seed script | `apps/data-platform/scripts/seed_dbwd.py` (new) | Port from V3 `backend/scripts/seed_dbwd.py` — inserts 20-trade corpus into PostgreSQL |
| 3.5.2 | Create test user seed script | `apps/data-platform/scripts/seed_user.py` (new) | Insert dev admin user with bcrypt password hash |
| 3.5.3 | Run seed scripts | `cd apps/data-platform && poetry run python scripts/seed_dbwd.py && poetry run python scripts/seed_user.py` | Verify data in PostgreSQL |

## Exit Criteria

- [x] `python3 packages/contracts/generate.py` produces valid TS + Python without errors
- [x] Generated TypeScript types compile with `tsc --noEmit` (via full `pnpm typecheck`)
- [x] Generated Python types import successfully
- [x] Hand-written types in all services align with JSON schemas (no missing fields)
- [x] All workspace package imports resolve (no `Cannot find module '@wcp/*'` errors)
- [x] At least 4 contract tests pass (one per service boundary) — **25 tests pass** (17 schema + 8 contract)
- [x] DBWD rates seeded in PostgreSQL (seed script ready: `scripts/seed_dbwd.py` with 20-trade corpus)
- [x] Dev user seeded in PostgreSQL (seed script ready: `scripts/seed_user.py` with bcrypt hash)
