# Phase 6: V4 Data Platform Feature Migration

**Goal:** Port all V4 capabilities from the V3/V4 archive into the V5 Data Platform service, behind clean `/internal/` APIs. Add V4 analytics pages to the Web App.

**Prerequisites:** Phase 4 complete (vertical slice works). Can run in parallel with Phase 5 (testing).
**Estimated Time:** 4–5 sessions.

## V3/V4 Source Reference

| V3 Module | Lines | V5 Destination |
|---|---|---|
| `backend/analytics/*` | ~1,870 | `apps/data-platform/src/wcp_data/analytics/` (new) |
| `backend/pipelines/*` | ~710 | `apps/data-platform/src/wcp_data/pipelines/` (new) |
| `backend/events/*` | ~250 | `apps/data-platform/src/wcp_data/events/` |
| `backend/quality/*` | ~1,200 | `apps/data-platform/src/wcp_data/quality/` (new) |
| `backend/storage/*` | ~380 | `apps/data-platform/src/wcp_data/storage/` (new) |
| `backend/retrieval/*` | ~270 | `apps/compliance-core/src/wcp_compliance/retrieval/` (new) |
| `backend/connectors/*` | ~750 | `apps/data-platform/src/wcp_data/connectors/` (new) |
| `agent/src/events/*` | ~200 | `apps/gateway/src/events/` (new) |
| `frontend/src/pages/analytics/*` | ~400 | `apps/web/src/pages/analytics/` (new) |
| `frontend/src/components/analytics/*` | ~500 | `apps/web/src/components/analytics/` (new) |

## Task Breakdown

### 6.1 Contract CRUD with Bulk Import

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.1.1 | Verify contract CRUD endpoints | `backend/contracts/service.py` | Already scaffolded in `api/contracts.py`, `services/contract_service.py` |
| 6.1.2 | Add CSV bulk import to contracts | `backend/contracts/service.py:bulk_import_contracts` | `services/contract_service.py` — fill in CSV parsing |
| 6.1.3 | Add contract filtering and pagination | `backend/contracts/service.py:list_contracts` | `services/contract_service.py`, `repositories/contract_repo.py` |
| 6.1.4 | Wire Gateway contract routes | `agent/src/api/v4/contracts.ts` | Already scaffolded in `routes/contracts.ts` |
| 6.1.5 | Test contract CRUD E2E | Manual | Create, list, get, update, delete, bulk import via Gateway |

### 6.2 Payroll Records with Partitioning

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.2.1 | Verify payroll bulk import | `backend/payrolls/service.py:bulk_import_payrolls` | `services/payroll_service.py`, `repositories/payroll_repo.py` |
| 6.2.2 | Verify partition creation | `backend/payrolls/service.py:ensure_partition` | `repositories/payroll_repo.py` |
| 6.2.3 | Add payroll filtering | `backend/payrolls/service.py:list_payrolls` | `services/payroll_service.py` |
| 6.2.4 | Test payroll import E2E | Manual | Bulk import via Gateway, verify partitions created |

### 6.3 Bulk CSV Ingestion Pipeline

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.3.1 | Port ingestion job lifecycle | `backend/ingestion/service.py` | `api/ingestion.py` — enhance existing scaffold |
| 6.3.2 | Add CSV parsing logic | `backend/ingestion/router.py:bulk_upload` | `api/ingestion.py` — multipart handling + CSV parse |
| 6.3.3 | Wire Gateway ingestion routes | `agent/src/api/v4/ingestion.ts` | Already scaffolded in `routes/ingestion.ts` |
| 6.3.4 | Test ingestion E2E | Manual | Upload CSV, check job status, verify records |

### 6.4 DuckDB Analytics

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.4.1 | Create analytics directory | `backend/analytics/` | `apps/data-platform/src/wcp_data/analytics/` (new) |
| 6.4.2 | Port DuckDB store | `backend/analytics/duckdb_store.py` (173 lines) | `analytics/duckdb_store.py` (new) — connection management, postgres_scanner, parquet views |
| 6.4.3 | Port DuckDB queries | `backend/analytics/duckdb_queries.py` (315 lines) | `analytics/duckdb_queries.py` (new) — decision volume, compliance breakdown, wage analytics, LLM analytics |
| 6.4.4 | Port PostgreSQL fallback queries | `backend/analytics/queries.py` (398 lines) | `analytics/queries.py` (new) — SQLAlchemy aggregate queries |
| 6.4.5 | Port analytics router | `backend/analytics/router.py` (923 lines) | `analytics/router.py` (new) — DuckDB-primary with PG fallback |
| 6.4.6 | Add DuckDB + PyArrow to pyproject.toml | `backend/pyproject.toml` extras | `apps/data-platform/pyproject.toml` — add `duckdb`, `pyarrow`, `pandas` |

