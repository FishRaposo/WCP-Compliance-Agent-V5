# WCP Compliance Platform V5 Rebuild Design Document

## 1. Executive Summary

WCP Compliance Platform V5 is a clean rebuild of the WCP Compliance Agent architecture around explicit production boundaries.

V2 was a TypeScript monolith. It proved the idea could be built quickly, but every concern lived in the same house.

V3 introduced the first serious separation of concerns: React frontend, TypeScript agent gateway, and Python deterministic backend.

V4 expanded the platform with contract management, payroll records, ingestion, analytics, event streaming, ETL, data quality checks, and archival storage. It proved the system could grow into a broader compliance data platform, but it also exposed the core architectural smell: several services were wearing multiple hats.

V5 is the boundary rebuild.

The goal is not to rewrite because the current system is broken. The current architecture works. The point of V5 is that the product has outgrown the original service boundaries. V5 preserves the product thesis and core compliance logic while rebuilding the platform around five ownership domains:

1. Web Interface
2. Gateway and Middleware
3. Agent Orchestration
4. Deterministic Compliance Core
5. Data and Audit Platform

This moves the system from “three services by implementation convenience” to “five services by responsibility.”

The core architectural thesis:

> V5 separates security and request middleware from agentic reasoning, separates deterministic compliance validation from persistence, and gives data ingestion, audit trails, analytics, and operational records their own service boundary.

The desired result is a cleaner, leaner, more testable, more explainable platform that reads like something an actual team could own and extend.

---

## 2. Version History and Architectural Narrative

### V2: TypeScript Monolith

V2 was the speed layer. It prioritized product discovery over architecture. It made sense for early iteration because the goal was to prove whether an AI-assisted certified payroll validator could exist at all.

Characteristics:

- Single-language implementation.
- Fast iteration.
- Minimal service boundaries.
- Useful for proving workflow shape.
- Poor long-term separation between UI, orchestration, validation, and persistence.

Lesson learned:

> The idea was worth building, but the monolith could not express the domain boundaries cleanly.

### V3: First Separation of Concerns

V3 introduced the first real architectural split:

- React frontend for UI.
- TypeScript agent gateway for orchestration and LLM workflow.
- Python backend for deterministic compliance validation, extraction, retrieval, persistence, and jobs.

This was the first version where the system stopped being just an app and started becoming a platform.

Strengths:

- Python owned deterministic correctness.
- TypeScript owned agent orchestration.
- React owned the product surface.
- Evaluation, observability, and golden-set regression testing became visible first-class concerns.

Weakness:

- The Agent Gateway became both gateway and agent brain.
- The Python backend became both compliance engine and data platform.
- Database integration lived inside the backend instead of behind a clean data service boundary.

Lesson learned:

> Splitting by language and implementation layer was useful, but not enough. The next boundary needed to be responsibility-based.

### V4: Platform Expansion Patch

V4 expanded the V3 system with enterprise data-platform capabilities:

- Contract CRUD.
- Payroll records.
- Bulk CSV ingestion.
- DuckDB analytics.
- Prefect ETL.
- Redis Streams.
- Data quality validation.
- Parquet archival.
- Connector scaffolding.

V4 was intentionally additive. It extended the platform without modifying the V3 decision engine. This was useful for momentum, but it exposed the architectural pressure points.

Main pressure revealed:

- The Agent Gateway handled middleware, API routing, service orchestration, LLM reasoning, tracing, and data-platform proxy routes.
- The Python backend handled compliance validation, retrieval, DBWD lookup, persistence, async jobs, analytics, ingestion, storage, and data quality.
- The database layer was bolted onto the backend instead of being modeled as a service with explicit ownership.

Lesson learned:

> V4 proved the platform direction, but it also proved V3’s service boundaries were not the final shape.

### V5: Clean Boundary Rebuild

V5 rebuilds the platform around the architecture that emerged from actually building V3 and V4.

V5 is not “more microservices.”

V5 is:

- A middleware split.
- An agent split.
- A data service split.
- A compliance core hardening pass.
- A repo and documentation reset.

The rebuild is justified because each V5 service has a different failure mode, testing strategy, scaling pattern, and conceptual owner.

---

## 3. Problem Statement

The current architecture works, but it has a multiple-hats problem.

The current Agent Gateway is not only a gateway. It also owns:

- Authentication.
- CORS.
- Rate limiting.
- Request validation.
- File upload routing.
- Frontend API shape.
- External API integration.
- Cross-service orchestration.
- Mastra agent workflows.
- LLM reasoning.
- Prompt versioning.
- Trace generation.
- V4 route proxying.

The current Python backend is not only a compliance backend. It also owns:

- PDF and text extraction.
- Deterministic compliance validation.
- Hybrid retrieval.
- DBWD rate lookup.
- Decision persistence.
- Job queue handling.
- Contract storage.
- Payroll storage.
- Bulk ingestion.
- DuckDB analytics.
- Prefect ETL.
- Redis event publishing.
- Parquet archival.
- Data quality validation.

The result is a system where the conceptual boundaries are clearer than the service boundaries.

V5 should make the code match the architecture.

---

## 4. Goals

### Primary Goals

1. Split the current Agent Gateway into a true Gateway service and a separate Agent Orchestration service.
2. Split persistence, ingestion, analytics, audit trails, and operational data into a dedicated Data Platform service.
3. Keep deterministic compliance validation in a hardened Python Compliance Core.
4. Preserve the useful V3/V4 product behavior while making service ownership explicit.
5. Make the system easier to test, reason about, document, and demo.
6. Create a stronger portfolio narrative around architectural evolution.
7. Produce an architecture that can support future enterprise-style features without stuffing everything into “backend.”

### Secondary Goals

1. Improve local development ergonomics.
2. Define shared contracts and schema generation early.
3. Reduce accidental coupling between services.
4. Make traces and audit IDs first-class across all services.
5. Create a cleaner README that explains the version progression and boundary rationale.
6. Support mock mode per service so demos do not require full infrastructure.

