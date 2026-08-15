# Phase 4: Minimum Vertical Slice

> **Historical phase record.** Status and checkboxes below describe the original build sequence.

**Goal:** One complete WH-347 analysis works end-to-end. Upload PDF through Web → Gateway validates → Agent orchestrates → Compliance Core extracts and validates → Agent synthesizes verdict → Data Platform persists decision + audit events → Web displays result with trust score, citations, and audit trail.

**Prerequisites:** Phase 3 complete (services boot, contracts aligned, seed data loaded).
**Estimated Time:** 2–3 sessions.

## Task Breakdown

### 4.1 Wire Gateway → Agent Analysis Flow

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.1.1 | Verify analyze route forwards to Agent | `apps/gateway/src/routes/analyze.ts` | POST text → Agent `/internal/workflows/analyze-wcp` |
| 4.1.2 | Verify analyze-pdf route handles multipart | `apps/gateway/src/routes/analyze-pdf.ts` | Upload PDF → forward to Agent workflow |
| 4.1.3 | Add error handling for Agent failures | `apps/gateway/src/routes/analyze.ts`, `analyze-pdf.ts` | Return structured error responses |

### 4.2 Wire Agent → Compliance Core Pipeline

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.2.1 | Verify extract tool calls Compliance Core | `apps/agent/src/tools/extract.ts` | POST to `http://localhost:8000/internal/extract` |
| 4.2.2 | Verify validate tool calls Compliance Core | `apps/agent/src/tools/validate.ts` | POST to `http://localhost:8000/internal/validate` |
| 4.2.3 | Verify dbwd-lookup tool | `apps/agent/src/tools/dbwd-lookup.ts` | GET rate data from compliance-core or data-platform |
| 4.2.4 | Verify persist tool calls Data Platform | `apps/agent/src/tools/persist.ts` | POST to `http://localhost:8001/internal/decisions` |
| 4.2.5 | Verify full pipeline orchestration | `apps/agent/src/workflows/wcp-pipeline.ts` | 5-step chain completes with mock LLM |

### 4.3 Wire Agent → Data Platform Persistence

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.3.1 | Verify decision creation endpoint | `apps/data-platform/src/wcp_data/api/decisions.py` | POST `/internal/decisions` creates DecisionRecord |
| 4.3.2 | Verify audit event creation | `apps/data-platform/src/wcp_data/api/audit_events.py` | POST `/internal/audit-events` creates AuditEvent |
| 4.3.3 | Verify decision service creates both atomically | `apps/data-platform/src/wcp_data/services/decision_service.py` | Decision + audit events in one flow |
| 4.3.4 | Verify decision query endpoint | `apps/data-platform/src/wcp_data/api/decisions.py` | GET `/internal/decisions/:id` returns full record |

### 4.4 Wire Gateway → Data Platform Reads

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.4.1 | Verify decisions list proxy | `apps/gateway/src/routes/decisions.ts` | GET `/api/v1/decisions` → Data Platform |
| 4.4.2 | Verify single decision proxy | `apps/gateway/src/routes/decisions.ts` | GET `/api/v1/decisions/:id` → Data Platform |

### 4.5 Wire Web → Gateway Full Flow

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.5.1 | Verify Web analyze page works | `apps/web/src/pages/Analyze.tsx` | Upload PDF → PipelineVisualizer → DecisionCard |
| 4.5.2 | Verify decisions page lists results | `apps/web/src/pages/Decisions.tsx` | Shows persisted decisions from Data Platform |
| 4.5.3 | Verify dashboard shows KPIs | `apps/web/src/pages/Dashboard.tsx` | Total decisions, approval rate, trust score |

### 4.6 SSE Streaming (Stub)

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.6.1 | Add SSE decision stream to Gateway | `apps/gateway/src/routes/decisions.ts` | `GET /api/v1/decisions/stream` — stub returning heartbeats |
| 4.6.2 | Verify Web useDecisionStream hook connects | `apps/web/src/hooks/useDecisionStream.ts` | EventSource connects to Gateway SSE endpoint |

### 4.7 End-to-End Smoke Test

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.7.1 | Write E2E smoke test script | `tests/e2e/smoke-test.sh` (new) | Starts infra, starts services, uploads PDF, verifies decision persisted |
| 4.7.2 | Test with curl | Manual | Upload fixture PDF via curl, verify full pipeline response |
| 4.7.3 | Test with Web UI | Manual | Upload through browser, verify decision displayed |

### 4.8 Trace ID Propagation

| # | Task | File(s) | Details |
|---|---|---|---|
| 4.8.1 | Verify request-id middleware attaches header | `apps/gateway/src/middleware/request-id.ts` | Every request gets `x-request-id` |
| 4.8.2 | Verify agent passes trace headers to tools | `apps/agent/src/tools/*.ts` | All tool calls forward `x-request-id`, `x-trace-id` |
| 4.8.3 | Verify Data Platform stores trace_id | `apps/data-platform/src/wcp_data/models/tables.py` | `trace_id` column in decisions table |

## Exit Criteria

- [ ] Upload a WH-347 PDF through the Web UI
- [ ] PipelineVisualizer shows all 5 steps completing
- [ ] DecisionCard displays verdict, trust score, citations, issues
- [ ] Decision is persisted in PostgreSQL (`SELECT * FROM decisions`)
- [ ] Audit events exist in PostgreSQL (`SELECT * FROM audit_events`)
- [ ] Trace ID (`x-request-id`) propagates across all services
- [ ] Agent never writes directly to database
- [ ] Decisions page lists the persisted decision
- [ ] SSE stream endpoint responds (even if just heartbeats)
- [ ] Mock mode (`LLM_MODE=mock`) produces deterministic verdicts