### 6.5 DBWD Rate Snapshots and Refresh

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.5.1 | Create connectors directory | `backend/connectors/` | `apps/data-platform/src/wcp_data/connectors/` (new) |
| 6.5.2 | Port SAM.gov client | `backend/connectors/sam_gov.py` (244 lines) | `connectors/sam_gov.py` (new) — WDOL API client |
| 6.5.3 | Port DBWD refresh logic | `backend/pipelines/dbwd_refresh.py` (235 lines) | `apps/data-platform/src/wcp_data/pipelines/dbwd_refresh.py` (new) |
| 6.5.4 | Wire `/internal/dbwd/refresh` | `api/dbwd.py` | Already scaffolded — fill in with SAM.gov fetch + upsert |

### 6.6 Redis Streams Event Publishing

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.6.1 | Port event schemas | `backend/events/schemas.py` (107 lines) | `events/schemas.py` — DecisionEvent, PayrollIngestedEvent, etc. |
| 6.6.2 | Port event producer | `backend/events/producer.py` (138 lines) | `events/producer.py` — XADD to `wcp.decisions`, `wcp.payrolls` |
| 6.6.3 | Wire event emission into decision_service | `services/decision_service.py` | Emit decision event after persist |
| 6.6.4 | Port SSE bridge to Gateway | `agent/src/events/sse/bridge.ts` | `apps/gateway/src/events/sse-bridge.ts` (new) |
| 6.6.5 | Port Redis Streams consumer | `agent/src/events/streams/consumer.ts` | `apps/gateway/src/events/stream-consumer.ts` (new) |
| 6.6.6 | Wire Gateway SSE endpoint | `agent/src/api/events.ts` | `apps/gateway/src/routes/events.ts` (new) — `GET /api/v1/events/stream` |

### 6.7 Parquet Archive Export

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.7.1 | Create storage directory | `backend/storage/` | `apps/data-platform/src/wcp_data/storage/` (new) |
| 6.7.2 | Port ParquetWriter + Manifest | `backend/storage/parquet_writer.py` (328 lines) | `storage/parquet_writer.py` (new) — PyArrow + Snappy + MD5 manifest |
| 6.7.3 | Port DuckDB init | `backend/storage/duckdb_init.py` (51 lines) | `storage/duckdb_init.py` (new) — register views |

### 6.8 Data Quality Validation

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.8.1 | Create quality directory | `backend/quality/` | `apps/data-platform/src/wcp_data/quality/` (new) |
| 6.8.2 | Port core validators | `backend/quality/_core.py` (439 lines) | `quality/validators.py` (new) — native validation without GE dependency |
| 6.8.3 | Port checkpoint runner | `backend/quality/checkpoint.py` (251 lines) | `quality/checkpoint.py` (new) — validation artifact persistence |
| 6.8.4 | Port expectation suites | `backend/quality/*_expectations.py` | `quality/expectations/` (new) — DBWD, contract, payroll suites |

### 6.9 Prefect ETL Flows

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.9.1 | Create pipelines directory | `backend/pipelines/` | `apps/data-platform/src/wcp_data/pipelines/` (new) |
| 6.9.2 | Port Prefect utilities | `backend/pipelines/utils.py` (135 lines) | `pipelines/utils.py` (new) — import-safe decorators, retry/timeout |
| 6.9.3 | Port bulk ingest flow | `backend/pipelines/bulk_ingest.py` (145 lines) | `pipelines/bulk_ingest.py` (new) — CSV → validate → import |
| 6.9.4 | Port decision export flow | `backend/pipelines/decision_export.py` (92 lines) | `pipelines/decision_export.py` (new) — monthly Parquet export |
| 6.9.5 | Add Prefect to pyproject.toml | `backend/pyproject.toml` extras | `apps/data-platform/pyproject.toml` — add `prefect` |