---

## 5. Non-Goals

V5 should not try to solve every possible platform problem.

Non-goals:

- Do not turn the project into Kubernetes theater.
- Do not add a service for every module.
- Do not rewrite the compliance rules just for novelty.
- Do not make the agent the source of compliance truth.
- Do not let the frontend directly understand internal workflow choreography.
- Do not let the agent write directly to the database.
- Do not make the data service responsible for legal reasoning.
- Do not add enterprise connector complexity before the core vertical slice works.
- Do not optimize for cloud scale before local correctness, contracts, and tests are solid.

V5 should be cleaner, not heavier.

---

## 6. Architectural Principles

### 6.1 Boundaries Follow Responsibility

Services are split by ownership domain, not by trend.

A service should exist when it has:

- A distinct failure mode.
- A distinct test strategy.
- A distinct scaling pattern.
- A distinct reason to change.
- A distinct conceptual owner.

### 6.2 Deterministic Logic Owns Compliance Truth

The Compliance Core owns extraction, normalization, validation, rule checks, citations, and deterministic reports.

The LLM may explain, synthesize, classify edge cases, and produce human-readable verdicts, but it must not become the source of legal or mathematical truth.

### 6.3 The Agent Orchestrates, It Does Not Possess the Platform

The Agent Orchestration service calls tools and synthesizes workflow outputs.

It should not own:

- Auth.
- CORS.
- Upload normalization.
- Database writes.
- Audit storage.
- Contract storage.
- Payroll storage.
- Data quality pipelines.

The agent is a reasoning layer with tools, not a magical backend overlord.

### 6.4 The Gateway Is Boring on Purpose

The Gateway should be security and routing infrastructure.

It owns:

- Authentication.
- Authorization.
- Request validation.
- CORS.
- Rate limiting.
- Upload handling.
- Tenant context.
- API versioning.
- Client-facing route shape.
- SSE or WebSocket fanout.

It does not own compliance reasoning.

### 6.5 The Data Platform Owns Records

The Data Platform is the memory and records office.

It owns:

- Contracts.
- Payroll records.
- Decisions.
- Audit events.
- DBWD rate snapshots.
- Ingestion jobs.
- Data quality results.
- Parquet archives.
- Analytics reads.
- Event publishing.

No service should casually mutate persistent state without going through the Data Platform boundary.

### 6.6 Every Decision Must Be Traceable

Every final compliance decision should have:

- Input artifact reference.
- Extraction result.
- Deterministic validation report.
- Rate source or lookup version.
- Agent synthesis output, if used.
- Trust score.
- Regulation citations.
- Trace IDs.
- Audit events.
- Persisted decision record.

### 6.7 Mockability Is a Product Feature

Each service should support local/mock modes so the platform can be demoed without full infrastructure.

Suggested mock modes:

- Frontend mock API.
- Gateway mock auth.
- Agent mock LLM.
- Compliance Core fixture validator.
- Data Platform SQLite or in-memory test adapter.

---

## 7. V5 Service Architecture

### 7.1 Service Overview

V5 has five core services:

1. Web App
2. Gateway Service
3. Agent Orchestration Service
4. Compliance Core Service
5. Data Platform Service

Supporting infrastructure:

- PostgreSQL with pgvector.
- Redis.
- Elasticsearch or OpenSearch for BM25 retrieval if retained.
- DuckDB for analytics.
- Prefect for ETL flows if retained in V5 MVP.
- Object storage or local artifact storage.
- Langfuse.
- Phoenix or OpenTelemetry collector.

### 7.2 High-Level Diagram

