# V5 Known Gaps

**Last updated:** 2026-06-15

This document tracks known limitations, edge cases, and deferred features. V5 is functionally complete — these are quality hardening items, not blockers.

## Resolved in the 2026-06-15 hardening pass

These were previously hollow/scaffolded and are now real and tested:

| Area | Before | Now |
|---|---|---|
| Regulation citations / RAG | `HybridSearcher._corpus` empty; BM25 returned nothing; citations ungrounded | Bundled `citations/regulation_corpus.json` (auto-loaded); every deterministic check grounds its `regulation_cite` to real text; `DeterministicReport.citations` populated; mock-mode decisions carry grounded citations; `/internal/search/index` endpoint added; `searchTool` response-shape bug fixed |
| Real-time SSE feed | Decision events never reached the gateway (envelope mismatch) | `events/producer.py` emits the `{type, event}` envelope the SSE bridge expects (with `created_at`); web hook listens for the named `decision.created` event |
| Workflow status | `GET /:id/status` returned hardcoded `"completed"` | In-memory workflow registry tracks real pending/running/completed/failed + per-step progress; gateway passthrough at `/api/v1/workflows/:id/status` |
| Overtime check | Recorded OT always "passed" without verifying the premium | Validates the reported OT rate is ≥ 1.5× base (FAIL on underpay, WARNING when no OT rate is reported); extractor parses `OT Rate` |
| Trust score classification factor | Hardcoded `0.95` (TS + Py) | Computed from classification checks (identical TS/Py formula) |
| LLM provider fallback | `generateWithFallback` was dead code | Verdict synthesis uses `generateObjectWithFallback` (fallback chain) before degrading to needs_review |
| `trace_id` propagation | Never reached the decision record | Forwarded as a query param on persist → DecisionRecord, audit events, and the Redis event |
| Observability startup | `setup_tracing`/`setup_phoenix`/`instrument_app` never invoked | Wired into both FastAPI lifespans, gated to a no-op unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set |
| Contract registration UI | `setTimeout` simulation | Real `POST /api/v1/contracts` (gateway maps `location`→`locality`) |
| Decision detail | No detail route | `/decisions/:id` page renders the report, grounded citations, and trace metadata |
| ESLint gate | `pnpm lint` broken (no config/deps) | Flat `eslint.config.js` + deps; `pnpm -r run lint` passes clean |
| `seed_vectors.py` | POSTed to a nonexistent endpoint | Targets the real `/internal/search/index`, sends `X-Internal-Token` |

## Extraction Edge Cases (8 known)

The block-based WH-347 parser doesn't handle these format variants:

| # | Issue | Example | Workaround |
|---|---|---|---|
| 1 | "Overtime Hours" label | `Overtime Hours: 5` not parsed in block mode | Use `Overtime: 5` or `OT: 5` |
| 2 | "Employee:" label | `Employee: Casey Work` not extracted as name | Use `Name: Casey Work` |
| 3 | "Classification:" label | `Classification: Electrician` not matched | Use `Trade: Electrician` |
| 4 | "Wage:" shorthand | `Wage: 55.00` not extracted | Use `Hourly Wage: 55.00` |
| 5 | "Site Location" variant | `Site Location: Washington, DC` not extracted | Use `Location:` or `Project Location:` |
| 6 | "01/12/2025" date format in block mode | MM/DD/YYYY only works in row format | Use `Certified: 2025-06-15` |
| 7 | "January 15, 2025" in block mode | Long-form dates not parsed in block context | Use ISO format |
| 8 | Decimal hours in block mode | `Hours: 40.5` with `Overtime Hours: 0.5` causes totals mismatch | Use integer hours |

These are extraction regex gaps, not rule engine bugs. All 8 have documented golden-set examples in `tests/eval/golden_set/` (commented out).

## Trust Score Divergence (RESOLVED)

~~TypeScript and Python implementations used different weights~~ → **Resolved in Phase 15.** Both now use 35/25/20/20.

## Integration Tests

Unit test infrastructure complete (271 tests). Cross-service integration tests require Docker runtime.

