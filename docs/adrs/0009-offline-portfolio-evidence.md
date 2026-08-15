# ADR 0009: Canonical offline portfolio evidence

Status: Accepted

## Context

The five-service architecture has optional production integrations, but a portfolio
review must be reproducible without provider credentials, hosted infrastructure, or
network access. A simplified demonstration could drift from Compliance Core and
weaken the central rule that deterministic validation owns compliance truth.

## Decision

Provide an offline composition layer for proof and tests, while keeping canonical
domain ownership unchanged:

- the local bridge invokes Compliance Core's real extraction and rule engine;
- Agent, persistence/audit, cache, SSE, cost/latency, and Web fixture contracts run
  through deterministic local adapters;
- normalized evidence excludes runtime-only data, redacts secret-shaped content,
  and is verified with SHA-256 checksums and a tracked golden fixture;
- production HTTP services and wire fields remain compatible; the adapters are not a
  second production runtime or second compliance engine.

## Consequences

- `pnpm evidence` is the canonical credential-free portfolio proof.
- PostgreSQL, Redis, Docker, SAM.gov, Langfuse, and real providers remain optional
  deployment/integration surfaces.
- Evidence demonstrates behavior contracts and reproducibility, not hosted uptime,
  live-provider quality, or production scale.
- Changes to deterministic scoring still require Compliance Core golden parity.
