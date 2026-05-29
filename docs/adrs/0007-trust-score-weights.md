# ADR 0007: Trust Score Weights

**Status:** Accepted

**Date:** 2026-05-06

## Context

V5 has two implementations of the trust score calculation:
- **Python** (Compliance Core): weights 35/25/20/20 (deterministic/classification/llm_self/agreement)
- **TypeScript** (Agent): weights 40/15/25/20

This divergence creates inconsistency — the same inputs produce different scores depending on which service computes them.

## Decision

**Adopt the Python weights (35/25/20/20) as the single source of truth.**

### Rationale

1. **Compliance Core is the source of deterministic truth** (ADR 0004). The trust score is primarily a deterministic calculation, so it belongs in Compliance Core.
2. **The Python weights give more weight to classification quality (25% vs 15%)** — this matters because trade classification accuracy directly affects which DBWD rate is used for validation.
3. **The Python weights reduce the LLM self-assessment component (20% vs 25%)** — reducing over-reliance on LLM confidence scores.
4. **Higher deterministic weight in TS (40% vs 35%) was an experiment** that penalized the deterministic component more heavily. The Python distribution is more balanced.

### Component Breakdown

| Component | Weight | Explanation |
|---|---|---|
| deterministic | 0.35 | 1.0 − (violations / total_checks) |
| classification | 0.25 | Fixed 0.95 multiplier for trade classification accuracy |
| llm_self | 0.20 | LLM's own confidence score (0.0–1.0) |
| agreement | 0.20 | Does LLM agree with deterministic findings? 1.0/0.5/0.0 |

### Safe Verdict Override

Regardless of trust score, the `safeVerdict()` function overrides any LLM "approved" verdict to "rejected" when deterministic violations exist.

## Consequences

- TypeScript `computeTrustComponents()` weights must be aligned to 35/25/20/20
- Golden-set baseline scores must be regenerated
- Trust score band thresholds remain unchanged:
  - `≥ 0.85` → auto_approve
  - `≥ 0.60` → flag_for_review
  - `< 0.60` → require_human_review

## Status

Accepted. Implemented in Phase 15. Both services confirmed using 35/25/20/20 weights:
- TypeScript: `apps/agent/src/agents/trust-score.ts` `computeTrustComponents()`
- Python: `apps/compliance-core/src/wcp_compliance/rules/engine.py` `compute_trust_components()`

Band thresholds confirmed identical: `HIGH_BAND=0.85`, `REVIEW_THRESHOLD=0.60`.
