# ADR 0001: Split Agent Gateway Into Gateway and Agent Services

**Status:** Accepted

**Date:** 2026-05-05

## Decision

The V5 architecture splits the V3 Agent Gateway into two distinct services:

- **Gateway Service** — middleware, auth, CORS, rate limiting, request validation, upload handling, client-facing API routing.
- **Agent Orchestration Service** — LLM workflows, tool calls, verdict synthesis, prompt management, model routing.

## Context

The V3 Agent Gateway combined HTTP infrastructure concerns (auth, CORS, rate limiting, request validation) with AI orchestration concerns (Mastra agents, LLM workflows, prompt versioning, tool calls, Langfuse tracing). This created a service that:

1. Had two fundamentally different failure modes: security middleware failures vs. LLM API failures.
2. Required different testing strategies: auth middleware tests vs. agent workflow tests with mock LLMs.
3. Scaled differently: the gateway layer is CPU-light with high connection throughput, while agent orchestration is latency-bound by external LLM API calls.
4. Had different reasons to change: security policy changes should not affect agent workflows, and prompt versioning should not affect rate limiting.

## Rationale

The single-responsibility principle applies at the service boundary. When a service has distinct failure modes, testing strategies, scaling patterns, and reasons to change, it should be split.

The Gateway in V5 is deliberately boring. It is the airlock between the user interface and the internal platform. It owns authentication, authorization, request validation, CORS, rate limiting, upload normalization, and client-facing route shape. It does not own Mastra agents, prompt templates, or LLM reasoning.

The Agent in V5 is the reasoning layer. It owns Mastra agents, workflows, tool registry, model routing, provider fallback, prompt registry, LLM verdict synthesis, and Langfuse tracing. It does not own auth, CORS, database writes, or audit storage.

## Consequences

- Clearer API security boundary — auth middleware lives only in the gateway.
- Easier agent workflow testing — agent tests don't need to mock auth, CORS, or rate limiting.
- Slightly more service orchestration complexity — one additional internal service to manage.
- Better long-term maintainability — each service can evolve its dependency tree independently.
- The Gateway has zero AI/ML dependencies. The Agent has zero security middleware dependencies.

## Technology Choices

| Service | Runtime | Framework |
|---|---|---|
| Gateway | TypeScript / Node 20 | Hono |
| Agent | TypeScript / Node 20 | Hono (internal) + Mastra (AI SDK v6) |
