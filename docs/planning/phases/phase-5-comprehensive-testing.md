# Phase 5: Comprehensive Testing

**Goal:** 250+ tests across all services. Every module has unit tests, every API endpoint has at least one test, all service boundaries have contract tests. Test coverage ≥80% on core business logic modules.

**Prerequisites:** Phase 4 complete (vertical slice works).
**Estimated Time:** 3–4 sessions.
**Target:** 250+ tests total (matching V3's test count).

## Test Distribution Target

| Service | Target Tests | Current | New Needed |
|---|---|---|---|
| Compliance Core | 50+ | 5 stubs | ~45 new |
| Data Platform | 40+ | 4 stubs | ~36 new |
| Gateway | 30+ | 1 setup | ~30 new |
| Agent | 40+ | 0 | ~40 new |
| Web | 20+ | 1 | ~20 new |
| Contract tests | 10+ | 0 | ~10 new |
| **Total** | **190+** | **11** | **~181 new** |

## Task Breakdown

### 5.1 Compliance Core Tests (~45 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.1.1 | PDF extraction — text parsing | `tests/unit/test_extraction.py` | 10 | Test `extract_from_text()` with various WH-347 formats: standard, missing fields, multiple employees, edge cases |
| 5.1.2 | PDF extraction — PDF file | `tests/unit/test_extraction.py` | 3 | Test `extract_from_pdf()` with fixture PDF files |
| 5.1.3 | Wage check | `tests/unit/test_checks.py` | 5 | Pass/fail/warning scenarios with different rates |
| 5.1.4 | Overtime check | `tests/unit/test_checks.py` | 4 | Hours > 40, hours <= 40, missing OT rate, correct OT calculation |
| 5.1.5 | Fringe check | `tests/unit/test_checks.py` | 4 | Adequate fringe, insufficient fringe, zero fringe, fringe > required |
| 5.1.6 | Signature check | `tests/unit/test_checks.py` | 3 | Present date, missing date, future date |
| 5.1.7 | Total arithmetic check | `tests/unit/test_checks.py` | 4 | Correct totals, gross mismatch, net mismatch, tolerance boundary |
| 5.1.8 | Rule engine integration | `tests/unit/test_rules.py` | 5 | Full `run_rule_engine()` with various employee setups |
| 5.1.9 | Trust score computation | `tests/unit/test_trust_score.py` | 6 | Each component, weighted formula, band boundaries, safe verdict override |
| 5.1.10 | DBWD lookup | `tests/unit/test_dbwd_lookup.py` | 5 | Exact match, alias resolution, fuzzy match, locality normalization, fallback |

### 5.2 Data Platform Tests (~36 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.2.1 | Decision repository CRUD | `tests/unit/test_decision_repo.py` | 6 | Create, get, list with pagination, filter by trust band, filter by verdict |
| 5.2.2 | Audit event repository | `tests/unit/test_audit_repo.py` | 4 | Create event, list by decision_id, list by request_id, immutability check |
| 5.2.3 | Contract repository CRUD | `tests/unit/test_contract_repo.py` | 6 | Create, get, list, update, soft-delete, duplicate detection |
| 5.2.4 | Payroll repository | `tests/unit/test_payroll_repo.py` | 5 | Bulk import, partition creation, list by contract, get by ID |
| 5.2.5 | DBWD repository | `tests/unit/test_dbwd_repo.py` | 3 | Store rates, query by trade/locality, refresh |
| 5.2.6 | Decision service | `tests/unit/test_decision_service.py` | 4 | Create from draft, validate draft shape, audit event creation, trace ID storage |
| 5.2.7 | Contract service | `tests/unit/test_contract_service.py` | 4 | Business logic: duplicate detection, bulk import, validation |
| 5.2.8 | API endpoint tests | `tests/unit/test_api_endpoints.py` (new) | 4 | Test `/internal/decisions`, `/internal/contracts`, `/internal/audit-events` with mock DB |

### 5.3 Gateway Tests (~30 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.3.1 | Auth middleware | `tests/unit/auth-middleware.test.ts` (new) | 6 | Valid JWT, expired JWT, missing token, malformed token, AUTH_DISABLED mode, cookie auth |
| 5.3.2 | Rate limiter | `tests/unit/rate-limiter.test.ts` (new) | 4 | Under limit, at limit, over limit, window expiry |
| 5.3.3 | Request validation | `tests/unit/request-validation.test.ts` (new) | 4 | Valid analyze request, missing text, invalid PDF type, oversized file |
| 5.3.4 | JWT signing | `tests/unit/jwt.test.ts` (new) | 3 | Sign token, verify token, expired token rejection |
| 5.3.5 | Route integration | `tests/unit/routes.test.ts` (new) | 6 | `/health`, `/api/v1/analyze` with mock agent, `/api/v1/decisions` with mock data-platform, auth routes |
| 5.3.6 | Service client | `tests/unit/service-client.test.ts` (new) | 4 | GET, POST, error handling, timeout |
| 5.3.7 | Request ID middleware | `tests/unit/request-id.test.ts` (new) | 3 | Generate new ID, pass through existing ID, attach to response |

### 5.4 Agent Tests (~40 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.4.1 | Verdict agent (mock mode) | `tests/unit/wcp-verdict.test.ts` (new) | 6 | Mock verdict generation, structured output shape, citation inclusion, fallback on error, confidence scoring |
| 5.4.2 | Trust score computation | `tests/unit/trust-score.test.ts` (new) | 5 | Weighted formula, band determination, safe verdict override, boundary values |
| 5.4.3 | Pipeline workflow | `tests/unit/wcp-pipeline.test.ts` (new) | 5 | Full 5-step pipeline with mock tools, partial failure, extraction failure handling |
| 5.4.4 | LLM router | `tests/unit/llm-router.test.ts` (new) | 6 | Provider selection by context, fallback chain, Ollama for cost mode, compliance-critical routing |
| 5.4.5 | Prompt registry | `tests/unit/prompt-registry.test.ts` (new) | 3 | Get prompt, list versions, fallback to local |
| 5.4.6 | Tool calls | `tests/unit/tools.test.ts` (new) | 8 | Each tool (extract, validate, dbwd-lookup, search, persist) with mock service responses |
| 5.4.7 | Cost tracking | `tests/unit/cost-tracking.test.ts` (new) | 4 | Per-model cost computation, free models, unknown model handling |
| 5.4.8 | Config validation | `tests/unit/config.test.ts` (new) | 3 | Valid config, missing required vars, production guards |

### 5.5 Web Tests (~20 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.5.1 | TrustScoreBadge | `tests/TrustScoreBadge.test.tsx` (new) | 3 | Green band, yellow band, red band rendering |
| 5.5.2 | DecisionCard | `tests/DecisionCard.test.tsx` (new) | 3 | Renders verdict, shows citations, displays trust score |
| 5.5.3 | UploadDropzone | `tests/UploadDropzone.test.tsx` (new) | 3 | Drag-and-drop interaction, file type validation, text paste |
| 5.5.4 | API client | `tests/api-client.test.ts` (new) | 4 | GET request, POST with auth header, mock mode routing, 401 redirect |
| 5.5.5 | Routing | `tests/App.test.tsx` | 4 | Login route, protected route redirect, dashboard loads, 404 page |
| 5.5.6 | Mock data | `tests/mock-data.test.ts` (new) | 3 | Fixtures have valid shape, all required fields present |

### 5.6 Contract Tests (~10 new)

| # | Test Category | File | Count | Details |
|---|---|---|---|---|
| 5.6.1 | Gateway → Agent | `apps/gateway/tests/contract/gateway-agent.test.ts` | 2 | Analyze request/response shape matches TrustScoredDecision |
| 5.6.2 | Agent → Compliance Core | `apps/agent/tests/contract/agent-compliance.test.ts` | 2 | Extract request/response shape matches ExtractedWCP, validate matches DeterministicReport |
| 5.6.3 | Agent → Data Platform | `apps/agent/tests/contract/agent-data-platform.test.ts` | 3 | Persist decision shape, get decisions shape, audit event shape |
| 5.6.4 | Gateway → Data Platform | `apps/gateway/tests/contract/gateway-data-platform.test.ts` | 2 | Contracts list shape, contract detail shape |
| 5.6.5 | Schema validation | `packages/contracts/tests/schemas.test.ts` | 1 | All JSON schemas are valid JSON Schema v7 |

## Test Infrastructure Requirements

### Python Test Setup
- Both Python services use pytest with `asyncio_mode = auto`
- Unit tests need no infrastructure (mock DB sessions via conftest.py)
- Integration tests need PostgreSQL running
- conftest.py provides FastAPI `TestClient` and sample fixtures:
  - `sample_extracted_wcp` — pre-built ExtractedWCP with 3 employees
  - `sample_dbwd_rate` — DBWD rate for Electrician in Washington DC

### TypeScript Test Setup
- All TS services use vitest
- Gateway and Agent tests mock external service calls with `vi.fn()` or MSW
- Web tests use `@testing-library/react` and jsdom
- Each service has its own `vitest.config.ts` (or uses Vite's built-in)

## Writing Order (Recommended)

1. **Compliance Core tests first** — most critical logic, no external deps, fastest feedback
2. **Data Platform tests** — repo + service layers, need DB mock setup
3. **Agent tests** — mock LLM + mock service clients
4. **Gateway tests** — mock all three backend clients
5. **Web tests** — component rendering, mock API
6. **Contract tests last** — depend on all services having stable types

## Exit Criteria

- [ ] 190+ tests pass across all services
- [ ] Compliance Core: ≥80% coverage on `extraction/`, `checks/`, `rules/`, `dbwd_matching/`
- [ ] Data Platform: ≥80% coverage on `services/`, `repositories/`
- [ ] Gateway: ≥80% coverage on `middleware/`, `routes/`
- [ ] Agent: ≥80% coverage on `agents/`, `workflows/`, `tools/`
- [ ] Web: all components render without errors, mock mode works
- [ ] All contract tests pass (service boundary shapes verified)
- [ ] `pnpm test` passes across all TS packages
- [ ] Both `poetry run pytest tests/unit` pass with zero failures
