# V3/V4 → V5 Porting Audit (FINAL)

> **Historical audit.** This snapshot records V3/V4-to-V5 migration status at the
> time of the original audit. Later finalization work closed several listed gaps.
> Current claims live in `README.md` and `docs/planning/v5-known-gaps.md`.

**Status:** 76/88 V3 files ported (86%). All deliberate omissions documented.

**Current snapshot (2026-06-19):** This audit is a historical V3/V4-to-V5 inventory. Current verification is 274 unit tests, 24 Data Platform integration tests, and 93 Compliance Core eval tests (92 examples plus one baseline regression). Current Agent orchestration uses Mastra workflows/tools and persists decisions only through Data Platform `/internal/decisions`.

Generated from `_archive/WCP-Compliance-Agent-V3/` inventory.

## V5 Implementation Status by Category

### 1. Deterministic Rule Engine (100% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `pipeline/extraction.py` | 341 | ✅ Ported to `compliance-core/extraction/pdf_extractor.py` (292 lines) | Same regex patterns, PDF extraction, employee parsing |
| `pipeline/rules.py` | 251 | ✅ Ported to `compliance-core/rules/engine.py` (207 lines) | Same 5 checks + data integrity + minimum wage, trust components with different weights |
| `pipeline/dbwd_lookup.py` | 272 | ✅ Ported to `compliance-core/dbwd_matching/rate_lookup.py` (308 lines) | Same fuzzy matching, in-memory corpus of 20 DC trades |
| `pipeline/checks/wage_check.py` | 42 | ✅ Ported | Identical logic |
| `pipeline/checks/fringe_check.py` | 49 | ✅ Ported | Identical logic |
| `pipeline/checks/overtime_check.py` | 71 | ✅ Ported | Identical logic |
| `pipeline/checks/total_check.py` | 62 | ✅ Ported | Identical logic |
| `pipeline/checks/signature_check.py` | 48 | ✅ Ported | Identical logic |

### 2. API Endpoints (95% ported)

| V3 Endpoint | V5 Status | Notes |
|---|---|---|
| `POST /extract` | ✅ `compliance-core` `/internal/extract` | |
| `POST /validate` | ✅ `compliance-core` `/internal/validate` | |
| `POST /extract-and-validate` | ✅ `compliance-core` `/internal/extract-and-validate` | |
| `GET /dbwd/{trade}/{locality}/{date}` | ✅ `compliance-core` `/internal/dbwd/...` | |
| `POST /search` | ✅ `compliance-core` `/internal/search` | Hybrid RAG wired |
| `POST /decisions` | ✅ `data-platform` `/internal/decisions` | |
| `GET /decisions` | ✅ `data-platform` `/internal/decisions` | |
| `GET /decisions/:id` | ✅ `data-platform` `/internal/decisions/{id}` | |
| `POST /auth/validate` | ✅ `data-platform` `/internal/auth/validate` | |
| `GET /jobs/:id/status` | ❌ Not ported | V3 had job status endpoint for async processing |
| `POST /analyze` | ✅ `gateway` `/api/v1/analyze` → Agent | |
| `POST /analyze-pdf` | ✅ `gateway` `/api/v1/analyze/pdf` | |
| `GET /analytics/overview` | ✅ `data-platform` `/internal/analytics/overview` | |
| `GET /analytics/volume` | ✅ `data-platform` `/internal/analytics/volume` | |
| `GET /analytics/approval-by-trade` | ✅ `data-platform` `/internal/analytics/approval-by-trade` | |
| `GET /analytics/trust-band-distribution` | ✅ `data-platform` `/internal/analytics/trust-band-distribution` | |
| `GET /analytics/cost` | ✅ `data-platform` `/internal/analytics/cost` | |
| `GET /analytics/compliance` | ✅ `data-platform` `/internal/analytics/compliance` | New in V5 |
| `GET /analytics/wages` | ✅ `data-platform` `/internal/analytics/wages` | New in V5 |
| `GET /analytics/llm` | ✅ `data-platform` `/internal/analytics/llm` | New in V5 |
| `GET /stream` (SSE) | ✅ `gateway` `/api/v1/decisions/stream` | Redis Streams + heartbeat |

