# V5 Service Boundaries

## Overview

V5 has five core services. Each owns a distinct domain, failure mode, test strategy, and reason to change.

## Service Map

| Service | Language | Framework | Port | Responsibility |
|---|---|---|---:|---|
| Web App | TypeScript | React 19 + Vite | 5173 | Product UI, upload flow, decisions, review, analytics |
| Gateway | TypeScript | Hono + Zod | 3000 | Auth, CORS, rate limits, validation, uploads, routing, SSE |
| Agent | TypeScript | Mastra + AI SDK v6 | 3001 | Workflows, tools, RAG, memory, verdict synthesis, trust scoring |
| Compliance Core | Python | FastAPI + Pydantic v2 | 8000 | Deterministic extraction, validation, checks, reports |
| Data Platform | Python | FastAPI + SQLAlchemy | 8001 | Persistence, contracts, payrolls, decisions, audits, analytics |

## Architecture Diagram

```text
Web
 |
 v
Gateway
 |------------------------------.
 |                              |
 v                              v
Agent                         Data Platform
 |  \                           ^
 |   \ persist TrustScoredDecision
 v    \                         |
Compliance Core ----------------'
```

Gateway is the only client-facing API. Agent never connects to the database directly; it calls Data Platform internal HTTP APIs. Compliance Core never persists data.

## Request Flow: Single WH-347 Analysis

1. User uploads or submits WH-347 text in Web App.
2. Web App sends the request to Gateway.
3. Gateway authenticates the user, validates the request, and attaches `x-request-id` / `x-trace-id`.
4. Gateway starts the Mastra pipeline through `POST /internal/workflows/wcp-pipeline`.
5. Agent calls Compliance Core `/internal/extract`.
6. Compliance Core extracts and normalizes certified payroll data.
7. Agent calls Compliance Core `/internal/validate`.
8. Compliance Core runs wage, overtime, fringe, signature, classification, data-integrity, and citation checks.
9. Agent may call Compliance Core search/DBWD lookup tools for regulatory context.
10. Agent synthesizes a verdict from deterministic results and source context.
11. Agent computes the deterministic trust score and safe verdict override.
12. Agent submits the `TrustScoredDecision` to Data Platform `/internal/decisions`.
13. Data Platform creates the official `DecisionRecord`.
14. Data Platform appends audit events and publishes the decision event to Redis Streams.
15. Agent returns the final `TrustScoredDecision` to Gateway.
16. Gateway returns the response to Web App and the Web App displays score, citations, issues, audit context, and next actions.

## Critical Boundary Rules

### Agent Does Not Write The Database Directly

Agent owns orchestration and decision synthesis. It submits a `TrustScoredDecision` to Data Platform, but only Data Platform creates official database rows.

### Gateway Does Not Reason

Gateway is security and routing infrastructure. It does not call LLM APIs, own prompt templates, or perform compliance validation.

### Compliance Core Does Not Persist

Compliance Core produces extraction results and deterministic reports. It does not write to the database, store contracts, or manage audit events.

### No Service Bypasses Another

- Web App does not call internal services directly; it calls Gateway.
- Gateway does not call the database directly; it calls Data Platform.
- Agent does not call the database directly; it calls Data Platform.
- Compliance Core does not persist anything; it returns structured data.

## Data Ownership Matrix

| Entity | Owner | Readers |
|---|---|---|
| User/session context | Gateway | All services through claims/headers |
| Uploaded artifact metadata | Data Platform | Gateway, Agent, Compliance Core |
| Raw uploaded files | Object storage via Data Platform | Compliance Core |
| Extracted WCP | Compliance Core output, optionally persisted by Data Platform | Agent, Data Platform |
| Deterministic report | Compliance Core output, optionally persisted by Data Platform | Agent, Web |
| Trust-scored decision payload | Agent | Data Platform, Gateway, Web |
| Official decision record | Data Platform | Web, Gateway, Agent |
| Audit events | Data Platform | Web, Gateway, Agent |
| Contracts | Data Platform | Web, Gateway, Agent, Compliance Core |
| Payroll records | Data Platform | Web, Gateway, Agent, Compliance Core |
| DBWD rates | Data Platform storage, Compliance Core matching | Agent, Compliance Core |
| Prompt versions | Agent | Agent, observability tools |
| LLM traces | Agent observability | Agent, Web by trace ID |

## Inter-Service Communication

All internal service communication is HTTP REST with JSON payloads. Internal routes are prefixed with `/internal/`.

Every cross-service request includes:

- `x-request-id`: unique per request chain
- `x-trace-id`: distributed tracing correlation

Hosted multi-tenant/workspace context is deliberately deferred; no tenant header is
part of the current portfolio contract.

## Port Allocation

| Service | Port | Notes |
|---|---:|---|
| Web App | 5173 | Vite dev server |
| Gateway | 3000 | Client-facing API |
| Agent | 3001 | Internal workflow service |
| Compliance Core | 8000 | Internal extraction/validation |
| Data Platform | 8001 | Internal data API |
| PostgreSQL | 5432 | Shared database |
| Redis | 6379 | Optional cache and SSE/event stream backing; local fallback exists |

## Offline proof composition

`scripts/portfolio_demo.ts` composes the same contracts without starting network
services. Its Compliance Core bridge invokes the canonical Python extraction/rule
engine; it does not maintain a second compliance implementation. The resulting
evidence proves deterministic contract behavior, not hosted availability.
