# V5 Request Flow — WH-347 Analysis

## Full Sequence: 16 Steps

```
User (Browser)
  │
  │  POST /api/v1/analyze { text }
  ▼
┌──────────────────────────────────────────────────────────┐
│ Gateway (3000)                                            │
│ 1. authenticate (JWT verify / AUTH_DISABLED check)        │
│ 2. attach x-request-id = UUID()                           │
│ 3. rate limit check                                       │
│ 4. forward to Agent                                       │
└──────────────────┬───────────────────────────────────────┘
                   │ POST /internal/workflows/wcp-pipeline  │
                   ▼                                         │
┌──────────────────────────────────────────────────────────┐
│ Agent (3001)                                              │
│ 5. extract: POST → Compliance Core /internal/extract      │
│ 6. validate: POST → Compliance Core /internal/validate    │
│ 7. search: POST → Compliance Core /internal/search (RAG)  │
│ 8. verdict: LLM generation with prompt + RAG context      │
│ 9. trust score: 4-component weighted computation          │
│ 10. persist: POST → Data Platform /internal/decisions     │
└──────┬──────────────────────────────┬────────────────────┘
       │                              │
       ▼                              ▼
┌──────────────────┐    ┌──────────────────────────────────┐
│ Compliance Core  │    │ Data Platform (8001)              │
│ (8000)           │    │ 11. persist decision (INSERT)      │
│ 5. extract text  │    │ 12. append audit event (INSERT)    │
│ 6. run rule      │    │ 13. if human_review: flag event    │
│    engine        │    │ 14. publish to Redis Streams       │
│ 7. search RAG    │    │ 15. return DecisionResponse        │
└──────────────────┘    └──────────────────────────────────┘
                               │
                   ┌───────────┘
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Agent → Gateway → User                                    │
│ 16. Return TrustScoredDecision with verdict, trust score,  │
│     citations, cost, latency, step timings                 │
└──────────────────────────────────────────────────────────┘
```

## Cross-Service Headers

Every internal request carries:
- `x-request-id`: UUID generated at Gateway, propagated unchanged
- `x-trace-id`: OpenTelemetry trace context (or falls back to request-id)

## PDF Upload Flow

```
User → POST /api/v1/analyze/pdf (multipart)
  │
  ▼
Gateway → POST /internal/extract (multipart) → Compliance Core
  │          returns ExtractedWCP
  ▼
Gateway → POST /internal/workflows/wcp-pipeline-from-extracted → Agent
  │          skips extraction step, proceeds with validate → verdict → trust → persist
  ▼
TrustScoredDecision returned to User
```

## SSE Streaming Flow

```
Gateway: GET /api/v1/decisions/stream
  │
  ├─ heartbeat: every 15s {"timestamp":"..."}
  │
  └─ Redis: XREAD wcp.decisions (poll every 3s)
       │
       └─ event: decision { decision_id, job_id, verdict, trust_score, ... }
```

## Error Boundaries

- **Gateway → Agent failure**: 502 with structured error
- **Agent → Compliance Core failure**: pipeline continues with partial results, LLM handles gracefully
- **Agent → Data Platform failure**: pipeline completes but decision is not persisted (logged warning)
- **Redis unavailable**: SSE falls back to heartbeat-only mode
- **PostgreSQL unavailable**: Data Platform returns 503
- **LLM API failure**: falls back through provider chain (openai → anthropic → ollama), mock mode always works