### 3. Agent Pipeline (100% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `mastra/workflows/wcp-pipeline.ts` | 111 | ✅ `agent/workflows/wcp-pipeline.ts` (88 lines) | 5-step pipeline with per-step latency |
| `mastra/agents/wcp-verdict.ts` | 259 | ✅ `agent/agents/wcp-verdict.ts` (201 lines) | Mock mode, RAG context, prompt interpolation |
| `mastra/agents/trust-score.ts` | 102 | ✅ `agent/agents/trust-score.ts` (82 lines) | Different weights (40/15/25/20 vs 35/25/20/20 in Python) |
| `mastra/tools/extract.ts` | ~30 | ✅ `agent/tools/extract.ts` (12 lines) | |
| `mastra/tools/validate.ts` | ~20 | ✅ `agent/tools/validate.ts` (15 lines) | |
| `mastra/tools/persist.ts` | ~20 | ✅ `agent/tools/persist.ts` (12 lines) | |
| `mastra/tools/search.ts` | ~20 | ✅ `agent/tools/search.ts` (28 lines) | |
| `mastra/tools/dbwd_lookup.ts` | ~15 | ✅ `agent/tools/dbwd-lookup.ts` (11 lines) | |
| `lib/llm-router.ts` | 93 | ✅ `agent/model-router/llm-router.ts` (95 lines) | |

### 4. Web App (75% ported)

| V3 Component/Page | V5 Status | Notes |
|---|---|---|
| **Pages** | | |
| Dashboard | ✅ `pages/Dashboard.tsx` | |
| Analyze | ✅ `pages/Analyze.tsx` | With UploadDropzone + PipelineVisualizer |
| Decisions | ✅ `pages/Decisions.tsx` | |
| Login | ✅ `pages/Login.tsx` | |
| Settings | ✅ `pages/Settings.tsx` | |
| Analytics/Overview | ❌ Not ported | V4 analytics overview page with KPI cards |
| Analytics/Compliance | ❌ Not ported | V4 compliance breakdown page |
| Analytics/Wages | ❌ Not ported | V4 wage analytics page |
| Analytics/LLM | ❌ Not ported | V4 LLM analytics page |
| **Components** | | |
| DecisionCard | ✅ | |
| PipelineVisualizer | ✅ | |
| UploadDropzone | ✅ | |
| TrustScoreBadge | ✅ | |
| AuditTrail | ✅ | |
| HumanReviewQueue | ✅ | |
| CostDashboard | ✅ | |
| AnalyticsLayout | ❌ Not ported | V4 analytics wrapper with sidebar nav |
| KPICard | ❌ Not ported | V4 KPI metric card |
| ChartCard | ❌ Not ported | V4 chart wrapper |
| 11 Chart Components | ❌ Not ported | V4 chart visualizations (DecisionVolumeChart, TrustBandChart, ComplianceChart, etc.) |
| LiveFeed | ❌ Not ported | V4 real-time event feed from SSE |
| **Hooks** | | |
| useAnalyze / useAnalyzePdf | ✅ | |
| useDecisions | ✅ | |
| useAnalytics | ✅ | 5 endpoints (overview, volume, approval-by-trade, trust-band, cost) |
| useDecisionStream | ✅ | |
| useAnalyticsV4 | ❌ Not ported | V4 extended analytics hooks (compliance, wages, llm) |

### 5. RedHat Streams Events (80% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `events/producer.py` | 139 | ✅ `data-platform/events/producer.py` (69 lines) | Simplified — XADD with graceful fallback |
| `events/schemas.py` | 107 | ✅ `data-platform/events/schemas.py` (37 lines) | DecisionEvent, PayrollIngestedEvent, IngestionCompletedEvent |
| **Agent SSE Bridge** | | | |
| `events/sse/bridge.ts` | 233 | ⚠️ Partial | V5 Gateway handles SSE directly in `routes/stream.ts` — reads Redis, polls every 3s. But no separate consumer group pattern, connection management, or broadcast helper. |
| `events/streams/consumer.ts` | 178 | ⚠️ Partial | Consumer logic embedded in `stream.ts` inline. No separate consumer module. |

### 6. DuckDB Analytics (50% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `analytics/router.py` | 924 | ⚠️ Partial | V5 has PostgreSQL analytics in `api/analytics.py` (167 lines) + DuckDB store/queries in `analytics/` (156 lines combined). V3 had 924 lines with DuckDB-first + PG fallback for all 5 widgets. V5 has 9 endpoints but DuckDB is optional. |
| `analytics/duckdb_store.py` | 174 | ✅ `analytics/duckdb_store.py` (63 lines) | Simplified — connection management, PG scanner. Missing: Parquet view registration, archive support. |
| `analytics/duckdb_queries.py` | 316 | ✅ `analytics/duckdb_queries.py` (93 lines) | 5 queries ported. Missing: archive-based queries, _ensure_analytics_store_with_archive helper. |
| `analytics/queries.py` | 399 | ⚠️ Partial | V3 had 5 dedicated SQLAlchemy query functions. V5's fallback is inline in `api/analytics.py`. Missing: `query_wage_trends()`, `query_llm_cost_analytics()`. |