```text
┌────────────────────────────────────────────────────────────┐
│ Web App                                                    │
│ React + Vite + Tailwind + TanStack Query                   │
│ Product UI, upload flow, decision review, analytics views  │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼─────────────────────────────┐
│ Gateway Service                                             │
│ Hono or Fastify                                             │
│ Auth, authorization, validation, rate limits, uploads, API  │
│ versioning, tenant context, client-facing routes            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ workflow requests             │ reads/results/events
               │                              │
┌──────────────▼────────────────┐   ┌─────────▼──────────────────┐
│ Agent Orchestration Service    │   │ Data Platform Service       │
│ Mastra + model router          │   │ FastAPI or Node service      │
│ Tool planning, LLM synthesis,  │   │ contracts, payrolls,        │
│ prompt/version tracing         │   │ decisions, audits, ETL,      │
│                                │   │ analytics, DBWD snapshots    │
└──────────────┬────────────────┘   └─────────▲──────────────────┘
               │                              │
               │ deterministic tool calls      │ persistence and lookup APIs
               │                              │
┌──────────────▼──────────────────────────────┴──────────────────┐
│ Compliance Core Service                                         │
│ Python + FastAPI + Pydantic                                     │
│ PDF/text extraction, normalization, rule engine, citations,      │
│ trust inputs, deterministic reports, golden-set evaluation       │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Request Flow: Single WH-347 Analysis

```text
1. User uploads WH-347 artifact in Web App.
2. Web App sends request to Gateway.
3. Gateway authenticates user, validates file, attaches request_id and tenant_id.
4. Gateway stores or forwards artifact metadata to Data Platform.
5. Gateway starts analysis workflow through Agent Orchestration.
6. Agent requests extraction from Compliance Core.
7. Compliance Core extracts and normalizes certified payroll data.
8. Agent requests deterministic validation from Compliance Core.
9. Compliance Core runs wage, overtime, fringe, signature, classification, and citation checks.
10. Agent requests DBWD rate context from Data Platform or Compliance Core, depending on final ownership decision.
11. Agent synthesizes human-readable verdict from deterministic report and source context.
12. Agent returns DecisionDraft.
13. Gateway sends DecisionDraft to Data Platform for persistence.
14. Data Platform creates DecisionRecord and AuditEvents.
15. Gateway streams or returns final response to Web App.
16. Web App displays trust score, citations, issues, audit trail, and next actions.
```

### 7.4 Key Boundary Rule

The Agent can produce a decision draft.

The Data Platform creates the official decision record.

This is the critical auditability boundary.

---

## 8. Service Responsibilities

## 8.1 Web App

### Purpose

The Web App is the product surface. It presents the platform to the user without owning internal workflow logic.

### Owns

- Dashboard.
- Upload flow.
- Decision results.
- Human review queue.
- Contract pages.
- Payroll pages.
- Ingestion pages.
- Analytics pages.
- Settings and model/provider selection if exposed.
- Mock mode for standalone frontend demos.

### Does Not Own

- Auth policy.
- Compliance validation.
- LLM workflows.
- Persistence semantics.
- Data ingestion execution.
- Audit record creation.

### Suggested Tech

- React 19.
- Vite.
- TypeScript.
- Tailwind.
- Shadcn/ui.
- TanStack Query.
- Zod-generated API types.

### Candidate Routes

```text
/                         Dashboard
/analyze                  Single document analysis
/decisions                Decision history
/decisions/:id            Decision detail
/review                   Human review queue
/contracts                Contract list
/contracts/:id            Contract detail
/payrolls                 Payroll records
/ingestion                Bulk ingestion jobs
/analytics                Compliance analytics overview
/settings                 Environment, models, prompt versions
```

---

## 8.2 Gateway Service

### Purpose

The Gateway is the client-facing API and middleware boundary.

It should be deliberately boring. It is the airlock between the user interface and the internal platform.

### Owns

- Auth and session handling.
- Authorization checks.
- Tenant and organization context.
- CORS.
- Rate limiting.
- Request validation.
- Response shaping.
- API versioning.
- File upload normalization.
- Multipart handling.
- Request IDs and correlation IDs.
- Client-facing REST routes.
- SSE or WebSocket connection management.
- Routing to Agent, Compliance Core, or Data Platform.

### Does Not Own

- Mastra agents.
- Prompt templates.
- LLM reasoning.
- Compliance validation.
- Database schema.
- Analytics SQL.
- ETL jobs.
- Audit record internals.

### Suggested Tech

- Hono or Fastify.
- TypeScript.
- Zod.
- OpenAPI generation.
- Redis-backed rate limiting.
- JWT or session auth.
- OpenTelemetry instrumentation.

### Candidate Routes

```text
GET  /health
GET  /api/v1/me
POST /api/v1/analyze
POST /api/v1/analyze/pdf
GET  /api/v1/decisions
GET  /api/v1/decisions/:id
GET  /api/v1/events/stream
GET  /api/v1/contracts
POST /api/v1/contracts
GET  /api/v1/contracts/:id
POST /api/v1/contracts/bulk
GET  /api/v1/payrolls
POST /api/v1/payrolls/bulk
POST /api/v1/ingestion/jobs
GET  /api/v1/ingestion/jobs/:id
GET  /api/v1/analytics/overview
```

### Internal Routing Pattern

```text
Client route: POST /api/v1/analyze/pdf
Gateway responsibilities:
- Validate auth.
- Validate file type and size.
- Assign request_id.
- Attach tenant_id.
- Normalize upload.
- Forward workflow request to Agent service.
- Stream status events back to client.
```

---

## 8.3 Agent Orchestration Service

### Purpose

The Agent Orchestration service owns the LLM workflow layer.

It plans, calls tools, synthesizes verdicts, and records prompt/model traces. It is the reasoning and orchestration brain, but not the platform’s source of persistence or deterministic truth.

### Owns

- Mastra agents.
- Workflows.
- Tool registry.
- Model routing.
- Provider fallback.
- Prompt registry.
- LLM verdict synthesis.
- Explanation generation.
- Confidence self-assessment.
- Langfuse logging.
- Agent-level traces.
- Mock LLM mode.

### Does Not Own

- Auth middleware.
- CORS.
- Rate limits.
- Database writes.
- Contract storage.
- Payroll storage.
- Audit event persistence.
- Deterministic compliance rules.
- Data ingestion internals.

### Suggested Tech

- TypeScript.
- Mastra.
- Vercel AI SDK.
- Langfuse.
- Phoenix or OpenTelemetry tracing.
- Zod for structured outputs.

### Internal Routes

```text
POST /internal/workflows/analyze-wcp
POST /internal/workflows/analyze-batch
GET  /internal/workflows/:workflow_id/status
POST /internal/verdict/synthesize
GET  /internal/health
```

### Tools Exposed to Agent

The agent should call tools that map to service APIs:

```text
compliance.extract_artifact
compliance.validate_wcp
compliance.explain_check
compliance.run_golden_case

data.get_contract
 data.get_payroll_records
 data.get_dbwd_rate
 data.create_decision_record
 data.create_audit_event
 data.get_decision_history
 data.get_ingestion_status
