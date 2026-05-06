# Phase 0: Architecture Freeze

**Goal:** Lock all architectural decisions, document boundaries, define MVP scope, write ADRs.

**Prerequisites:** None. This is the starting point.
**Status:** ✅ Complete.
**Estimated Time:** 1–2 sessions.

## Context

V5 is a clean rebuild based on lessons from V2 (TypeScript monolith), V3 (three-service split), and V4 (data-platform expansion). The current architecture works, but the architectural lessons are now clearer than the original boundaries. V4 exposed the multiple-hats problem: the Agent Gateway was both middleware and agent brain, and the Python backend was both compliance engine and data platform.

## Task Breakdown

### 0.1 Design Document

| # | Task | File | Status |
|---|---|---|---|
| 0.1.1 | Write V5 rebuild design document | `wcp_v_5_rebuild_design_document.md` | ✅ 1791 lines |

The design document covers:
- Executive summary and version history (V2→V3→V4→V5)
- Problem statement: the multiple-hats problem
- Goals and non-goals
- 6 architectural principles
- 5-service architecture with high-level diagram
- Request flow: single WH-347 analysis
- Detailed service responsibilities for all 5 services
- Data ownership matrix
- DBWD ownership decision (Option A: Compliance Core owns matching, Data Platform owns storage)
- API contract strategy with shared schemas
- Monorepo structure
- Observability design with trace IDs and span names
- Testing strategy per service
- Migration strategy (6 phases)
- V5 README draft
- 4 suggested ADRs
- Open questions with recommended defaults
- Minimum V5 build checklist

### 0.2 Service Boundary Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 0.2.1 | Split Agent Gateway into Gateway + Agent | Yes | Different failure modes, test strategies, scaling patterns |
| 0.2.2 | Split Python backend into Compliance Core + Data Platform | Yes | Deterministic validation ≠ persistence/analytics |
| 0.2.3 | Data Platform language | Python | DuckDB, PyArrow, Prefect, SQLAlchemy all Python-native |
| 0.2.4 | Gateway framework | Hono | V3 already uses Hono. Lightweight, fast port. |
| 0.2.5 | Monorepo tooling | Turborepo + pnpm | Task graph caching, parallel builds, shared packages |
| 0.2.6 | DBWD ownership | Option A | Compliance Core owns matching logic, Data Platform owns storage |

### 0.3 MVP Scope Definition

| # | Decision | Choice |
|---|---|---|
| 0.3.1 | Elasticsearch RAG in MVP | Deferred. Start with deterministic lookup. |
| 0.3.2 | Prefect ETL in MVP | Deferred until after vertical slice. |
| 0.3.3 | Celery workers in MVP | Deferred. Synchronous for first version. |
| 0.3.4 | Parquet archival in MVP | Deferred. |
| 0.3.5 | Great Expectations in MVP | Deferred. |
| 0.3.6 | Redis Streams in MVP | Deferred. |
| 0.3.7 | Gateway artifact storage | Broker metadata only. Data Platform owns records. |
| 0.3.8 | Decision persistence | Synchronous in request path for first version. |
| 0.3.9 | Input format | WH-347 PDF only for MVP. CSV added later. |
| 0.3.10 | Observability standard | Langfuse for LLM + OpenTelemetry for services. |

### 0.4 Architecture Decision Records

| # | ADR | File | Status |
|---|---|---|---|
| 0.4.1 | Split Agent Gateway into Gateway and Agent | `docs/adrs/0001-v5-service-split.md` | ✅ |
| 0.4.2 | Data Platform owns official decision records | `docs/adrs/0002-agent-does-not-persist-decisions.md` | ✅ |
| 0.4.3 | Data Platform owns storage, ingestion, analytics | `docs/adrs/0003-data-platform-owns-records.md` | ✅ |
| 0.4.4 | Compliance Core owns deterministic truth | `docs/adrs/0004-compliance-core-owns-truth.md` | ✅ |
| 0.4.5 | DBWD rate lookup ownership | `docs/adrs/0005-dbwd-ownership.md` | ✅ |
| 0.4.6 | Monorepo with Turborepo + pnpm | `docs/adrs/0006-monorepo-turborepo.md` | ✅ |

## Exit Criteria

- [x] Design document finalized
- [x] Service boundaries documented with explicit "owns" and "does not own"
- [x] Non-goals are explicit (no Kubernetes theater, no agent-as-source-of-truth, etc.)
- [x] DBWD ownership decided (Option A)
- [x] Tech choices locked (Hono, Python Data Platform, Turborepo)
- [x] MVP scope defined (minimal vertical slice, defer 7 capabilities)
- [x] 6 ADRs written
- [x] MVP vertical slice selected (upload PDF → extract → validate → verdict → persist → display)
