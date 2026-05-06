# V5 Known Gaps

**Last updated:** 2026-05-06

This document tracks known limitations, edge cases, and deferred features. V5 is functionally complete — these are quality hardening items, not blockers.

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

V5 has no cross-service integration tests. All 198 unit tests use mocks. Integration tests require Docker PostgreSQL + Redis runtime.

| Test | Status |
|---|---|
| Gateway → Agent → Compliance Core pipeline | Not implemented |
| Gateway → Compliance Core PDF extraction | Not implemented |
| Agent → Data Platform persistence flow | Not implemented |
| SSE stream with Redis | Not implemented |
| Hybrid RAG search | Not implemented |

Infrastructure defined in `docs/planning/v5.1-implementation-plan.md` Phase 13.

## Performance & Scale

No load testing or benchmarks have been performed. Known considerations:

- Rate limiter is in-memory (not shared across Gateway instances)
- DBWD rate lookup is in-memory (20 DC trades) — SAM.gov client exists but not tested
- No connection pool tuning beyond defaults (`pool_size=10, max_overflow=20`)
- No Redis caching for DBWD rates (service exists but not wired into lookup path)

## UI Gaps

- No PDF upload UI integration tested end-to-end (mock mode works)
- Analytics pages show data tables, not charts (recharts not installed)
- No mobile-responsive testing

## Documentation

- No demo GIF (`docs/demo.gif`)
- No fixture PDF (`packages/test-fixtures/sample-wh347.pdf` — `.txt` exists)

## Deliberate Omissions

These V3 features were intentionally not ported:

| Feature | Reason |
|---|---|
| Celery job queue | Pipeline is synchronous HTTP (<5s), no async processing needed |
| Elasticsearch | In-process BM25 + pgvector covers RAG needs |
| Great Expectations | Native Python validators in `quality/validators.py` |
| Prefect (full) | `import_safe_flow` decorator provides Prefect compatibility without dependency |
| 11 recharts components | Data displayed as cards/tables; charting library can be added later |