```

The agent should not call SQL, Redis, DuckDB, or object storage directly.

### Decision Draft Shape

```json
{
  "request_id": "req_123",
  "artifact_id": "art_123",
  "deterministic_report_id": "report_123",
  "verdict": "needs_review",
  "summary": "Potential underpayment detected for electrician classification.",
  "issues": [
    {
      "check_id": "wage_rate_minimum",
      "severity": "high",
      "employee_ref": "emp_001",
      "finding": "Reported base rate is below the applicable prevailing wage.",
      "citation_refs": ["dbwd_rate_2025_boston_elec"]
    }
  ],
  "trust_score": 0.72,
  "trust_band": "flag",
  "llm_trace_id": "trace_abc",
  "model": "gpt-4.1-mini",
  "prompt_version": "wcp-verdict-v5.0.0"
}
```

---

## 8.4 Compliance Core Service

### Purpose

The Compliance Core owns deterministic compliance correctness.

It is the legal-defense engine. It extracts, normalizes, validates, cites, and produces structured reports.

### Owns

- PDF parsing.
- Text extraction.
- WH-347 normalization.
- Employee row normalization.
- Wage checks.
- Overtime checks.
- Fringe benefit checks.
- Signature checks.
- Classification checks.
- Locality and trade matching logic.
- Citation mapping.
- Deterministic report generation.
- Golden-set evaluation.
- Regression tests.
- Trust score input signals.

### Does Not Own

- Client auth.
- UI routes.
- LLM prompt orchestration.
- Official decision persistence.
- Contract CRUD.
- Payroll CRUD.
- Analytics dashboards.
- Ingestion job orchestration beyond extraction/validation tasks.

### Suggested Tech

- Python 3.12+.
- FastAPI.
- Pydantic v2.
- pdfplumber or equivalent extraction library.
- Ruff.
- Mypy.
- Pytest.
- OpenTelemetry.

### Internal Routes

```text
GET  /health
POST /internal/extract
POST /internal/validate
POST /internal/extract-and-validate
POST /internal/checks/explain
POST /internal/eval/run-case
POST /internal/eval/run-golden-set
```

### Deterministic Report Shape

```json
{
  "report_id": "report_123",
  "artifact_id": "artifact_123",
  "extraction": {
    "confidence": 0.91,
    "warnings": [],
    "employees": []
  },
  "checks": [
    {
      "check_id": "minimum_wage_rate",
      "status": "failed",
      "severity": "high",
      "employee_ref": "emp_001",
      "expected": 51.69,
      "actual": 48.50,
      "basis": "DBWD prevailing wage lookup",
      "citation_refs": ["dbwd_boston_electrician_2025"]
    }
  ],
  "summary": {
    "failed_checks": 1,
    "warning_checks": 0,
    "passed_checks": 12
  },
  "confidence_inputs": {
    "extraction_confidence": 0.91,
    "rate_match_confidence": 0.87,
    "rule_coverage": 0.95
  }
}
```

---

## 8.5 Data Platform Service

### Purpose

The Data Platform owns persistence, auditability, ingestion state, analytics, and records.

This service turns database integration from a bolted-on backend concern into a first-class platform boundary.

### Owns

- PostgreSQL schema.
- Migrations.
- Contracts.
- Payroll records.
- Decisions.
- Audit events.
- DBWD rate snapshots.
- Ingestion jobs.
- Data quality validation results.
- Parquet archive.
- Analytics reads.
- Redis event publishing.
- Object/artifact metadata.
- Repository and service layers.

### Does Not Own

- UI behavior.
- Auth UX.
- LLM reasoning.
- Prompt templates.
- Deterministic compliance rules.
- PDF parsing internals.

### Suggested Tech

Two viable options:

Option A, Python Data Platform:

- FastAPI.
- SQLAlchemy or SQLModel.
- Alembic.
- asyncpg.
- DuckDB.
- PyArrow.
- Prefect.
- Great Expectations or lighter custom validation.

Option B, TypeScript Data Platform:

- Fastify or Hono.
- Drizzle or Prisma.
- Zod.
- DuckDB bindings if needed.
- Event and ingestion workers separated.

Recommended for V5:

Use Python for the Data Platform if DuckDB, PyArrow, Prefect, pandas, and data quality tooling remain central. Keep TypeScript for Gateway and Agent.

### Internal Structure

```text
data-platform/
├── src/wcp_data/
│   ├── api/
│   │   ├── contracts.py
│   │   ├── payrolls.py
│   │   ├── decisions.py
│   │   ├── audits.py
│   │   ├── ingestion.py
│   │   ├── analytics.py
│   │   └── dbwd.py
│   ├── repositories/
│   │   ├── contract_repository.py
│   │   ├── payroll_repository.py
│   │   ├── decision_repository.py
│   │   ├── audit_repository.py
│   │   ├── ingestion_repository.py
│   │   └── dbwd_repository.py
│   ├── services/
│   │   ├── contract_service.py
│   │   ├── payroll_service.py
│   │   ├── decision_service.py
│   │   ├── audit_service.py
│   │   ├── ingestion_service.py
│   │   ├── analytics_service.py
│   │   └── dbwd_service.py
│   ├── events/
│   │   ├── publisher.py
│   │   └── schemas.py
│   ├── quality/
│   ├── storage/
│   ├── migrations/
│   └── settings.py
└── tests/
```

### Candidate Routes

```text
GET  /health

POST /internal/artifacts
GET  /internal/artifacts/:id

GET  /internal/contracts
POST /internal/contracts
GET  /internal/contracts/:id
PATCH /internal/contracts/:id
POST /internal/contracts/bulk

GET  /internal/payrolls
POST /internal/payrolls/bulk
GET  /internal/payrolls/:id

POST /internal/decisions
GET  /internal/decisions
GET  /internal/decisions/:id

POST /internal/audit-events
GET  /internal/audit-events?decision_id=...

GET  /internal/dbwd/rates
POST /internal/dbwd/refresh

POST /internal/ingestion/jobs
GET  /internal/ingestion/jobs/:id

