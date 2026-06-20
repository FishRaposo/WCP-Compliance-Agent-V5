# ADR 0008: Agent Layer Built on Mastra

Status: Accepted

## Context

The Agent service originally orchestrated the compliance pipeline with hand-rolled code on top of the Vercel AI SDK v4 — a custom pipeline function, a model router, a prompt registry, and bespoke Langfuse wiring. This duplicated capabilities that a dedicated agent framework provides and made the agent harder to extend, test, and observe. Several docs already named "Mastra" as the intended agent framework, but the code did not actually use it.

## Decision

Build the Agent layer on **Mastra** (`@mastra/core` 1.45). Mastra owns orchestration:

- **`Agent`** — structured output, dynamic per-request model routing, retrieval tools, contractor-scoped memory, and live scorers.
- **`createTool`** — the extract / validate / persist / search / dbwd-lookup tools.
- **`createWorkflow` / `createStep`** — the pipeline (`extract → validate → verdict → trust → persist`) plus an opt-in suspend/resume human-review workflow.
- **`@mastra/rag`** (vector store + `createVectorQueryTool`), **`@mastra/memory`**, scorers (`@mastra/core/evals`), and observability (`@mastra/langfuse` exporter + `PinoLogger`).

The model layer moves to **AI SDK v6** (required by Mastra 1.45), with `zod ^3.25`.

## Consequences

- The gateway↔agent HTTP contract is preserved byte-for-byte; the pipeline is now a Mastra workflow embedded in the existing Hono service.
- Deterministic safety is enforced in code (`safeVerdict`) regardless of the LLM, and LLM free-text/citations are grounded against the deterministic report before persistence.
- Mock mode (`LLM_MODE=mock`) still runs the full Mastra workflow with zero external services or keys.
- The hand-rolled pipeline / model router / prompt registry / Langfuse wiring are removed; new dependency surface (`@mastra/*`, AI SDK v6).
- Existing decisions are unchanged: the five-service split (ADR 0001), no DB writes from the agent (ADR 0002/0003), and deterministic-truth ownership in Compliance Core (ADR 0004) all still hold.

See `AGENTS.md` → "Agent Layer (Mastra)" for the structure and the Mastra 1.45 API conventions.