### 6.10 V4 Analytics Pages (Web)

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.10.1 | Create analytics pages directory | `frontend/src/pages/analytics/` | `apps/web/src/pages/analytics/` (new) |
| 6.10.2 | Port AnalyticsLayout component | `frontend/src/components/analytics/AnalyticsLayout.tsx` | `components/analytics/AnalyticsLayout.tsx` (new) |
| 6.10.3 | Port KPICard component | `frontend/src/components/analytics/KPICard.tsx` | `components/analytics/KPICard.tsx` (new) |
| 6.10.4 | Port ChartCard component | `frontend/src/components/analytics/ChartCard.tsx` | `components/analytics/ChartCard.tsx` (new) |
| 6.10.5 | Port 11 chart components | `frontend/src/components/analytics/*Chart*.tsx` | `components/analytics/*Chart*.tsx` (new) |
| 6.10.6 | Port LiveFeed component | `frontend/src/components/analytics/LiveFeed.tsx` | `components/analytics/LiveFeed.tsx` (new) |
| 6.10.7 | Port analytics overview page | `frontend/src/pages/analytics/index.tsx` | `pages/analytics/Overview.tsx` (new) |
| 6.10.8 | Port compliance analytics page | `frontend/src/pages/analytics/compliance.tsx` | `pages/analytics/Compliance.tsx` (new) |
| 6.10.9 | Port wages analytics page | `frontend/src/pages/analytics/wages.tsx` | `pages/analytics/Wages.tsx` (new) |
| 6.10.10 | Port LLM analytics page | `frontend/src/pages/analytics/llm.tsx` | `pages/analytics/LLM.tsx` (new) |
| 6.10.11 | Add lazy-loaded routes to App.tsx | `frontend/src/App.tsx` | `apps/web/src/App.tsx` — add 4 analytics sub-routes |
| 6.10.12 | Add V4 analytics hooks | `frontend/src/hooks/useAnalytics.ts` | `apps/web/src/hooks/useAnalyticsV4.ts` (new) |
| 6.10.13 | Extend mock data for V4 analytics | `frontend/src/utils/mock-data.ts` | `apps/web/src/utils/mock-data.ts` — add analytics fixtures |

### 6.11 Enterprise Connectors

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.11.1 | Port base connector ABC | `backend/connectors/base.py` (139 lines) | `connectors/base.py` (new) |
| 6.11.2 | Port connector registry | `backend/connectors/registry.py` (96 lines) | `connectors/registry.py` (new) |
| 6.11.3 | Port SFTP connector | `backend/connectors/sftp.py` (171 lines) | `connectors/sftp.py` (new) |
| 6.11.4 | Port API connector scaffold | `backend/connectors/api_client.py` | `connectors/api_client.py` (new) |
| 6.11.5 | Port DB connector scaffold | `backend/connectors/database.py` | `connectors/database.py` (new) |

### 6.16 Hybrid RAG (Compliance Core)

| # | Task | V3 Source | V5 File(s) |
|---|---|---|---|
| 6.16.1 | Create retrieval directory | `backend/retrieval/` | `apps/compliance-core/src/wcp_compliance/retrieval/` (new) |
| 6.16.2 | Port hybrid search orchestrator | `backend/retrieval/hybrid.py` (53 lines) | `retrieval/hybrid.py` (new) — BM25 + vector + rerank |
| 6.16.3 | Port BM25 retrieval | `backend/retrieval/bm25.py` (14 lines) | `retrieval/bm25.py` (new) |
| 6.16.4 | Port vector retrieval | `backend/retrieval/vector.py` (71 lines) | `retrieval/vector.py` (new) — pgvector + sentence-transformers |
| 6.16.5 | Port cross-encoder reranker | `backend/retrieval/cross_encoder.py` (31 lines) | `retrieval/cross_encoder.py` (new) |
| 6.16.6 | Port text chunking | `backend/retrieval/chunking.py` (102 lines) | `retrieval/chunking.py` (new) |
| 6.16.7 | Wire `/internal/search` to real RAG | `api/search.py` | Replace stub with hybrid search call |

## Exit Criteria

- [ ] Contract CRUD with bulk CSV import works through Gateway → Data Platform
- [ ] Payroll bulk import with partition creation works
- [ ] Ingestion job creation and status tracking works
- [ ] DuckDB analytics queries return data (with PG fallback)
- [ ] DBWD rate refresh from SAM.gov works (or graceful failure)
- [ ] Decision events published to Redis Streams
- [ ] Gateway SSE bridge streams events to Web
- [ ] Parquet archive export produces valid files
- [ ] Data quality validators run on ingestion pipelines
- [ ] V4 analytics pages render in Web App with real data
- [ ] Hybrid RAG search returns regulation chunks
- [ ] All V4 demo paths available through V5 APIs
