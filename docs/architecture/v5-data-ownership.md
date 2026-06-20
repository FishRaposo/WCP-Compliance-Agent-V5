# V5 Data Ownership Matrix

## Entity Ownership

| Entity | Owned By | Readers | Created By | Updated By |
|---|---|---|---|---|
| `decisions` | Data Platform | Gateway, Agent via Data Platform API | Data Platform from `TrustScoredDecision` | Data Platform |
| `audit_events` | Data Platform | Gateway, Agent via Data Platform API | Data Platform on decision creation and review events | Never, append-only |
| `contracts` | Data Platform | Gateway, Agent, Web | Data Platform | Data Platform |
| `payroll_records` | Data Platform | Gateway, Agent, Web | Data Platform import/ingestion | Data Platform |
| `ingestion_jobs` | Data Platform | Gateway, Web | Data Platform | Data Platform |
| `dbwd_rates` | Data Platform | Compliance Core, Gateway | Data Platform refresh pipeline | Data Platform upsert |
| `users` | Data Platform | Gateway auth validation | Data Platform | Data Platform |
| `regulation_chunks` | Data Platform | Compliance Core search/RAG | Data Platform seeding | Data Platform |
| `artifacts` | Data Platform | Agent, Gateway | Data Platform | Never |
| `ExtractedWCP` | Compliance Core output | Agent | Compliance Core extraction | Ephemeral |
| `DeterministicReport` | Compliance Core output | Agent | Compliance Core rule engine | Ephemeral |
| `LLMVerdict` | Agent | Agent internals | Agent LLM/mock verdict step | Ephemeral |
| `TrustScoredDecision` | Agent | Gateway, Data Platform | Agent trust step | Ephemeral, persisted as `DecisionRecord` by Data Platform |

## Reader/Writer Matrix

| Entity | Web | Gateway | Agent | Compliance Core | Data Platform |
|---|---|---|---|---|---|
| decisions | Read | Read | Read via API | None | Read/Write |
| audit_events | Read | Read | Read via API | None | Read/Write |
| contracts | Read | Read/Write via API | Read via API | None | Read/Write |
| payroll_records | Read | Read/Write via API | Read via API | None | Read/Write |
| ingestion_jobs | Read | Read/Write via API | None | None | Read/Write |
| dbwd_rates | None | Read via API | Tool/context read | Read/match | Read/Write |
| users | None | Read via API | None | None | Read/Write |
| regulation_chunks | None | None | Optional RAG context | Read/search | Read/Write |
| artifacts | None | Read/Write via API | Read via API | Read source | Read/Write |
| ExtractedWCP | None | None | Read | Create | Optional persist |
| DeterministicReport | None | None | Read | Create | Optional persist |
| LLMVerdict | None | None | Create | None | None |
| TrustScoredDecision | Read response | Read response | Create | None | Validate/read for persistence |

## Invariant Boundary Rules

1. **Agent never writes to the database directly**: it submits `TrustScoredDecision` objects to Data Platform.
2. **Data Platform creates official `DecisionRecord`s**: it is the only service that persists official decisions.
3. **Compliance Core never persists**: it returns structured extraction and validation results.
4. **Gateway never reasons**: it routes, validates, authenticates, and propagates trace headers.
5. **All cross-service requests carry `x-request-id` and `x-trace-id`.**
6. **Web never calls backend services directly**: all traffic goes through Gateway.

## Why This Separation?

The V4 monolith mixed persistence, analytics, ingestion, quality, extraction, and validation. V5 separates those concerns so each service has:

- **Distinct failure modes**: database outage, LLM outage, and extraction drift are isolated.
- **Independent testing**: unit tests can target service-local behavior without a full stack.
- **Separate scaling**: Agent scales around LLM latency, Data Platform around database connections, and Compliance Core around CPU-bound parsing/checks.
- **Clear reasons to change**: prompts change Agent; checks change Compliance Core; schema and data lifecycle change Data Platform.