GET  /internal/analytics/overview
GET  /internal/analytics/contracts/:id
GET  /internal/analytics/compliance-risk
```

### Critical Rule

The official persisted decision is created here, not inside the Agent.

---

## 9. Data Ownership Matrix

| Entity | Owner | Readers | Writers |
|---|---|---|---|
| User/session context | Gateway | Web, Gateway, internal services through claims | Gateway/auth provider |
| Uploaded artifact metadata | Data Platform | Gateway, Agent, Compliance Core | Gateway through Data Platform |
| Raw uploaded files | Object storage, mediated by Data Platform | Compliance Core, Gateway | Gateway/Data Platform |
| Extracted WCP | Compliance Core output, optionally persisted by Data Platform | Agent, Data Platform | Compliance Core through Data Platform |
| Deterministic report | Compliance Core output, persisted by Data Platform | Agent, Web, Data Platform | Compliance Core through Data Platform |
| Decision draft | Agent | Gateway, Data Platform | Agent |
| Official decision record | Data Platform | Web, Gateway, Agent | Data Platform |
| Audit events | Data Platform | Web, Gateway, Agent | Data Platform |
| Contracts | Data Platform | Web, Gateway, Agent, Compliance Core | Data Platform |
| Payroll records | Data Platform | Web, Gateway, Agent, Compliance Core | Data Platform |
| DBWD rates | Data Platform or Compliance Core, final choice required | Agent, Compliance Core | Data Platform ingestion |
| Analytics views | Data Platform | Web, Gateway | Data Platform |
| Prompt versions | Agent | Agent, observability tools | Agent |
| LLM traces | Agent observability stack | Agent, Web by trace ID | Agent |

---

## 10. DBWD Ownership Decision

There are two possible ownership models for DBWD rate lookup.

### Option A: Compliance Core Owns Rate Lookup Logic, Data Platform Owns Rate Storage

In this model:

- Data Platform stores DBWD rates and snapshots.
- Compliance Core queries Data Platform for candidate rates.
- Compliance Core applies deterministic matching and validation logic.

Best if:

- Rate matching is legally meaningful validation logic.
- The rules engine needs tight control over rate selection.
- You want compliance reports to explain rate matching directly.

### Option B: Data Platform Owns Full DBWD Lookup

In this model:

- Data Platform stores rates.
- Data Platform exposes `get_dbwd_rate(trade, locality, date)`.
- Compliance Core trusts the returned rate object and checks payroll against it.

Best if:

- DBWD lookup is treated mostly as data retrieval.
- You want Compliance Core to be purely check execution.
- Analytics and ingestion need heavy DBWD ownership.

### Recommendation

Use Option A.

Data Platform should own rate records, snapshots, refresh jobs, and source metadata.

Compliance Core should own rate applicability logic and should produce the explanation for why a specific rate matched a specific employee classification and locality.

This keeps legal reasoning close to the deterministic engine while keeping storage and refresh jobs in the Data Platform.

---

## 11. API Contract Strategy

### Shared Contracts Package

Create a shared contracts package that defines API schemas and generates types for each service.

```text
packages/contracts/
├── schemas/
│   ├── artifact.schema.json
│   ├── extracted-wcp.schema.json
│   ├── deterministic-report.schema.json
│   ├── decision-draft.schema.json
│   ├── decision-record.schema.json
│   ├── audit-event.schema.json
│   ├── contract.schema.json
│   ├── payroll-record.schema.json
│   └── ingestion-job.schema.json
├── generated/
│   ├── typescript/
│   └── python/
└── openapi/
```

### Contract Rules

1. External client contracts are versioned under `/api/v1`.
2. Internal service contracts are versioned under `/internal/v1` or equivalent.
3. No service consumes another service’s internal database schema directly.
4. All cross-service requests include `request_id`, `tenant_id`, and `trace_id`.
5. Breaking schema changes require a version bump or compatibility adapter.
6. Generated types should be checked in only if it improves repo ergonomics.

---

## 12. Suggested Monorepo Structure

```text
wcp-compliance-platform-v5/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   └── tests/
│   ├── gateway/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── clients/
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   └── config/
│   │   └── tests/
│   ├── agent/
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   ├── workflows/
│   │   │   ├── tools/
│   │   │   ├── prompts/
│   │   │   ├── model-router/
│   │   │   ├── observability/
│   │   │   └── config/
│   │   └── tests/
│   ├── compliance-core/
│   │   ├── src/wcp_compliance/
│   │   │   ├── extraction/
│   │   │   ├── normalization/
│   │   │   ├── rules/
│   │   │   ├── checks/
│   │   │   ├── citations/
│   │   │   ├── dbwd_matching/
│   │   │   ├── reports/
│   │   │   ├── eval/
│   │   │   └── api/
│   │   └── tests/
│   └── data-platform/
│       ├── src/wcp_data/
│       │   ├── api/
│       │   ├── repositories/
│       │   ├── services/
│       │   ├── migrations/
│       │   ├── events/
│       │   ├── analytics/
│       │   ├── ingestion/
│       │   ├── quality/
│       │   ├── storage/
│       │   └── config/
│       └── tests/
├── packages/
│   ├── contracts/
│   ├── typescript-client/
│   ├── python-client/
│   ├── observability/
│   └── test-fixtures/
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.mock.yml
│   ├── docker-compose.full.yml
│   ├── render.yaml
│   ├── vercel.json
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── adrs/
│   ├── planning/
│   ├── eval/
│   └── operations/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
└── llms.txt
```

---

## 13. Observability Design

### Trace IDs

Every request should carry:

```text
request_id
trace_id
tenant_id
artifact_id, when available
workflow_id, when available
decision_id, when available
```

### Root Trace

Root span:

```text
wcp.v5.analysis
```

Child spans:

```text
gateway.receive_upload
gateway.validate_request
gateway.forward_workflow
agent.workflow.start
agent.tool.extract
compliance.extract
agent.tool.validate
compliance.validate
agent.tool.lookup_rate
compliance.match_dbwd_rate
agent.synthesize_verdict
data.create_decision
data.create_audit_events
gateway.stream_response
```

### Metrics

Gateway:

- Request count.
- Auth failures.
- Rate limit hits.
- Upload size distribution.
- API latency.

Agent:

- Model usage.
- Token cost.
- Provider fallback rate.
- Prompt version performance.
- Tool-call failure rate.
- LLM verdict latency.

Compliance Core:

- Extraction confidence.
- Validation latency.
- Failed check distribution.
- Golden-set accuracy.
- Rule coverage.

Data Platform:

- Decision write latency.
- Audit write latency.
- Ingestion job latency.
- Analytics query latency.
- DBWD refresh freshness.
- Event publish latency.

---

## 14. Testing Strategy

### Service-Level Tests

Web App:

- Component tests.
- Mock API tests.
- Upload flow tests.
- Decision rendering tests.

Gateway:

- Auth middleware tests.
- Request validation tests.
- Route contract tests.
- Rate limit tests.
- Service client mocking tests.

Agent:

- Workflow tests with mock tools.
- Structured output tests.
- Prompt regression tests.
- Model fallback tests.
- Tool failure recovery tests.

Compliance Core:

- Extraction unit tests.
- Rule unit tests.
- DBWD matching tests.
- Deterministic report tests.
- Golden-set evaluation.
- Property-style tests for wage/overtime math.

Data Platform:

- Repository tests.
- Migration tests.
- Service tests.
- Ingestion job tests.
- Analytics query tests.
- Audit immutability tests.

### Contract Tests

Every service boundary should have contract tests.

Examples:

- Gateway to Agent.
- Agent to Compliance Core.
- Agent to Data Platform.
- Gateway to Data Platform.
- Compliance Core to Data Platform for DBWD candidate retrieval.

### End-to-End Smoke Test

Minimum V5 smoke test:

```text
1. Start all services in mock-compatible local mode.
2. Upload fixture WH-347.
3. Gateway accepts request.
4. Agent runs workflow.
5. Compliance Core returns deterministic report.
6. Data Platform persists decision and audit trail.
7. Web App displays result.
8. Trace ID connects the full request path.
```

### Golden Set

Retain the V3/V4 golden set concept.

V5 golden-set gates:

- No critical regression in deterministic check accuracy.
- No loss of required citations.
- No trust score drift above accepted threshold.
- No schema-incompatible decision output.
- No silent LLM-only approvals when deterministic checks fail.

---

## 15. Migration Strategy

V5 should be built beside V3/V4, not patched into the current system in place.

### Phase 0: Architecture Freeze

Deliverables:

- This design document.
- ADRs for service split.
- Final DBWD ownership decision.
- Final tech choices for Gateway and Data Platform.
- V5 repo skeleton.
- Shared contracts package.

Exit criteria:

- Service boundaries are documented.
- Non-goals are explicit.
- MVP vertical slice is selected.

### Phase 1: Monorepo Skeleton

Deliverables:

- `apps/web`
- `apps/gateway`
- `apps/agent`
- `apps/compliance-core`
- `apps/data-platform`
- `packages/contracts`
- `packages/test-fixtures`
- `infra/docker-compose.yml`

Exit criteria:

- All services boot.
- All services expose `/health`.
- CI runs basic lint/type/test commands.

### Phase 2: Contracts and Clients

Deliverables:

- Core JSON schemas.
- Generated TypeScript types.
- Generated Python models or Pydantic adapters.
- Internal service clients.
- Contract tests.

Exit criteria:

- Gateway can call mock Agent.
- Agent can call mock Compliance Core.
- Agent can call mock Data Platform.
- Schema mismatch fails CI.

### Phase 3: Minimum Vertical Slice

Deliverables:

- Upload WH-347 through Gateway.
- Agent workflow starts.
- Compliance Core extracts and validates fixture document.
- Data Platform persists DecisionRecord and AuditEvents.
- Web App displays result.

Exit criteria:

- One full WCP analysis works locally.
- Trace ID connects all services.
- Decision is persisted through Data Platform only.
- Agent never writes directly to database.

### Phase 4: V4 Data Platform Feature Migration

Deliverables:

- Contract CRUD.
- Payroll record storage.
- Bulk ingestion.
- Ingestion job status.
- DBWD snapshots.
- Analytics overview.
- Event streaming.

Exit criteria:

- V4 demo path is available in V5 architecture.
- Existing V4 concepts exist behind clean Data Platform APIs.

### Phase 5: Observability and Eval Hardening

Deliverables:

- Langfuse prompt tracking.
- Phoenix or OpenTelemetry traces.
- Golden-set CI.
- Cost and latency tracking.
- Prompt/version comparison.

Exit criteria:

- Decision trace shows full workflow.
- Golden set runs in CI.
- Prompt version is visible in decision metadata.

### Phase 6: README and Portfolio Packaging

Deliverables:

- Final README.
- Architecture diagrams.
- ADR index.
- V2 to V5 evolution writeup.
- Screenshots or demo GIFs.
- `llms.txt` aligned with actual implementation.

Exit criteria:

- A recruiter/founder can understand the system in under 90 seconds.
- A technical reviewer can inspect the boundaries in under 5 minutes.
- Local demo path works.

---

## 16. V5 README Draft

# WCP Compliance Platform V5

AI-assisted Davis-Bacon certified payroll compliance platform rebuilt around production-grade service boundaries.

WCP validates WH-347 certified payroll submissions using deterministic compliance checks, regulation citations, trust scores, audit trails, and an agentic reasoning layer for verdict synthesis and review support.

V5 is a clean rebuild of the previous WCP Compliance Agent architecture. The current platform works, but earlier versions revealed a multiple-hats problem: gateway logic, agent reasoning, compliance validation, persistence, ingestion, and analytics had grown beyond the original three-service boundary.

V5 keeps the product thesis and rebuilds the system around five explicit ownership domains.

```text
V2: TypeScript monolith.
V3: First separation of concerns.
V4: Data-platform expansion that exposed boundary pressure.
V5: Clean rebuild around middleware, agent orchestration, compliance core, data platform, and UI.
```

## Why V5 Exists

V5 is not a rewrite because the system failed.

V5 is a rewrite because the system worked long enough to reveal its real architecture.

Previous versions proved the core platform:

- V2 proved the product could exist.
- V3 split UI, agent orchestration, and deterministic validation.
- V4 added contract management, payroll records, ingestion, analytics, event streaming, ETL, data quality checks, and archival storage.

V4 also exposed the remaining architectural smell:

- The Agent Gateway was both middleware and agent brain.
- The Python backend was both compliance engine and data platform.
- Database integration was bolted into the backend instead of living behind a proper service layer.

V5 fixes that by splitting the platform by responsibility.

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│ Web App                                                    │
│ React + Vite + Tailwind + TanStack Query                   │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼─────────────────────────────┐
│ Gateway Service                                             │
│ Auth, CORS, rate limits, validation, uploads, routing       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼────────────────┐   ┌─────────▼──────────────────┐
│ Agent Orchestration Service    │   │ Data Platform Service       │
│ Mastra, tools, prompts, LLMs,  │   │ contracts, payrolls,        │
│ verdict synthesis, tracing     │   │ decisions, audits, analytics│
└──────────────┬────────────────┘   └─────────▲──────────────────┘
               │                              │
┌──────────────▼──────────────────────────────┴──────────────────┐
│ Compliance Core Service                                         │
│ Python deterministic extraction, validation, citations, evals    │
└─────────────────────────────────────────────────────────────────┘
```

