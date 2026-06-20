# V5 Request Flow: WH-347 Analysis

## Full Sequence: 16 Steps

```text
User browser
  |
  | POST /api/v1/analyze { text, job_id? }
  v
Gateway (3000)
  1. authenticate request
  2. attach x-request-id and x-trace-id
  3. rate-limit and validate request body
  4. POST /internal/workflows/wcp-pipeline -> Agent
  |
  v
Agent (3001, Mastra)
  5. extract step: POST /internal/extract -> Compliance Core
  6. validate step: POST /internal/validate -> Compliance Core
  7. optional RAG/search/tool context lookup
  8. verdict step: LLM generation or deterministic mock fallback
  9. trust step: score, safe verdict, grounded citations
 10. persist step: POST /internal/decisions -> Data Platform
  |
  v
Data Platform (8001)
 11. insert DecisionRecord
 12. append decision_created AuditEvent
 13. append human_review_flagged AuditEvent when needed
 14. publish decision event to Redis Streams
 15. return DecisionResponse { id, job_id, verdict, ... }
  |
  v
Agent -> Gateway -> User
 16. return TrustScoredDecision with verdict, trust score, citations, cost, latency, and step timings
```

## Cross-Service Headers

Every internal request carries:

- `x-request-id`: UUID generated at Gateway and propagated unchanged
- `x-trace-id`: trace correlation ID, falling back to request ID when absent

Data Platform accepts `x-trace-id` on decision creation and uses it for audit/event records.

## PDF Upload Flow

```text
User -> POST /api/v1/analyze/pdf (multipart)
  |
  v
Gateway -> POST /internal/extract (multipart) -> Compliance Core
  |
  v
Gateway -> POST /internal/workflows/wcp-pipeline-from-extracted -> Agent
  |
  v
Agent validates, synthesizes verdict, scores trust, persists through Data Platform
  |
  v
TrustScoredDecision returned to User
```

## SSE Streaming Flow

```text
Gateway: GET /api/v1/decisions/stream
  |
  |- initial heartbeat comment
  |
  `- Redis Streams consumer group: wcp.decisions
       |
       `- event: decision.created { decision_id, job_id, verdict, trust_score, ... }
```

If Redis is unavailable, the SSE endpoint still opens and emits the initial heartbeat, while Redis consumer setup/read errors are logged.

## Error Boundaries

- **Gateway -> Agent failure**: Gateway returns 502 for `ServiceClientError` or 500 for unexpected route errors.
- **Agent -> Compliance Core extraction/validation failure**: the Mastra pipeline fails because extraction and deterministic validation are required inputs.
- **Agent verdict LLM failure in real mode**: the verdict step degrades to deterministic fallback.
- **Agent -> Data Platform persistence failure**: the Mastra pipeline fails because official persistence did not complete.
- **Redis unavailable**: Data Platform persistence still succeeds; decision event publish is best-effort. Gateway SSE logs Redis errors and keeps the stream open when possible.
- **PostgreSQL unavailable**: Data Platform persistence/query endpoints fail through the database session path.
- **Mock mode**: `LLM_MODE=mock` skips LLM calls but still runs the Mastra workflow and internal service calls.
