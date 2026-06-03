# WCP Compliance Agent V5 — Comprehensive Architecture & Documentation Review

**Date:** 2026-06-03  
**Reviewer:** Architect Mode  
**Scope:** Full monorepo — 5 services, shared packages, infrastructure, documentation

---

## 1. Architecture Completeness

### Verdict: Well-designed with clear boundaries. Minor gaps in documentation consistency.

The five-service architecture is **thoroughly designed** with explicit ownership boundaries documented in:

- [`v5-request-flow.md`](docs/architecture/v5-request-flow.md) — 16-step sequence diagram covering happy path, PDF upload, SSE streaming, and error boundaries
- [`v5-data-ownership.md`](docs/architecture/v5-data-ownership.md) — 13-entity R/W matrix with invariant boundary rules
- [`v5-data-model.md`](docs/architecture/v5-data-model.md) — 7 tables with relationships and partitioning strategy
- 7 ADRs covering every major architectural decision

**Strengths:**
- Each service has a distinct failure mode, test strategy, scaling pattern, and reason to change
- The "Agent never writes to the database" invariant is enforced in code (Agent has no SQLAlchemy dependency)
- Deterministic validation is correctly positioned as the source of compliance truth (ADR 0004)
- Trust score safe-verdict override prevents false LLM approvals

**Gaps Identified:**
- The [`case-study.md`](docs/architecture/case-study.md:39) still shows old trust score weights (40/15/25/20) while ADR 0007 confirms 35/25/20/20 — **documentation inconsistency**
- [`llms.txt`](llms.txt:34) references `docs/architecture/v5-service-boundaries.md` which does not exist — **stale reference**
- No formal API specification (OpenAPI/Swagger) for external routes beyond FastAPI auto-docs for Python services

---

## 2. Implementation Status by Service

### 2.1 Compliance Core — ✅ COMPLETE (100% ported from V3)

| Aspect | Status | Evidence |
|---|---|---|
| Extraction | ✅ | [`pdf_extractor.py`](apps/compliance-core/src/wcp_compliance/extraction/pdf_extractor.py) — 9,199 chars |
| Rule Engine | ✅ | [`engine.py`](apps/compliance-core/src/wcp_compliance/rules/engine.py) — 5 checks + data integrity + minimum wage |
| DBWD Lookup | ✅ | [`rate_lookup.py`](apps/compliance-core/src/wcp_compliance/dbwd_matching/rate_lookup.py) — fuzzy matching, 20 DC trades |
| Hybrid RAG | ✅ | BM25 + vector + cross-encoder in `retrieval/` |
| API Endpoints | ✅ | extract, validate, search, dbwd, health — all under `/internal/` |
| Tests | ✅ | 66 unit + 73 eval (golden-set) |

**Assessment:** The most mature service. Deterministic engine is fully ported. 8 known extraction edge cases documented in [`v5-known-gaps.md`](docs/planning/v5-known-gaps.md).

### 2.2 Data Platform — ✅ COMPLETE (most comprehensive service)

| Aspect | Status | Evidence |
|---|---|---|
| Database | ✅ | 7 tables in [`tables.py`](apps/data-platform/src/wcp_data/models/tables.py), Alembic migration |
| Repositories | ✅ | 6 repos (decision, audit, contract, payroll, dbwd, artifact) |
| Services | ✅ | 5 services + Redis cache + DBWD service with SAM.gov |
| API Endpoints | ✅ | 10 route modules (decisions, audit, contracts, payrolls, dbwd, ingestion, analytics, artifacts, auth, health) |
| Analytics | ✅ | 9 endpoints + DuckDB integration |
| Connectors | ✅ | SAM.gov, SFTP, API, Database + registry |
| Events | ✅ | Redis Streams producer |
| Tests | ✅ | 48 unit + 22 integration |

**Assessment:** The largest service. Has grown beyond pure "data platform" into a full backend — analytics, ingestion, quality, connectors, ETL pipelines. This is a potential SRP concern long-term but acceptable for current scope.

### 2.3 Agent — ✅ COMPLETE

| Aspect | Status | Evidence |
|---|---|---|
| Pipeline | ✅ | [`wcp-pipeline.ts`](apps/agent/src/workflows/wcp-pipeline.ts) — 5-step orchestration |
| Verdict Agent | ✅ | [`wcp-verdict.ts`](apps/agent/src/agents/wcp-verdict.ts) — mock + real mode with RAG |
| Trust Score | ✅ | [`trust-score.ts`](apps/agent/src/agents/trust-score.ts) — 4-component weighted |
| Model Router | ✅ | [`llm-router.ts`](apps/agent/src/model-router/llm-router.ts) — multi-provider with fallback |
| Tools | ✅ | 5 tools (extract, validate, persist, search, dbwd-lookup) |
| Observability | ✅ | Langfuse tracing + cost tracking |
| Tests | ✅ | 55 unit + 2 contract |