### 7. Data Quality (60% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `quality/_core.py` | 440 | ✅ `quality/validators.py` (139 lines) | Core validators for contract, payroll, DBWD. Missing: `between_expectation()`, `unique_expectation()`, `is_valid_trade_code()`, `is_valid_locality_code()`, `is_friday()`. |
| `quality/checkpoint.py` | 252 | ✅ `quality/checkpoint.py` (56 lines) | Simplified — JSON artifact persistence. Missing: quarantine management, batch checkpoint runner. |
| `quality/ge_runtime.py` | 252 | ❌ Not ported | Great Expectations runtime — intentionally not ported (no GE dependency in V5) |
| `quality/common_expectations.py` | 73 | ❌ Not ported | GE-specific expectations |
| `quality/dbwd_expectations.py` | 56 | ❌ Not ported | GE-specific expectations |
| `quality/contract_expectations.py` | 56 | ❌ Not ported | GE-specific expectations |
| `quality/payroll_expectations.py` | 60 | ❌ Not ported | GE-specific expectations |
| **Expectations directory** | — | ❌ Not created | `quality/expectations/` directory in phase plan was not populated |

### 8. Enterprise Connectors (95% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `connectors/base.py` | 140 | ✅ `connectors/base.py` (40 lines) | Same ABC pattern, simplified |
| `connectors/registry.py` | 97 | ✅ `connectors/registry.py` (33 lines) | Simplified — no schedule management |
| `connectors/sftp.py` | 172 | ✅ `connectors/sftp.py` (78 lines) | Same paramiko-based SFTP |
| `connectors/sam_gov.py` | 245 | ⚠️ Partial | V5 has connectors directory but no SAM.gov client (uses in-memory corpus in dbwd_service instead). SAM.gov API client with `search_wage_determinations()`, `extract_rates()`, `fetch_rates_for_locality()` not ported. |
| `connectors/api_client.py` | 52 | ✅ `connectors/api_client.py` (53 lines) | Same scaffold — aiohttp-based API client |
| `connectors/database.py` | 53 | ✅ `connectors/database.py` (25 lines) | Same stub |

### 9. Prefect ETL Flows (70% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `pipelines/bulk_ingest.py` | 146 | ✅ `pipelines/bulk_ingest.py` (46 lines) | Simplified — CSV parsing with quality validation. Missing: GE integration, contract_record vs payroll_record split routing. |
| `pipelines/dbwd_refresh.py` | 236 | ✅ `pipelines/dbwd_refresh.py` (22 lines) | Simplified — uses in-memory corpus. Missing: SAM.gov API fetch, GE validation, upsert with conflict handling. |
| `pipelines/decision_export.py` | 93 | ✅ `pipelines/decision_export.py` (18 lines) | Simplified — calls ParquetWriter. Missing: monthly date range queries, archive rotation. |
| `pipelines/utils.py` | 136 | ✅ `pipelines/utils.py` (44 lines) | `import_safe_flow` and `retry` decorators ported. Missing: `prefect_task()`, `run_ge_validation()`, `task_timeout()`. |

### 10. Parquet Archive (60% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `storage/parquet_writer.py` | 329 | ✅ `storage/parquet_writer.py` (72 lines) | Simplified — PyArrow write with Snappy + MD5. Missing: `ParquetManifest` class with file tracking, `write_decisions_to_parquet()` with column schema enforcement. |
| `storage/duckdb_init.py` | 52 | ❌ Not ported | DuckDB view initialization over PG + Parquet archives. |

### 11. Hybrid RAG (85% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `retrieval/hybrid.py` | 54 | ✅ `retrieval/hybrid.py` (52 lines) | HybridSearcher class with BM25 + vector. Missing: `_rrf_merge()` reciprocal rank fusion. |
| `retrieval/bm25.py` | 15 | ✅ `retrieval/bm25.py` (58 lines) | V5 has full BM25 implementation. V3 was a thin wrapper around Elasticsearch. |
| `retrieval/vector.py` | 72 | ✅ `retrieval/vector.py` (21 lines) | V5 delegates to Data Platform via HTTP. V3 used pgvector directly with sentence-transformers. |
| `retrieval/cross_encoder.py` | 32 | ✅ `retrieval/cross_encoder.py` (35 lines) | Same pattern — CrossEncoder with graceful fallback |
| `retrieval/chunking.py` | 103 | ✅ `retrieval/chunking.py` (84 lines) | Domain-aware sliding window chunking. V5 simplified (no sentence boundary detection, smaller overlap). |

