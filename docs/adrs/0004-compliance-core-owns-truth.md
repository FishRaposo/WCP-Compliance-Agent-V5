# ADR 0004: Compliance Core Owns Deterministic Truth

**Status:** Accepted

**Date:** 2026-05-05

## Decision

The Compliance Core service owns extraction, normalization, rule checks, citation mapping, deterministic reports, trust score inputs, and golden-set evaluation. The LLM may explain and synthesize, but it must not become the source of legal or mathematical truth.

## Context

In V3, the Python backend was the deterministic engine and the Agent Gateway was the LLM orchestration layer. This separation was correct. However, V4 bolted persistence, analytics, ingestion, and storage onto the same backend, diluting the clarity of the deterministic compliance boundary.

## Rationale

Davis-Bacon Act compliance decisions carry legal weight. Violations can result in back wages, interest, debarment, and class-action lawsuits. When the Department of Labor audits in three years, the system must produce:

1. **Deterministic check results** — wage rates, overtime calculations, fringe benefit verification, arithmetic checks.
2. **Regulation citations** — specific statutory and regulatory references for every check.
3. **Reproducible trust scores** — deterministic algorithms, not LLM-dependent assessments.
4. **Golden-set regression tests** — automated validation against known-correct results.

The Compliance Core provides all of these without depending on LLM availability. The Agent adds value through explanation, synthesis, edge-case classification, and human-readable verdict generation — but it always cites the deterministic evidence.

## Consequences

- Easier legal defensibility — deterministic checks are reproducible and auditable.
- Better test coverage — compliance rules are unit-testable without LLM mocks.
- LLM verdicts must cite deterministic check IDs and regulation references.
- Trust scores are computed from deterministic inputs (0.35), classification confidence (0.25), LLM self-assessment (0.20), and agreement signals (0.20).
- The Compliance Core never calls LLM APIs. It never depends on external AI services for correctness.