| Test | Status |
|---|---|
| Data Platform DBWD flow | ✅ `tests/integration/test_dbwd_flow.py` |
| Data Platform decision lifecycle | ✅ `tests/integration/test_decision_lifecycle.py` |
| Data Platform analytics endpoints | ✅ `tests/integration/test_analytics_endpoints.py` |
| Redis cache layer | ✅ `tests/integration/test_redis_cache.py` |
| Gateway → Agent → Compliance Core pipeline | Requires live Docker stack |
| SSE stream with Redis | Requires live Docker stack |

Test infra: `infra/docker-compose.test.yml` (ports 5433/6380).

## Performance & Scale

No load testing or benchmarks have been performed. Known considerations:

- Rate limiter is in-memory (not shared across Gateway instances)
- ~~DBWD rate lookup is in-memory~~ → SAM.gov wired into refresh pipeline (Phase 10); Redis cache wired into rate lookup (Phase 11)
- No connection pool tuning beyond defaults (`pool_size=10, max_overflow=20`)
- ~~No Redis caching for DBWD rates~~ → Redis cache fully wired in `dbwd_service.get_rates()` and `get_rate()`

## UI Gaps

- No PDF upload UI integration tested end-to-end (mock mode works)
- ~~Analytics pages show data tables, not charts~~ → 11 recharts chart components implemented (Phase 9); all 4 analytics pages use real charts
- No mobile-responsive testing

## Documentation

- No demo GIF (`docs/demo.gif`)
- No fixture PDF (`packages/test-fixtures/sample-wh347.pdf` — `.txt` exists)

## Deferred maximal-build-out items (designed, not yet implemented)

These were scoped during the maximal build-out but deferred; each is additive and
boundary-respecting. They do not block the core vertical slice.

- ~~**RBAC / multi-tenant**~~ → **Implemented (2026-06-15).** Roles
  (admin/auditor/viewer) + `tenant_id` in the gateway JWT and the
  `/internal/auth/validate` response; `tenant_id` columns on
  users/contracts/decisions/audit_events/ingestion_jobs via Alembic migration
  `002`. A `requireRole` middleware gates mutating gateway routes and `X-Tenant-Id`
  is threaded to the data platform, which filters contract/decision reads by tenant.
  Enforcement is behind the `RBAC_ENFORCED` flag (default `false`) and the
  `AUTH_DISABLED` dev bypass still issues `role=admin`/`tenant=default`, so existing
  flows are unchanged.
- ~~**Decision override persistence**~~ → **Implemented (2026-06-15).**
  `POST /internal/decisions/{id}/override` persists
  `review_status`/`reviewed_by`/`review_note`/`reviewed_at` via a dialect-agnostic
  SQLAlchemy `update()` and appends a `decision_override` audit event in one
  transaction; gateway passthrough at `POST /api/v1/decisions/:id/override` (admin or
  auditor); the Review Queue now calls it instead of mutating local UI state.
- **Ingestion file upload** — a real `POST /api/v1/ingestion/upload` multipart route
  (the page still simulates the upload; job-metadata creation already works).
- **Multi-jurisdiction DBWD data** — the in-memory rate corpus is still ~20 DC trades
  in two places; broadening to multiple localities requires re-keying the lookup by
  `(trade, locality)` to avoid trade-name collisions.
- **Batch analysis workflow** — `POST /internal/workflows/analyze-batch` + a gateway
  `/api/v1/analyze/batch` fan-out.
- **Expanded analytics** — violation-trend and reviewer-throughput queries/charts
  (the reviewer-throughput dependency on the decision override/review columns is now
  satisfied by migration `002`).
- **`connectors/database.py`** — still a stub (`fetch` returns `[]`).
- **Performance** — Redis-backed rate limiter (currently in-memory) and a load-test
  script; no load testing performed.

## Deliberate Omissions

These V3 features were intentionally not ported:

| Feature | Reason |
|---|---|
| Celery job queue | Pipeline is synchronous HTTP (<5s), no async processing needed |
| Elasticsearch | In-process BM25 + pgvector covers RAG needs |
| Great Expectations | Native Python validators in `quality/validators.py` |
| Prefect (full) | `import_safe_flow` decorator provides Prefect compatibility without dependency |
| 11 recharts components | Data displayed as cards/tables; charting library can be added later |
