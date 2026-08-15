# V5 Master Development Plan

> **Historical plan.** This document preserves the original rebuild plan and baseline
> observations. It does not override the live architecture, finalization evidence, or
> current deferred boundaries documented in the README and known-gaps file.

## Status

Phases 0–3 (Architecture Freeze, Monorepo Skeleton, Boot & Fix, Contracts & Types) are **complete**. All 5 services boot and return `/health` 200. Codegen produces valid TypeScript and Python types. Contract tests pass across all 4 service boundaries. Seed scripts are ready. Next: Phase 4 (Vertical Slice).

This plan documents every phase from initial architecture decisions through portfolio packaging.

## Phase Overview

| Phase | Name | Goal | Depends On | Est. Time |
|---|---|---|---|---|
| **0** | Architecture Freeze | Design document, ADRs, tech choices, MVP scope | — | Complete |
| **1** | Monorepo Skeleton | Five service scaffolds, shared packages, infrastructure config | Phase 0 | Complete |
| **2** | Boot & Fix | All 5 services boot, /health 200, API paths aligned | Phase 1 | ✅ Complete |
| **3** | Contracts & Types | Codegen works, generated types match hand-written, schema mismatch detection | Phase 2 | ✅ Complete |
| **4** | Vertical Slice | Upload PDF → extract → validate → verdict → persist → display | Phase 3 | 2–3 sessions |
| **5** | Comprehensive Testing | 250+ tests across all services, every module tested | Phase 4 | 3–4 sessions |
| **6** | Data Platform Migration | Port all V4 features to V5 boundaries | Phase 4 | 4–5 sessions |
| **7** | Observability & Eval | Full tracing, golden-set CI, prompt tracking | Phase 4 | 2–3 sessions |
| **8** | Portfolio Polish | README, diagrams, demo, case study | Phases 5–7 | 1–2 sessions |

## Dependency Graph

```
Phase 0 (Architecture Freeze)  ✅
    │
    ▼
Phase 1 (Monorepo Skeleton)    ✅
    │
    ▼
Phase 2 (Boot & Fix)           ✅
    │
    ▼
Phase 3 (Contracts & Types)    ✅
    │
    ▼
Phase 4 (Vertical Slice)  ←──  First demo-able milestone
    │
    ▼
Phase 5 (Testing)  ←──  Can parallel with Phase 6
    │
    ├──────────────────────┐
    ▼                      ▼
Phase 6 (Data Platform)   Phase 7 (Observability)
    │                      │
    └──────────┬───────────┘
               ▼
        Phase 8 (Portfolio)
```

## Key Milestones

1. **Phase 1 exit** ✅ — 214 files scaffolded, all service directories created, shared contracts defined.
2. **Phase 2 exit** ✅ — `pnpm dev` starts all TS services, `poetry run uvicorn` starts both Python services (Data Platform with `SKIP_DB_STARTUP=true`), all return `/health` 200.
3. **Phase 3 exit** ✅ — Codegen produces valid TS + Python types, 25 contract tests pass across all boundaries, hand-written types aligned with JSON schemas, seed scripts ready.
3. **Phase 4 exit** — Upload a real WH-347 PDF, get back a trust-scored decision with citations, see it in the Web UI, verify it's in PostgreSQL.
4. **Phase 5 exit** — `pnpm test` and both `poetry run pytest` suites pass 250+ tests with zero failures.
5. **Phase 6 exit** — All V4 features (contracts, payrolls, ingestion, analytics, events, archival, quality) work behind V5 Data Platform APIs.
6. **Phase 8 exit** — A recruiter understands the system in 90 seconds. A technical reviewer inspects the boundaries in 5 minutes.

## Critical Boundary Rules (Invariant Across All Phases)

> Current Mastra migration note: the Agent never writes to the database directly. Its workflow submits `TrustScoredDecision` payloads to Data Platform APIs, and Data Platform creates official `DecisionRecord` and `AuditEvent` rows.

1. **Agent never writes to the database directly** — it submits `TrustScoredDecision` payloads to Data Platform APIs.
2. **Data Platform creates official DecisionRecords** — it's the only service that persists.
3. **Compliance Core never persists** — it returns structured extraction/validation results.
4. **Gateway never reasons** — it routes, validates, and authenticates.
5. **All cross-service requests carry `x-request-id` and `x-trace-id`.**

## Service Map

| Service | Language | Framework | Port | Responsibility |
|---|---|---|---|---|
| Web App | TypeScript | React 19 + Vite | 5173 | Product UI, upload flow, decisions, review, analytics |
| Gateway | TypeScript | Hono + Zod | 3000 | Auth, CORS, rate limits, validation, uploads, routing |
| Agent | TypeScript | Mastra (AI SDK v6) | 3001 | LLM workflows, tool calls, verdict synthesis |
| Compliance Core | Python | FastAPI + Pydantic v2 | 8000 | Deterministic extraction, validation, checks, reports |
| Data Platform | Python | FastAPI + SQLAlchemy | 8001 | Persistence, contracts, payrolls, decisions, audits |

## Audit Findings (Why Phase 2 Exists)

The scaffold audit revealed these issues that block any service from running:

- **Missing package**: `@hono/node-server` imported but not declared in gateway and agent `package.json`.
- **No lockfiles**: `pnpm-lock.yaml` doesn't exist. No reproducible installs.
- **No Python venvs**: Neither `compliance-core` nor `data-platform` have `.venv/`.
- **API path mismatches**: 5 routes called by one service but not implemented in another.
- **No .env.examples**: Developers don't know what env vars to set.
- **No seed data**: DBWD rates aren't loaded into the database.

## Per-Phase Documents

Each phase has a dedicated document in `docs/planning/phases/`:

- `phase-0-architecture-freeze.md`
- `phase-1-monorepo-skeleton.md`
- `phase-2-boot-and-fix.md`
- `phase-3-contracts-and-types.md`
- `phase-4-vertical-slice.md`
- `phase-5-comprehensive-testing.md`
- `phase-6-data-platform-migration.md`
- `phase-7-observability-and-eval.md`
- `phase-8-portfolio-polish.md`

Each document includes: goal, prerequisites, detailed task list with file paths, exit criteria with checkboxes, and time estimates.

## Related Documents

- `docs/planning/v5-porting-guide.md` — V3/V4 → V5 file mapping
- `docs/planning/v5-implementation-plan.md` — Original implementation checklist
- `docs/architecture/v5-service-boundaries.md` — Full architecture reference
- `docs/adrs/` — 6 Architecture Decision Records