**Assessment:** Clean implementation. Mock mode is well-designed for testing. Pipeline correctly delegates to Compliance Core and Data Platform without crossing boundaries.

### 2.4 Gateway — ✅ COMPLETE

| Aspect | Status | Evidence |
|---|---|---|
| Middleware | ✅ | Auth (JWT), CORS, rate limiting, request ID |
| Routes | ✅ | 10 route modules (analyze, analyze-pdf, decisions, stream, contracts, payrolls, ingestion, analytics, auth, health) |
| SSE Bridge | ✅ | [`sse-bridge.ts`](apps/gateway/src/lib/sse-bridge.ts) — Redis Streams consumer + heartbeat |
| Clients | ✅ | Agent, Compliance Core, Data Platform clients |
| Tests | ✅ | 22 unit + 2 contract + 1 integration |

**Assessment:** Solid security boundary. Production safeguards in [`config.ts`](apps/gateway/src/config.ts:28) prevent default JWT secret and disabled auth in production.

### 2.5 Web App — ✅ COMPLETE (with analytics pages ported)

| Aspect | Status | Evidence |
|---|---|---|
| Pages | ✅ | 12 pages (Dashboard, Analyze, Decisions, Analytics, Contracts, Payrolls, Ingestion, ReviewQueue, Login, Settings, + 4 analytics sub-pages) |
| Components | ✅ | 10 core + 4 analytics (AnalyticsLayout, KPICard, ChartCard, LiveFeed) + 11 chart components |
| Hooks | ✅ | useAnalyze, useDecisions, useAnalytics, useDecisionStream |
| Mock Mode | ✅ | [`mock-data.ts`](apps/web/src/utils/mock-data.ts) — 10,356 chars of fixture data |
| Tests | ✅ | 28 tests including analytics chart tests |

**Note:** The [`v5-porting-audit.md`](docs/planning/v5-porting-audit.md:72) says analytics pages were "not ported" but they **are now implemented** (Phase 9 per [`v5-known-gaps.md`](docs/planning/v5-known-gaps.md:55)). The porting audit is outdated on this point.

### 2.6 Contracts Package — ✅ COMPLETE

| Aspect | Status | Evidence |
|---|---|---|
| JSON Schemas | ✅ | 8 schemas (audit-event, contract, decision-draft, decision-record, deterministic-report, extracted-wcp, ingestion-job, payroll-record) |
| Codegen | ✅ | [`generate.py`](packages/contracts/generate.py) → TypeScript (Zod) + Python (Pydantic) |
| Tests | ✅ | 17 contract validation tests |

---

## 3. Cross-Service Consistency

### 3.1 Type Alignment — ⚠️ PARTIAL CONCERN

The Agent defines its own Zod schemas in [`types.ts`](apps/agent/src/types.ts) (155 lines) while the Contracts package generates schemas from JSON. These are **not the same types**:

- Agent's [`TrustScoredDecisionSchema`](apps/agent/src/types.ts:132) has fields like `step_latencies`, `phoenix_trace_id`, `cost_usd` that don't appear in the Contracts [`DecisionDraftSchema`](packages/contracts/schemas/decision-draft.json)
- The Contracts `DecisionDraft` has fields like `artifact_id`, `deterministic_report_id`, `issues` that don't appear in Agent's `TrustScoredDecision`

This is **by design** (Agent produces `TrustScoredDecision`, Contracts defines the formal `DecisionDraft`), but the mapping between them is implicit rather than enforced by shared types.

### 3.2 Route Prefix Consistency — ✅ CONSISTENT

All internal routes use `/internal/` prefix. All external routes use `/api/v1/` prefix. Verified across:
- Gateway routes: `/api/v1/analyze`, `/api/v1/decisions`, etc.
- Agent routes: `/internal/workflows/wcp-pipeline`
- Compliance Core routes: `/internal/extract`, `/internal/validate`, `/internal/search`, `/internal/dbwd`
- Data Platform routes: `/internal/decisions`, `/internal/audit-events`, `/internal/contracts`, etc.

### 3.3 Configuration Consistency — ⚠️ MINOR ISSUE