## Service Boundaries

| Service | Responsibility | Must Not Own |
|---|---|---|
| Web App | Product UI, upload flow, decisions, review, analytics views | Compliance logic, persistence, workflow internals |
| Gateway | Auth, CORS, rate limits, request validation, upload normalization, client-facing API | LLM reasoning, compliance rules, database writes |
| Agent | Mastra workflows, model routing, tool calls, verdict synthesis, prompt tracing | Middleware, auth, database writes, deterministic truth |
| Compliance Core | Extraction, WH-347 normalization, wage/overtime/fringe/signature checks, citations, deterministic reports | UI, auth, official persistence, analytics ownership |
| Data Platform | Contracts, payrolls, decisions, audits, ingestion, DBWD snapshots, analytics, events | LLM reasoning, compliance rule execution, UI behavior |

## Core Flow

```text
1. User uploads WH-347 certified payroll artifact.
2. Gateway authenticates, validates, and normalizes the request.
3. Agent Orchestration starts the WCP analysis workflow.
4. Compliance Core extracts and validates the payroll deterministically.
5. Data Platform provides contract, payroll, DBWD, and audit context.
6. Agent synthesizes a structured verdict from deterministic evidence.
7. Data Platform persists the official decision record and audit events.
8. Web App displays trust score, citations, flagged issues, and trace metadata.
```

