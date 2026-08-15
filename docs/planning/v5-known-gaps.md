# V5 known gaps and deferred boundaries

**Last verified:** 2026-08-14

This is the current boundary document. Historical porting plans under this directory
are provenance only and may contain unchecked boxes for work delivered later.

## Delivered in the comprehensive finalization pass

- The block parser handles the eight previously documented overtime, employee,
  classification, wage, location, US/long-form date, and decimal-hour variants.
  Malformed explicit values fail closed through additive noncanonical-input metadata.
- The golden fixture contains 100 examples and retains the baseline-regression gate.
- The credential-free local composition exercises Gateway → Agent → Compliance Core
  → Data Platform semantics without replacing the canonical rule engine.
- Data Platform has ingestion-job lifecycle validation, bulk validation, deterministic
  rate snapshots, in-memory/optional-Redis caching, and Parquet archive
  manifests/checksums with DuckDB contracts.
- SSE supports deterministic event IDs, heartbeats, local replay, per-client Redis
  resume cursors, and in-memory fallback.
- The portfolio evidence bundle and dependency-free verifier cover extraction,
  validation, trust, persistence, audit, cache, SSE, cost/latency, and Web fixtures.
- Playwright covers desktop and mobile fixture-mode flows.

## Current limits

- No load test, throughput benchmark, or production SLO is claimed.
- The Gateway rate limiter is process-local and is not shared across replicas.
- The canonical portfolio demo does not prove a live provider, SAM.gov, PostgreSQL,
  Redis, Langfuse, or hosted deployment.
- Live PDF upload through every deployed service and real Redis/PostgreSQL replay are
  optional integration paths; the default proof uses fixed offline inputs.
- The Web browser gate uses deterministic fixture mode rather than a deployed backend.
- No demo video/GIF or binary WH-347 fixture is tracked; the text fixture and evidence
  report are the reproducible review surfaces.

## Deliberately deferred

| Direction | Boundary |
|---|---|
| Celery | No background job queue; current internal pipeline remains bounded HTTP/local composition |
| Elasticsearch | In-process BM25 and optional pgvector remain the search boundary |
| Great Expectations | Native deterministic validators remain authoritative |
| Full Prefect | Lightweight compatibility helpers remain; no mandatory orchestrator |
| Hosted notifications | No Slack, Discord, email, or webhook delivery service |
| Hosted/team workflows | No tenancy, workspace, hosted scheduling, or collaboration product layer |
| Mandatory infrastructure | PostgreSQL, Redis, Docker, SAM.gov, Langfuse, and real LLM providers stay optional for portfolio proof |

These deferrals are product/infrastructure choices, not incomplete claims hidden by
the offline demo. Revisit them only with a concrete deployment requirement and new
behavior contracts.