- Compliance Core [`config.py`](apps/compliance-core/src/wcp_compliance/config.py:10) defaults `data_platform_url` to `http://localhost:8080` (wrong port — should be 8001)
- Both Python services share identical validation patterns (production localhost check, bool parsing) — good consistency

### 3.4 Trace ID Propagation — ✅ IMPLEMENTED

`x-request-id` and `x-trace-id` headers are documented in the request flow and implemented in Gateway middleware. The Agent pipeline accepts and forwards `traceHeaders` to downstream tools.

---

## 4. Known Issues from Documentation

### Documented in [`v5-known-gaps.md`](docs/planning/v5-known-gaps.md):

| Issue | Severity | Status |
|---|---|---|
| 8 extraction edge cases | Medium | Documented with workarounds |
| No load testing | Medium | Not performed |
| Rate limiter is in-memory | Medium | Not shared across Gateway instances |
| No mobile-responsive testing | Low | Not performed |
| No demo GIF | Low | Missing |
| No fixture PDF | Low | Only `.txt` fixture exists |
| Integration tests require Docker | Medium | 4 integration tests exist for DP; cross-service requires live stack |

### Documented in [`v5-porting-audit.md`](docs/planning/v5-porting-audit.md):

| Not Ported | Impact | Reason |
|---|---|---|
| Celery job queue | Low | Synchronous HTTP is sufficient for <5s pipeline |
| Elasticsearch | Low | Replaced by in-process BM25 + pgvector |
| Great Expectations | Low | Replaced by native validators |
| V4 analytics UI | **Outdated** | Actually ported in Phase 9 |
| 11 integration test files from V3 | Medium | V5 uses mocks; only DP has integration tests |

---

## 5. Test Coverage Assessment

### Current Test Count: **309 tests** (per AGENTS.md) / **271 tests** (per README)

There is a **test count discrepancy** between documentation:
- [`AGENTS.md`](AGENTS.md) claims 309 tests (66+73+48+22+55+22+28+17)
- [`README.md`](README.md:7) claims 271 tests
- [`CHANGELOG.md`](CHANGELOG.md:51) claims 198 unit + 73 eval = 271

The AGENTS.md numbers appear more current (reflects Phase 9+ additions). **The README and CHANGELOG should be updated.**

### Coverage by Service:

| Service | Test Files | Test Types | Coverage Assessment |
|---|---|---|---|
| Compliance Core | 6 unit + 1 eval | Unit + Golden-set | **Strong** — core logic well-tested, 73 golden-set examples |
| Data Platform | 11 unit + 5 integration | Unit + Integration | **Strong** — repos, services, endpoints, DuckDB, SAM.gov |
| Agent | 9 unit + 2 contract | Unit + Contract | **Good** — pipeline, tools, router, prompts, types |
| Gateway | 4 unit + 2 contract + 1 integration | Unit + Contract + Integration | **Good** — middleware, routes, auth, config |
| Web | 4 + 2 analytics | Unit + Component | **Adequate** — API client, mock data, routing, charts |
| Contracts | 1 | Schema validation | **Adequate** — validates all 8 schemas |
| E2E | 1 | Smoke test | **Minimal** — single smoke test file |

### Missing Test Coverage:
- **No cross-service integration tests** (Gateway → Agent → CC → DP flow requires Docker)
- **No PDF upload E2E test** (mock mode works, real PDF flow untested)
- **No SSE stream test** with real Redis
- **No load/performance tests**

---

## 6. Configuration & Environment

### Environment Files — ✅ COMPLETE

| File | Status |
|---|---|
| Root [`.env.example`](.env.example) | ✅ All 5 services covered |
| [`apps/agent/.env.example`](apps/agent/.env.example) | ✅ |
| [`apps/compliance-core/.env.example`](apps/compliance-core/.env.example) | ✅ |
| [`apps/data-platform/.env.example`](apps/data-platform/.env.example) | ✅ |
| [`apps/web/.env.example`](apps/web/.env.example) | ✅ |
| [`infra/.env.mock`](infra/.env.mock) | ✅ Mock mode config |

### Docker Configuration — ✅ COMPLETE

| File | Purpose |
|---|---|
| [`infra/docker-compose.yml`](infra/docker-compose.yml) | Dev: PostgreSQL + Redis |
| [`infra/docker-compose.prod.yml`](infra/docker-compose.prod.yml) | Production: all 5 services + infra |
| [`infra/docker-compose.test.yml`](infra/docker-compose.test.yml) | Test: PostgreSQL + Redis on alternate ports |
| [`infra/docker-compose.mock.yml`](infra/docker-compose.mock.yml) | Mock mode |
| 3 Dockerfiles (Agent, Gateway, Web) | Container builds |