## Design Principle

The agent can produce a decision draft.

The Data Platform creates the official decision record.

Deterministic validation remains the source of compliance truth.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web | React, Vite, TypeScript, Tailwind, TanStack Query | Product UI |
| Gateway | TypeScript, Hono or Fastify, Zod | Middleware and client-facing API |
| Agent | TypeScript, Mastra, Vercel AI SDK, Langfuse | LLM orchestration and verdict synthesis |
| Compliance Core | Python, FastAPI, Pydantic, Pytest | Deterministic compliance validation |
| Data Platform | Python, FastAPI, PostgreSQL, DuckDB, Redis, PyArrow, Prefect | Persistence, ingestion, analytics, audit records |
| Observability | OpenTelemetry, Phoenix, Langfuse | Tracing, prompts, cost, latency |

## Repository Structure

```text
wcp-compliance-platform-v5/
├── apps/
│   ├── web/
│   ├── gateway/
│   ├── agent/
│   ├── compliance-core/
│   └── data-platform/
├── packages/
│   ├── contracts/
│   ├── typescript-client/
│   ├── python-client/
│   ├── observability/
│   └── test-fixtures/
├── infra/
├── docs/
├── AGENTS.md
├── README.md
├── CHANGELOG.md
└── llms.txt
```

## Local Development

```bash
# Clone
 git clone https://github.com/FishRaposo/wcp-compliance-platform-v5.git
 cd wcp-compliance-platform-v5

# Install dependencies
 pnpm install

# Start local infrastructure
 docker compose up -d postgres redis

# Start services
 pnpm dev
```

Mock mode should allow the platform to run without API keys or full infrastructure:

```bash
WCP_MOCK_AUTH=true \
WCP_MOCK_LLM=true \
WCP_MOCK_DATA=true \
pnpm dev
```

## Validation Commands

```bash
# TypeScript services
pnpm typecheck
pnpm lint
pnpm test

# Python services
cd apps/compliance-core && poetry run ruff check . && poetry run mypy src && poetry run pytest
cd apps/data-platform && poetry run ruff check . && poetry run mypy src && poetry run pytest

# Contract tests
pnpm test:contracts

# Golden set
pnpm test:golden
```

## Testing Philosophy

V5 uses layered testing:

- Unit tests for each service.
- Contract tests between services.
- Golden-set regression tests for compliance correctness.
- Mock-mode E2E tests for the full vertical slice.
- Observability checks to verify trace continuity.

The minimum accepted V5 demo path is:

```text
Upload WH-347
→ Gateway validates request
→ Agent starts workflow
→ Compliance Core validates deterministically
→ Data Platform persists decision and audit trail
→ Web displays result with citations and trust score
```

## Status

V5 is a planned clean rebuild based on lessons from V2, V3, and V4.

Initial milestone:

- Monorepo skeleton.
- Five service health checks.
- Shared contracts package.
- One complete WH-347 analysis vertical slice.

## Architecture Docs

See:

- `docs/architecture/v5-service-boundaries.md`
- `docs/architecture/v5-data-platform.md`
- `docs/architecture/v5-agent-orchestration.md`
- `docs/adrs/0001-v5-service-split.md`
- `docs/adrs/0002-agent-does-not-persist-decisions.md`
- `docs/adrs/0003-data-platform-owns-records.md`

## License

MIT.

---

## 17. Suggested ADRs

### ADR 0001: Split Agent Gateway Into Gateway and Agent Services

Decision:

The V5 architecture splits the current Agent Gateway into two services:

- Gateway Service for middleware and client-facing API.
- Agent Orchestration Service for LLM workflows.

Rationale:

The current Agent Gateway owns too many unrelated responsibilities. Security middleware and agent reasoning have different failure modes, tests, and reasons to change.

Consequences:

- Clearer API security boundary.
- Easier agent workflow testing.
- Slightly more service orchestration complexity.
- Better long-term maintainability.

