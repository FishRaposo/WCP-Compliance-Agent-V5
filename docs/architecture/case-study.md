# Case Study: WCP Compliance Agent V5

## Problem Statement

The Davis-Bacon Act requires contractors on federally funded construction projects to pay workers prevailing wages and submit certified payroll records (WH-347 forms). Compliance officers manually review these forms by cross-referencing Davis-Bacon Wage Determinations (DBWD), checking arithmetic, and flagging violations.

Automating this with AI is challenging because:

1. The LLM might miss arithmetic errors or fabricate confidence.
2. DBWD rates vary by trade, locality, and effective date.
3. WH-347 forms arrive as scanned PDFs, typed PDFs, and plain text.
4. Every decision must be auditable.
5. False approvals carry legal and operational risk.

## Architecture Decisions

### Deterministic Validation As Source Of Truth

The LLM generates explanations and citations, but deterministic rule results are authoritative. Checks include wage rates, overtime, fringe benefits, totals, signatures, classification, data integrity, and minimum wage sanity.

### Five Services By Responsibility

Each service has a distinct failure mode, test strategy, scaling pattern, and reason to change:

- **Web** fails when rendering or client workflows break, covered by component tests.
- **Gateway** fails when auth, routing, request IDs, or SSE behavior break, covered by middleware and route tests.
- **Agent** fails when workflow orchestration, tools, LLM fallback, or trust scoring breaks, covered by Mastra/Vitest tests.
- **Compliance Core** fails when extraction or deterministic checks drift, covered by pytest and golden-set evals.
- **Data Platform** fails when persistence, audit, or data APIs drift, covered by repository/service/API tests.

### Trust Score: LLM Confidence Is Not Enough

The Agent uses four weighted components:

1. **Deterministic score (35%)**: rule-engine outcome based on violations and warnings.
2. **Classification score (25%)**: confidence in classification and structured extraction inputs.
3. **LLM self-confidence (20%)**: the model's confidence, bounded by schema validation.
4. **Agreement score (20%)**: whether the LLM agrees with deterministic findings.

A safe-verdict override rejects any LLM approval when deterministic violations exist.

## Pipeline Design

```text
Extract -> Validate -> Verdict -> Trust Score -> Persist
```

Mastra owns orchestration. The Agent calls Compliance Core for extraction/validation, computes verdict/trust, then submits the `TrustScoredDecision` to Data Platform. The Agent never writes to the database directly; Data Platform creates the official `DecisionRecord` and `AuditEvent` rows.

Each step records latency. Real mode can emit LLM cost and observability traces; mock mode keeps deterministic workflow coverage without LLM API keys.

## RAG Strategy

Retrieval combines:

- Keyword/regulatory search over the Davis-Bacon corpus.
- Optional vector retrieval through Mastra vector stores.
- Graceful fallback when vector storage or embeddings are unavailable.

## Testing Approach

Current finalization coverage:

1. **TypeScript**: 42 Contracts, 66 Agent, 45 Gateway, 29 Web, and four tooling tests.
2. **Compliance Core**: 84 unit tests and 101 eval tests, covering 100 WH-347 examples plus baseline regression.
3. **Data Platform**: unit and integration command gates run under Python 3.12/Poetry with PostgreSQL/Redis CI services.
4. **Browser/evidence**: desktop and mobile smoke projects plus a normalized, checksum-verified five-service evidence bundle.

Mock modes are scoped:

- `VITE_MOCK_API=true` lets the Web app run without backend services.
- `LLM_MODE=mock` bypasses LLM calls while still running the Mastra workflow and internal service boundaries.

The canonical evidence scenario goes further by composing the five service contracts
without network infrastructure while still delegating deterministic truth to the real
Compliance Core engine. It is reproducible portfolio proof, not a hosted-production
claim.

## Lessons Learned

1. **Boundaries prevent the monolith trap**: each service owns a concrete domain and can fail independently.
2. **Deterministic checks before LLM**: the math must be right before explanation.
3. **Mock mode must not erase contracts**: bypassing LLMs is useful, but internal service shapes still need contract tests.
4. **Trace IDs must reach persistence**: `x-trace-id` has to flow into audit/event records, not only HTTP logs.
5. **Generated contracts must follow real payloads**: schema packages are only useful when they validate actual service-boundary data.
