# ADR 0003: Data Platform Owns Storage, Ingestion, Analytics, and Audit Events

**Status:** Accepted

**Date:** 2026-05-05

## Decision

V4 data-platform capabilities move out of the Python backend and into a dedicated Data Platform service. The Data Platform owns PostgreSQL schema, migrations, contracts, payrolls, decisions, audit events, DBWD rate snapshots, ingestion jobs, and analytics reads.

## Context

In V3/V4, the Python backend handled compliance validation, extraction, retrieval, persistence, async jobs, analytics, ingestion, storage, and data quality. This created a service that was simultaneously:

- The deterministic compliance engine (extraction, validation, rule checks).
- The data persistence layer (decisions, contracts, payrolls, audit events).
- The analytics engine (DuckDB queries, PostgreSQL aggregates).
- The ingestion pipeline (CSV processing, bulk import).
- The ETL orchestrator (Prefect flows, Parquet export).

These concerns have different ownership domains, different scaling patterns, and different reasons to change.

## Rationale

Contracts, payrolls, ingestion, analytics, archival storage, and audit events form a coherent data ownership domain. Separating this from compliance validation means:

1. The Compliance Core focuses purely on deterministic correctness — extraction, normalization, rule checks, citations, reports.
2. The Data Platform focuses on data lifecycle — storage, retrieval, migration, archival, analytics.
3. Database schema changes don't require redeploying the compliance engine.
4. Analytics queries don't compete with validation for database connections.

## Consequences

- Cleaner compliance core — no database schema, no migrations, no analytics SQL.
- More explicit data API — all data access goes through `/internal/` routes.
- Easier future expansion for enterprise connectors and additional data sources.
- The Data Platform uses Python (FastAPI + SQLAlchemy + Alembic) because DuckDB, PyArrow, Prefect, and data quality tooling are all Python-native.

## Deferred to Post-MVP

The following V4 capabilities are scaffolded but not implemented in the V5 MVP:

- DuckDB analytics (deferred)
- Prefect ETL flows (deferred)
- Parquet archival (deferred)
- Great Expectations validation (deferred)
- Redis Streams decision-event publishing (implemented for decision persistence; broader event families deferred)
- Enterprise connectors beyond SAM.gov stubs (deferred)

These will be implemented in Phase 4 (V4 Data Platform Feature Migration).