### ADR 0002: Data Platform Owns Official Decision Records

Decision:

The Agent may produce DecisionDraft objects, but only the Data Platform creates official DecisionRecord objects.

Rationale:

Official decisions must be auditable, traceable, and governed by persistence rules. The agent should not directly mutate durable compliance records.

Consequences:

- Stronger audit boundary.
- Clearer persistence ownership.
- Agent remains tool-oriented rather than database-oriented.

### ADR 0003: Compliance Core Owns Deterministic Truth

Decision:

The Compliance Core owns extraction, normalization, rule checks, citation mapping, deterministic reports, and golden-set evaluation.

Rationale:

LLM reasoning is useful for synthesis and explanation, but compliance correctness must be deterministic, testable, and regression-gated.

Consequences:

- Easier legal defensibility.
- Better test coverage.
- LLM verdicts must cite deterministic evidence.

### ADR 0004: Data Platform Owns Storage, Ingestion, Analytics, and Audit Events

Decision:

V4 data-platform capabilities move out of the backend and into a dedicated Data Platform service.

Rationale:

Contracts, payrolls, ingestion, analytics, archival storage, and audit events form a coherent data ownership domain.

Consequences:

- Cleaner backend.
- More explicit data API.
- Easier future expansion for enterprise connectors.

---

## 18. Portfolio Positioning

The strongest public framing:

> WCP V5 is a clean rebuild of an AI compliance platform after multiple architectural iterations. V2 proved the idea as a TypeScript monolith. V3 introduced service separation. V4 expanded the system into an enterprise-style data platform. V5 rebuilds the architecture around the boundaries revealed by those earlier versions.

What this signals:

- You can ship prototypes.
- You can evolve systems.
- You can identify boundary pressure.
- You can separate deterministic correctness from LLM orchestration.
- You can design audit-friendly AI systems.
- You can avoid turning agents into magical untestable blobs.

The project should not be sold as “look, microservices.”

It should be sold as:

> AI infrastructure for compliance workflows where deterministic validation, agentic reasoning, auditability, and data-platform concerns are cleanly separated.

That is the blade.

---

## 19. Open Questions

1. Should Data Platform be Python or TypeScript?
2. Should Elasticsearch remain in V5 MVP, or should V5 begin with PostgreSQL/pgvector plus deterministic lookup first?
3. Should Prefect remain in the MVP, or move to Phase 2 after the core vertical slice?
4. Should Gateway own artifact upload storage directly, or should it only broker upload metadata with Data Platform?
5. Should decision persistence be synchronous in the main request path, or event-driven after the agent returns a draft?
6. Should the first V5 demo support only WH-347 PDF, or also CSV from day one?
7. Should Langfuse and Phoenix both remain, or should V5 standardize around OpenTelemetry plus one LLM observability layer?

Recommended default answers:

1. Data Platform should be Python if DuckDB, PyArrow, Prefect, and data validation remain important.
2. Defer Elasticsearch unless hybrid RAG is necessary for the first V5 vertical slice.
3. Defer Prefect until after the minimum vertical slice.
4. Gateway should broker upload metadata; Data Platform should own artifact records.
5. Persist official decisions synchronously for the first version, then consider event-driven persistence later.
6. Start with WH-347 PDF, then add CSV.
7. Keep Langfuse for LLM workflows and use OpenTelemetry-compatible tracing for service boundaries.

---

## 20. Minimum V5 Build Checklist

### Repo

- [ ] Create V5 monorepo.
- [ ] Add apps for web, gateway, agent, compliance-core, and data-platform.
- [ ] Add packages for contracts and fixtures.
- [ ] Add infrastructure compose file.
- [ ] Add shared lint/test commands.

### Contracts

- [ ] Artifact schema.
- [ ] Extracted WCP schema.
- [ ] Deterministic report schema.
- [ ] Decision draft schema.
- [ ] Decision record schema.
- [ ] Audit event schema.
- [ ] Contract schema.
- [ ] Payroll record schema.
- [ ] Ingestion job schema.

### Gateway

- [ ] Auth middleware.
- [ ] Request ID middleware.
- [ ] Upload route.
- [ ] Analyze route.
- [ ] Service clients.
- [ ] SSE route.
- [ ] Mock auth mode.

### Agent

- [ ] Mastra workflow skeleton.
- [ ] Compliance Core tool client.
- [ ] Data Platform tool client.
- [ ] Mock LLM mode.
- [ ] Structured verdict synthesis.
- [ ] Langfuse trace metadata.

### Compliance Core

- [ ] Extract endpoint.
- [ ] Validate endpoint.
- [ ] Extract-and-validate endpoint.
- [ ] Rule checks ported from V3.
- [ ] Golden-set runner.
- [ ] Deterministic report schema compliance.

### Data Platform

- [ ] PostgreSQL migrations.
- [ ] Artifact records.
- [ ] Decision records.
- [ ] Audit events.
- [ ] Contract records.
- [ ] Payroll records.
- [ ] DBWD snapshots.
- [ ] Basic analytics endpoint.

### Web

- [ ] Upload page.
- [ ] Decision result page.
- [ ] Decision history page.
- [ ] Human review queue.
- [ ] Mock mode.

### Quality Gates

- [ ] Unit tests per service.
- [ ] Contract tests.
- [ ] E2E vertical slice test.
- [ ] Golden-set regression test.
- [ ] CI pipeline.
- [ ] README updated.
- [ ] ADRs added.

---

## 21. Final Design Verdict

V5 should be a rebuild, not a patch.

The current architecture works, but the architectural lessons are now clearer than the original boundaries. V4 exposed the multiple-hats problem. V5 should resolve it directly.

The cleanest V5 thesis is:

> V5 rebuilds WCP around five ownership domains: interface, middleware, agent orchestration, deterministic compliance validation, and data/audit platform.

This is the mature version of the project. Not because it has more services, but because every service has a reason to exist.