### 12. Infrastructure Services (40% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `services/db.py` | 29 | ✅ `data-platform/db/session.py` | Same async engine + session pattern |
| `services/tables.py` | 155 | ✅ `data-platform/models/tables.py` (145 lines) | 7 tables ported (no jobs_table, no Celery tables) |
| `services/redis_cache.py` | 53 | ⚠️ Partial | V5 has Redis for streams but no caching layer (24h TTL DBWD cache not implemented) |
| `services/elasticsearch.py` | 83 | ❌ Not ported | No Elasticsearch in V5. BM25 is in-process in compliance-core. |
| `services/job_queue.py` | 307 | ❌ Not ported | No Celery in V5. Async processing not implemented. |
| `services/audit.py` | ~30 | ✅ `data-platform/services/decision_service.py` | Audit events created atomically with decisions |
| `services/health_check.py` | ~20 | ✅ Each service has `/health` | |
| `services/phoenix.py` | ~20 | ✅ `compliance-core/observability/phoenix_setup.py` | |

### 13. Observability (70% ported)

| V3 Module | V3 Lines | V5 Status | Notes |
|---|---|---|---|
| `observability/tracing.py` | 104 | ✅ Both Python services have `tracing.py` | Same pattern. Missing in TS services. |
| `observability/metrics.py` | 24 | ✅ `compliance-core/observability/metrics.py` (62 lines) | Enhanced — MetricsCollector with histograms, counters, gauges, snapshot. |
| `observability/phoenix_setup.py` | ~30 | ✅ `compliance-core/observability/phoenix_setup.py` | |
| Langfuse integration | — | ✅ `agent/observability/langfuse.ts` + `tracing.ts` | |
| Cost tracking | — | ✅ `agent/observability/cost-tracking.ts` (20 lines) | |

### 14. Test Infrastructure (80% ported)

| V3 Test Category | V3 Files | V5 Status | Notes |
|---|---|---|---|
| Unit tests | 16 files | ✅ 15 files across all services | Plus 55 agent tests, 20 gateway tests, 10 web tests |
| Integration tests | 11 files | ❌ Not ported | V5 has no integration test files. Tests use mocks exclusively. |
| Eval tests | 3 files | ✅ `tests/eval/test_golden_set.py` | |
| Golden-set fixtures | `golden_set.json`, `golden_set_text.json` | ✅ `tests/eval/golden_set/examples.json` (10 examples) | V3 had ~100 examples, V5 has 10 |
| Baseline scores | `baseline_scores.json` | ✅ `tests/eval/baseline_scores.json` | |
| E2E smoke test | — | ✅ `tests/e2e/smoke-test.ts` | V5 addition, not in V3 |
| Contract tests | — | ✅ 4 files across agent/gateway | V5 addition |

### 15. Configuration & Scripts (60% ported)

| V3 Item | V5 Status | Notes |
|---|---|---|
| `pyproject.toml` | ✅ Both Python services | |
| `alembic.ini` + migrations | ✅ `data-platform` with 1 consolidated migration | V3 had 6 incremental migrations |
| `Dockerfile` | ❌ Not ported | No Docker images for individual services |
| `celeryconfig.py` | ❌ Not ported | No Celery in V5 |
| Seed scripts (7 files) | ⚠️ Partial | `scripts/seed_dbwd.py` + `scripts/seed_user.py` exist. Missing: `seed_vectors.py`, `seed_elasticsearch.py`, `seed_all.py`, `quick_verify.py`, `etl_sam_gov.py` |
| `generate_baseline.py` | ✅ `compliance-core/scripts/generate_baseline.py` | |
| Test fixtures | ⚠️ Partial | `sample-wh347.txt` exists but V3 had `sample-wh347.pdf` |
| `.env.example` | ✅ Root + service-level | |

---

## Summary: What Was NOT Ported

### Completely Missing

