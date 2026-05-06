# Case Study: WCP Compliance Agent V5

## Problem Statement

The Davis-Bacon Act requires contractors on federally funded construction projects to pay workers prevailing wages and submit certified payroll records (WH-347 forms). Compliance officers manually review these forms — a tedious, error-prone process involving cross-referencing wage rates from Davis-Bacon Wage Determinations (DBWD), checking arithmetic, and flagging violations.

Automating this with AI is challenging because:
1. The LLM might miss arithmetic errors or fabricate confidence
2. DBWD rates change periodically and vary by trade and locality
3. WH-347 forms come in inconsistent formats (scanned PDFs, typed PDFs, plain text)
4. Every decision must be auditable — who flagged what, when, and why
5. False approvals carry legal risk

## Architecture Decisions

### Deterministic Validation as Source of Truth

The LLM generates explanations and citations, but the deterministic rule engine is the source of compliance truth. Five checks run per employee:
- **Wage check**: hourly rate ≥ DBWD prevailing wage
- **Overtime check**: hours > 40 must have 1.5x overtime pay
- **Fringe check**: fringe benefits ≥ DBWD fringe rate × hours
- **Totals check**: gross = hours × rate + OT premium, net = gross − deductions (1¢ tolerance)
- **Signature check**: certification date must exist and not be future-dated

Plus two automatic checks per employee: data integrity (no negative wages, impossible hours) and minimum wage sanity (≥ $7.25/hr).

### Five Services by Responsibility

Each service has a distinct failure mode, test strategy, scaling pattern, and reason to change:

- **Web** fails when rendering breaks → component tests
- **Gateway** fails when auth/routing breaks → middleware unit tests
- **Agent** fails when LLM API is down or prompt is bad → mock mode unit tests
- **Compliance Core** fails when extraction regex breaks → golden-set eval tests
- **Data Platform** fails when PostgreSQL is down → repo unit tests with mocks

### Trust Score: LLM Confidence Is Not Enough

Four components prevent the LLM from being trusted alone:
1. **Deterministic score** (40%): 1.0 − (violations / total checks)
2. **Classification score** (15%): fixed 0.95 multiplier
3. **LLM self-confidence** (25%): the LLM's own confidence rating
4. **Agreement score** (20%): does the LLM agree with deterministic findings?

A "safe verdict" override rejects any LLM approval when deterministic violations exist.

## Pipeline Design

The 5-step pipeline processes each payroll in ~2s (mock mode) or ~5s (real mode with LLM):

```
Extract → Validate → Verdict → Trust Score → Persist
```

Each step is timed independently, costs are tracked per model, and every cross-service call carries `x-request-id` for traceability.

## RAG Strategy

Hybrid retrieval combines:
- **BM25 keyword search** over regulation corpus (fast, exact term matching)
- **Vector similarity** via pgvector against embedded regulation chunks (semantic matching)
- Falls back gracefully when vector search is unavailable

## Testing Approach

205 tests across three test strategies:
1. **Unit tests** — every function, check, repository, service, tool, middleware
2. **Contract tests** — schema validation at service boundaries
3. **Golden-set eval** — 10 curated WH-347 examples with expected verdicts and regression detection

Mock mode enables full pipeline testing without any external dependencies: `LLM_MODE=mock` returns deterministic verdicts, `VITE_MOCK_API=true` returns fixture data, `WCP_MOCK_AUTH=true` bypasses JWT.

## Lessons Learned

1. **Boundaries prevent the monolith trap** — V4's data platform became a monolith because "data" was too vague a boundary. V5's boundaries are specific: "decisions", "audit events", "contracts", "payrolls" — each a distinct concern.

2. **Deterministic checks before LLM** — The LLM adds value through explanation and context, but the math must be right before the LLM sees the data.

3. **Mock everything** — Mock mode was designed in from the start. Every service has a mock path. The full pipeline can run without PostgreSQL, Redis, LLM API keys, or external connectors.

4. **Trace everything** — `x-request-id` propagates through all 16 steps. Every decision is linked to its audit events. You can trace any verdict back to the input that produced it.

5. **Test at boundaries** — Contract tests verify that the Agent's `TrustScoredDecision` matches the Data Platform's `DecisionCreate` schema. When schemas change, contract tests catch mismatches before integration tests fail.
