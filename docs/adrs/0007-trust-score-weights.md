# ADR 0007: Trust Score Weights

**Status:** Accepted

**Date:** 2026-05-06

## Context

V5 originally had divergent trust-score weights between Python and TypeScript implementations:

- Python: 35/25/20/20 for deterministic, classification, LLM self-confidence, and agreement.
- TypeScript: 40/15/25/20 for the same components.

That divergence meant the same inputs could produce different scores depending on which service computed them.

## Decision

Adopt 35/25/20/20 as the single V5 trust-score weighting model.

## Rationale

1. Deterministic validation is the source of compliance truth.
2. Classification quality deserves substantial weight because trade classification determines which DBWD rate applies.
3. LLM self-confidence should be bounded and less influential than deterministic and classification evidence.
4. Agreement between deterministic findings and LLM synthesis is important enough to remain an explicit component.

## Component Breakdown

| Component | Weight | Explanation |
|---|---:|---|
| deterministic | 0.35 | Rule-engine outcome based on violations and warnings |
| classification | 0.25 | Classification/input confidence component |
| llm_self | 0.20 | LLM confidence, constrained to 0.0-1.0 |
| agreement | 0.20 | Whether LLM verdict agrees with deterministic findings |

## Safe Verdict Override

Regardless of trust score, `safeVerdict()` overrides any non-rejected LLM verdict to `rejected` when deterministic violations exist.

## Consequences

- TypeScript trust scoring must stay aligned to 35/25/20/20.
- Golden-set baselines should be regenerated when score logic changes.
- Trust score band thresholds remain:
  - `>= 0.85` -> `auto_approve`
  - `>= 0.60` -> `flag_for_review`
  - `< 0.60` -> `require_human_review`

## Status

Accepted and implemented in the active Mastra Agent path:

- TypeScript: `apps/agent/src/mastra/trust.ts` `computeTrustComponents()`
- Python aggregate helper: `apps/compliance-core/src/wcp_compliance/rules/trust_score.py` `compute_trust_score()`
