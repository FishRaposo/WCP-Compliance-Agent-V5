# V5 Porting Guide: V3/V4 Archive → V5 Services

This document maps every V3/V4 source file to its V5 destination.

## Backend → Compliance Core

| V3 File | V5 Destination | Lines | Status |
|---|---|---|---|
| `backend/src/wcp_backend/pipeline/extraction.py` | `apps/compliance-core/src/wcp_compliance/extraction/pdf_extractor.py` | 340 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/rules.py` (rule engine) | `apps/compliance-core/src/wcp_compliance/rules/engine.py` | ~150 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/rules.py` (trust score) | `apps/compliance-core/src/wcp_compliance/rules/trust_score.py` | ~100 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/checks/wage_check.py` | `apps/compliance-core/src/wcp_compliance/checks/wage_check.py` | ~40 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/checks/overtime_check.py` | `apps/compliance-core/src/wcp_compliance/checks/overtime_check.py` | ~40 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/checks/fringe_check.py` | `apps/compliance-core/src/wcp_compliance/checks/fringe_check.py` | ~40 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/checks/signature_check.py` | `apps/compliance-core/src/wcp_compliance/checks/signature_check.py` | ~30 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/checks/total_check.py` | `apps/compliance-core/src/wcp_compliance/checks/total_check.py` | ~30 | ✅ Ported |
| `backend/src/wcp_backend/pipeline/dbwd_lookup.py` | `apps/compliance-core/src/wcp_compliance/dbwd_matching/rate_lookup.py` | 271 | ✅ Ported (simplified) |
| `backend/src/wcp_backend/models/schemas.py` | `apps/compliance-core/src/wcp_compliance/models/schemas.py` | 138 | ✅ Ported |
| `backend/src/wcp_backend/models/enums.py` | `apps/compliance-core/src/wcp_compliance/models/enums.py` | 43 | ✅ Ported |
| `backend/src/wcp_backend/models/aliases.py` | `apps/compliance-core/src/wcp_compliance/normalization/trade_aliases.py` | 79 | ✅ Ported |
| `backend/src/wcp_backend/config.py` | `apps/compliance-core/src/wcp_compliance/config.py` | ~60 | ✅ Ported |
| `backend/src/wcp_backend/main.py` | `apps/compliance-core/src/wcp_compliance/main.py` | ~30 | ✅ Ported |
| `backend/src/wcp_backend/api/extract.py` | `apps/compliance-core/src/wcp_compliance/api/extract.py` | ~50 | ✅ Ported |
| `backend/src/wcp_backend/api/validate.py` | `apps/compliance-core/src/wcp_compliance/api/validate.py` | ~50 | ✅ Ported |

## Backend → Data Platform

| V3 File | V5 Destination | Lines | Status |
|---|---|---|---|
| `backend/src/wcp_backend/services/db.py` | `apps/data-platform/src/wcp_data/db/session.py` | 28 | ✅ Ported |
| `backend/src/wcp_backend/services/tables.py` | `apps/data-platform/src/wcp_data/models/tables.py` | 154 | ✅ Ported |
| `backend/src/wcp_backend/services/audit.py` | `apps/data-platform/src/wcp_data/services/decision_service.py` + `audit_service.py` | 100 | ✅ Ported |
| `backend/src/wcp_backend/contracts/service.py` | `apps/data-platform/src/wcp_data/services/contract_service.py` | 306 | ✅ Ported |
| `backend/src/wcp_backend/contracts/router.py` | `apps/data-platform/src/wcp_data/api/contracts.py` | 79 | ✅ Ported |
| `backend/src/wcp_backend/payrolls/service.py` | `apps/data-platform/src/wcp_data/services/payroll_service.py` | 240 | ✅ Ported |
| `backend/src/wcp_backend/payrolls/router.py` | `apps/data-platform/src/wcp_data/api/payrolls.py` | 54 | ✅ Ported |
| `backend/src/wcp_backend/ingestion/service.py` | `apps/data-platform/src/wcp_data/api/ingestion.py` | 224 | ✅ Scaffolded |
| `backend/migrations/versions/001-006` | `apps/data-platform/src/wcp_data/migrations/versions/001_initial.py` | Consolidated | ✅ Ported |

## Agent → Gateway

| V3 File | V5 Destination | Lines | Status |
|---|---|---|---|
| `agent/src/server.ts` (Hono bootstrap) | `apps/gateway/src/server.ts` | ~50 | ✅ Ported |
| `agent/src/config.ts` (partial) | `apps/gateway/src/config.ts` | ~40 | ✅ Ported |
| `agent/src/api/auth.ts` | `apps/gateway/src/routes/auth.ts` | ~60 | ✅ Ported |
| `agent/src/api/analyze.ts` | `apps/gateway/src/routes/analyze.ts` | ~40 | ✅ Ported |
| `agent/src/api/analyze-pdf.ts` | `apps/gateway/src/routes/analyze-pdf.ts` | ~60 | ✅ Ported |
| `agent/src/api/decisions.ts` | `apps/gateway/src/routes/decisions.ts` | ~50 | ✅ Ported |
| `agent/src/api/v4/contracts.ts` | `apps/gateway/src/routes/contracts.ts` | ~50 | ✅ Ported |
| `agent/src/api/v4/payrolls.ts` | `apps/gateway/src/routes/payrolls.ts` | ~40 | ✅ Ported |
| `agent/src/api/v4/ingestion.ts` | `apps/gateway/src/routes/ingestion.ts` | ~40 | ✅ Ported |
| `agent/src/api/analytics.ts` | `apps/gateway/src/routes/analytics.ts` | ~40 | ✅ Ported |
| `agent/src/middleware/auth.ts` | `apps/gateway/src/middleware/auth.ts` | ~60 | ✅ Ported |
| `agent/src/middleware/rate_limiter.ts` | `apps/gateway/src/middleware/rate-limiter.ts` | ~50 | ✅ Ported |
| `agent/src/api/v4/proxy.ts` | `apps/gateway/src/clients/*.ts` | N/A | ✅ Refactored |

## Agent → Agent Orchestration

| V3 File | V5 Destination | Lines | Status |
|---|---|---|---|
| `agent/src/mastra/agents/wcp-verdict.ts` | `apps/agent/src/agents/wcp-verdict.ts` | ~100 | ✅ Ported |
| `agent/src/mastra/agents/trust-score.ts` | `apps/agent/src/agents/trust-score.ts` | ~60 | ✅ Ported |
| `agent/src/mastra/workflows/wcp-pipeline.ts` | `apps/agent/src/workflows/wcp-pipeline.ts` | ~100 | ✅ Ported |
| `agent/src/mastra/tools/extract.ts` | `apps/agent/src/tools/extract.ts` | ~20 | ✅ Ported |
| `agent/src/mastra/tools/validate.ts` | `apps/agent/src/tools/validate.ts` | ~20 | ✅ Ported |
| `agent/src/mastra/tools/dbwd_lookup.ts` | `apps/agent/src/tools/dbwd-lookup.ts` | ~20 | ✅ Ported |
| `agent/src/mastra/tools/search.ts` | `apps/agent/src/tools/search.ts` | ~20 | ✅ Ported |
| `agent/src/mastra/tools/persist.ts` | `apps/agent/src/tools/persist.ts` | ~20 | ✅ Ported |
| `agent/src/lib/llm-router.ts` | `apps/agent/src/model-router/llm-router.ts` | ~80 | ✅ Ported |
| `agent/src/prompts/registry.ts` | `apps/agent/src/prompts/registry.ts` | ~40 | ✅ Ported |
| `agent/src/prompts/versions/wcp-verdict-v1.ts` | `apps/agent/src/prompts/versions/wcp-verdict-v1.ts` | ~30 | ✅ Ported |
| `agent/src/langfuse/client.ts` | `apps/agent/src/observability/langfuse.ts` | ~15 | ✅ Ported |
| `agent/src/langfuse/cost-tracking.ts` | `apps/agent/src/observability/cost-tracking.ts` | ~30 | ✅ Ported |

## Frontend → Web App

| V3 File | V5 Destination | Lines | Status |
|---|---|---|---|
| `frontend/src/App.tsx` | `apps/web/src/App.tsx` | ~100 | ✅ Ported |
| `frontend/src/main.tsx` | `apps/web/src/main.tsx` | ~15 | ✅ Ported |
| `frontend/src/types/api.ts` | `apps/web/src/types/api.ts` | ~97 | ✅ Ported |
| `frontend/src/utils/api-client.ts` | `apps/web/src/utils/api-client.ts` | ~114 | ✅ Ported |
| `frontend/src/utils/mock-data.ts` | `apps/web/src/utils/mock-data.ts` | ~309 | ✅ Ported |
| `frontend/src/hooks/*` (4 files) | `apps/web/src/hooks/*` | ~200 | ✅ Ported |
| `frontend/src/components/ui/*` (8 files) | `apps/web/src/components/ui/*` | ~300 | ✅ Ported |
| `frontend/src/components/*.tsx` (8 files) | `apps/web/src/components/*.tsx` | ~800 | ✅ Ported |
| `frontend/src/pages/*.tsx` (7 files) | `apps/web/src/pages/*.tsx` | ~1500 | ✅ Ported |

## Deferred (Phase 4+)

| V3 Module | Lines | Notes |
|---|---|---|
| `backend/analytics/*` (DuckDB) | ~1,870 | Phase 4: Data Platform analytics |
| `backend/pipelines/*` (Prefect ETL) | ~710 | Phase 4: Data Platform ETL |
| `backend/events/*` (Redis Streams) | ~250 | Phase 4: Event publishing |
| `backend/quality/*` (GE) | ~1,200 | Phase 4: Data quality |
| `backend/storage/*` (Parquet) | ~380 | Phase 4: Archival |
| `backend/retrieval/*` (RAG) | ~270 | Phase 5: RAG integration |
| `backend/connectors/*` | ~750 | Phase 4+: Enterprise connectors |
| `agent/src/events/*` (Redis consumer) | ~200 | Phase 4: Event bridge |
| `frontend/src/pages/analytics/*` (V4) | ~400 | Phase 4: Analytics pages |
| `frontend/src/components/analytics/*` | ~500 | Phase 4: Chart components |

## Shared Schemas

| V3 Schema | V5 Destination | Status |
|---|---|---|
| `shared/schemas/extracted-wcp.json` | `packages/contracts/schemas/extracted-wcp.json` | ✅ Ported |
| `shared/schemas/deterministic-report.json` | `packages/contracts/schemas/deterministic-report.json` | ✅ Ported (enhanced) |
| `shared/schemas/llm-verdict.json` | Merged into `decision-draft.json` | ✅ Evolved |
| `shared/schemas/trust-scored-decision.json` | `packages/contracts/schemas/decision-record.json` | ✅ Evolved |
| `shared/schemas/audit-event.json` | `packages/contracts/schemas/audit-event.json` | ✅ Ported |
| N/A | `packages/contracts/schemas/decision-draft.json` | ✅ New |
| N/A | `packages/contracts/schemas/contract.json` | ✅ New |
| N/A | `packages/contracts/schemas/payroll-record.json` | ✅ New |
| N/A | `packages/contracts/schemas/ingestion-job.json` | ✅ New |