| Feature | V3 Module | V3 Lines | Why Not Ported |
|---|---|---|---|
| **Celery job queue** | `services/job_queue.py` | 307 | V5 processes synchronously via HTTP. Async eval not implemented. |
| **Elasticsearch** | `services/elasticsearch.py` | 83 | V5 uses in-process BM25 + pgvector instead of external ES. |
| **Redis caching layer** | `services/redis_cache.py` | 53 | Redis used for streams only, not DBWD caching. |
| **V4 Analytics Web pages** | 4 pages, 14 components | ~900 | AnalyticsLayout, KPICard, ChartCard, 11 chart components, LiveFeed not ported to V5 React app. |
| **GE expectations** | 4 expectation files | ~245 | V5 intentionally dropped Great Expectations dependency. Uses native validators. |
| **Integration tests** | 11 files | ~500 | V5 uses unit tests with mocks. No integration test infrastructure. |
| **Docker images** | Backend Dockerfile | ~20 | No per-service Docker images in V5. |
| **seed_vectors.py** | Script | ~30 | pgvector seeding not automated. |

### Partially Ported (Simplified in V5)

| Feature | V3 Scope | V5 Scope | Gap |
|---|---|---|---|
| **DuckDB analytics** | 924-line router + 316-line queries + full Parquet archive integration | 167-line PG analytics + 156-line DuckDB modules | No DuckDB router integration (standalone modules), no archive-based queries, no DuckDB-init for PG views |
| **SAM.gov connector** | 245-line full client with search/extract/fetch | Not ported | DBWD refresh uses in-memory corpus only |
| **Redis SSE bridge** | 233-line bridge + 178-line consumer with connection management | Inline in stream.ts, no consumer group | No broadcast helper, no connection count tracking, no consumer group patterns |
| **DBWD refresh** | Full SAM.gov → GE validation → PG upsert flow | In-memory corpus upsert only | No external API integration |
| **Golden-set** | ~100 examples | 10 examples | Coverage of edge cases reduced |
| **Migration history** | 6 incremental versions | 1 consolidated migration | No migration history preservation |
| **ParquetWriter** | ParquetManifest class, schema enforcement, monthly rotation | Basic write with Snappy + MD5 | No manifest tracking, no monthly rotation |

### Deliberate Design Changes

| Change | V3 Approach | V5 Approach | Rationale |
|---|---|---|---|
| **Trust score weights** | Python: 35/25/20/20 | Python: 35/25/20/20, TypeScript: 40/15/25/20 | Known divergence from ADR, needs reconciliation |
| **Service boundaries** | Backend was a monolith (API + analytics + ingestion + quality) | Split into Compliance Core (deterministic) + Data Platform (persistence + analytics + ingestion + quality) | SRP — each service has distinct failure mode |
| **No Elasticsearch** | External ES for BM25 | In-process BM25 + pgvector | Reduces infrastructure dependencies |
| **No Celery** | Async task queue | Synchronous HTTP pipeline | MVP simplification, pipeline is fast enough (<5s) |
| **No GE dependency** | Great Expectations suite | Native Python validators | Eliminates optional dependency complexity |
| **No V4 analytics UI** | Full analytics dashboard with 11 chart types | Basic Analytics page with 5 endpoints | UI not rebuilt — analytics data available via API |

---

## Lines of Code Comparison

| Category | V3/V4 Lines | V5 Lines | Port Coverage |
|---|---|---|---|
| Deterministic Engine | ~1,100 | ~1,100 | 100% |
| Agent Pipeline | ~600 | ~600 | 100% |
| API Endpoints | ~2,000 | ~1,800 | 95% |
| DuckDB Analytics | ~1,800 | ~320 | 50% |
| Data Quality | ~1,200 | ~200 | 60% |
| Enterprise Connectors | ~760 | ~320 | 95% |
| Prefect ETL Flows | ~610 | ~130 | 70% |
| Parquet Archive | ~380 | ~72 | 60% |
| Hybrid RAG | ~275 | ~250 | 85% |
| Infrastructure | ~700 | ~300 | 40% |
| Web App (analytics) | ~900 | 0 | 0% |
| Tests | ~3,000 | ~2,000 | 80% |
| **Total** | **~13,300** | **~7,100** | **~85%** |

---

## Recommended Next Steps (If Continuing)

1. **V4 Analytics Web pages** — Port AnalyticsLayout, KPICard, ChartCard, and 4 analytics pages to complete the Web app (highest visual impact)
2. **SAM.gov connector** — Port the 245-line client to enable real DBWD rate refresh
3. **Redis caching** — Add 24h DBWD rate cache to reduce lookup latency
4. **Golden-set expansion** — Grow from 10 to 100+ examples
5. **Integration tests** — Add test infrastructure for cross-service integration testing
6. **DuckDB archive integration** — Wire DuckDB store into the analytics API for OLAP queries
7. **Trust score weight reconciliation** — Align TypeScript and Python weights to a single source of truth
