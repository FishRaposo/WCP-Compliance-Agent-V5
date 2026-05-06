# V5 Service Boundaries

## Overview

V5 has five core services, each with a distinct ownership domain, failure mode, test strategy, and reason to change.

## Service Map

| Service | Language | Framework | Port | Responsibility |
|---|---|---|---|---|
| Web App | TypeScript | React 19 + Vite | 5173 | Product UI, upload flow, decisions, review, analytics |
| Gateway | TypeScript | Hono + Zod | 3000 | Auth, CORS, rate limits, validation, uploads, routing |
| Agent | TypeScript | Mastra + Vercel AI SDK | 3001 | LLM workflows, tool calls, verdict synthesis |
| Compliance Core | Python | FastAPI + Pydantic v2 | 8000 | Deterministic extraction, validation, checks, reports |
| Data Platform | Python | FastAPI + SQLAlchemy | 8001 | Persistence, contracts, payrolls, decisions, audits |

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│ Web App                                                    │
│ React + Vite + Tailwind + TanStack Query                   │
│ Product UI, upload flow, decision review, analytics views  │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼─────────────────────────────┐
│ Gateway Service                                             │
│ Hono + Zod                                                  │
│ Auth, authorization, validation, rate limits, uploads, API  │
│ versioning, tenant context, client-facing routes            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ workflow requests             │ reads/results/events
               │                              │
┌──────────────▼────────────────┐   ┌─────────▼──────────────────┐
│ Agent Orchestration Service    │   │ Data Platform Service       │
│ Mastra + Vercel AI SDK         │   │ FastAPI + SQLAlchemy         │
│ Tool planning, LLM synthesis,  │   │ contracts, payrolls,        │
│ prompt/version tracing         │   │ decisions, audits, DBWD      │
└──────────────┬────────────────┘   └─────────▲──────────────────┘
               │                              │
               │ deterministic tool calls      │ persistence and lookup APIs
               │                              │
┌──────────────▼──────────────────────────────┴──────────────────┐
│ Compliance Core Service                                         │
│ Python + FastAPI + Pydantic v2                                  │
│ PDF/text extraction, normalization, rule engine, citations,      │
│ trust inputs, deterministic reports, golden-set evaluation       │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow: Single WH-347 Analysis

```
1. User uploads WH-347 artifact in Web App.
2. Web App sends request to Gateway.
3. Gateway authenticates user, validates file, attaches request_id and tenant_id.
4. Gateway stores or forwards artifact metadata to Data Platform.
5. Gateway starts analysis workflow through Agent Orchestration.
6. Agent requests extraction from Compliance Core.
7. Compliance Core extracts and normalizes certified payroll data.
8. Agent requests deterministic validation from Compliance Core.
9. Compliance Core runs wage, overtime, fringe, signature, classification, and citation checks.
10. Agent requests DBWD rate context from Data Platform or Compliance Core.
11. Agent synthesizes human-readable verdict from deterministic report and source context.
12. Agent returns DecisionDraft.
13. Gateway sends DecisionDraft to Data Platform for persistence.
14. Data Platform creates DecisionRecord and AuditEvents.
15. Gateway streams or returns final response to Web App.
16. Web App displays trust score, citations, issues, audit trail, and next actions.
```

## Critical Boundary Rules

### The Agent Does Not Persist

The Agent can produce a DecisionDraft. The Data Platform creates the official DecisionRecord. This is the auditability boundary.

### The Gateway Does Not Reason

The Gateway is security and routing infrastructure. It does not call LLM APIs, own prompt templates, or perform compliance validation.

### The Compliance Core Does Not Persist

The Compliance Core produces extraction results and deterministic reports. It does not write to the database, store contracts, or manage audit events.

### No Service Bypasses Another

- The Web App does not call internal services directly — only the Gateway.
- The Gateway does not call the database directly — only the Data Platform.
- The Agent does not call the database directly — only the Data Platform.
- The Compliance Core does not persist anything — it returns structured data.

## Data Ownership Matrix

| Entity | Owner | Readers |
|---|---|---|
| User/session context | Gateway | All services through claims |
| Uploaded artifact metadata | Data Platform | Gateway, Agent, Compliance Core |
| Raw uploaded files | Object storage via Data Platform | Compliance Core |
| Extracted WCP | Compliance Core output, persisted by Data Platform | Agent, Data Platform |
| Deterministic report | Compliance Core output, persisted by Data Platform | Agent, Web |
| Decision draft | Agent | Gateway, Data Platform |
| Official decision record | Data Platform | Web, Gateway, Agent |
| Audit events | Data Platform | Web, Gateway, Agent |
| Contracts | Data Platform | Web, Gateway, Agent, Compliance Core |
| Payroll records | Data Platform | Web, Gateway, Agent, Compliance Core |
| DBWD rates | Data Platform (storage), Compliance Core (matching) | Agent, Compliance Core |
| Prompt versions | Agent | Agent, observability tools |
| LLM traces | Agent observability | Agent, Web by trace ID |

## Inter-Service Communication

All internal service communication is over HTTP REST with JSON payloads. Internal routes are prefixed with `/internal/`.

Every cross-service request includes:
- `x-request-id` — unique per request chain
- `x-trace-id` — distributed tracing correlation
- `x-tenant-id` — multi-tenant context (future)

## Port Allocation

| Service | Port | Notes |
|---|---|---|
| Web App | 5173 | Vite dev server |
| Gateway | 3000 | Client-facing API |
| Agent | 3001 | Internal workflow service |
| Compliance Core | 8000 | Internal extraction/validation |
| Data Platform | 8001 | Internal data API |
| PostgreSQL | 5432 | Shared database |
| Redis | 6379 | Cache and future events |