**Note:** Compliance Core and Data Platform Dockerfiles exist but are not listed in the root file tree — they may need verification.

### CI/CD — ✅ COMPLETE

| Pipeline | Trigger | Coverage |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | Push/PR to master | 3 parallel jobs: TS (typecheck→lint→build→test), CC (ruff→mypy→pytest), DP (ruff→mypy→pytest with PG+Redis services) |
| [`eval.yml`](.github/workflows/eval.yml) | Weekly Monday 6AM + manual | Golden-set evaluation with regression detection |

---

## 7. Top 5 Risk Areas

### Risk 1: Documentation Inconsistency (Medium)

Multiple documents contain stale or contradictory information:
- **Test counts** differ between AGENTS.md (309), README (271), CHANGELOG (271)
- **Trust score weights** in [`case-study.md`](docs/architecture/case-study.md:41) show old values (40/15/25/20)
- **Porting audit** says analytics pages "not ported" but they are implemented
- **llms.txt** references non-existent `v5-service-boundaries.md`
- **Compliance Core config** defaults to port 8080 instead of 8001

**Impact:** New developers or AI agents following documentation will encounter confusion. Trust in documentation erodes.

### Risk 2: No Cross-Service Integration Tests (Medium-High)

Unit tests with mocks cover individual services well, but the critical 16-step request flow (Gateway → Agent → Compliance Core → Data Platform) has **no automated integration test**. The E2E smoke test exists but requires a live Docker stack.

**Impact:** Schema mismatches, route changes, or contract drift between services won't be caught until runtime. The contract tests help but don't exercise actual HTTP calls.

### Risk 3: Rate Limiter Not Distributed (Medium)

The Gateway's rate limiter is in-memory ([`rate-limiter.ts`](apps/gateway/src/middleware/rate-limiter.ts)). If multiple Gateway instances are deployed behind a load balancer, rate limits are per-instance, not global.

**Impact:** In production with horizontal scaling, rate limiting is ineffective. A malicious user could send N × limit requests by hitting different instances.

### Risk 4: Agent Type System Not Enforced by Contracts Package (Medium)

The Agent defines its own Zod schemas in [`types.ts`](apps/agent/src/types.ts) independently from the shared Contracts package. The mapping between `TrustScoredDecision` (Agent output) and `DecisionDraft`/`DecisionRecord` (Contracts schema) is implicit.

**Impact:** If the Agent's output schema drifts from what the Data Platform expects, contract tests catch it, but the types aren't derived from a single source of truth. The codegen in `packages/contracts/` generates types that aren't imported by the Agent.

### Risk 5: Data Platform Scope Creep (Low-Medium)

The Data Platform has grown to 40+ source files covering persistence, analytics, ingestion, quality, connectors, ETL pipelines, events, caching, and storage. This is approaching the same "monolith within a service" pattern that plagued V4.

**Impact:** Currently manageable, but as features like SAM.gov integration, Parquet archival, and DuckDB analytics grow, the Data Platform may need further decomposition (e.g., separate analytics service, separate ingestion service).

---

## 8. Summary Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Architecture Design | ⭐⭐⭐⭐⭐ | Excellent boundary definitions, clear ownership, well-documented |
| Implementation Completeness | ⭐⭐⭐⭐☆ | All 5 services functional; minor gaps in cross-service testing |
| Documentation Quality | ⭐⭐⭐⭐☆ | Comprehensive but contains stale/inconsistent data |
| Test Coverage | ⭐⭐⭐⭐☆ | Strong unit + eval coverage; missing integration and E2E |
| Configuration & Deployment | ⭐⭐⭐⭐⭐ | Complete env files, Docker configs, CI/CD pipelines |
| Cross-Service Consistency | ⭐⭐⭐⭐☆ | Good route/trace consistency; type alignment could be tighter |
| Production Readiness | ⭐⭐⭐☆☆ | Needs: integration tests, load testing, distributed rate limiting, documentation cleanup |

### Overall: **Architecture is solid. Implementation is functionally complete. Production readiness requires hardening.**

The codebase demonstrates mature architectural thinking — the five-service split, deterministic-first validation, safe verdict override, and comprehensive mock mode are all well-executed patterns. The primary gaps are in testing (cross-service integration), documentation consistency, and operational hardening for production deployment.
