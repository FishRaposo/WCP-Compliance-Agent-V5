# V5 Data Ownership Matrix

## Entity Ownership

| Entity | Owned By | Readers | Created By | Updated By |
|---|---|---|---|---|
| `decisions` | Data Platform | Gateway, Agent (read via DP API) | Data Platform (receives TrustScoredDecision) | Data Platform |
| `audit_events` | Data Platform | Gateway, Agent (read via DP API) | Data Platform (automatically on decision creation) | Never (immutable) |
| `contracts` | Data Platform | Gateway, Agent, Web | Data Platform | Data Platform |
| `payroll_records` | Data Platform | Gateway, Agent, Web | Data Platform (bulk import / ingestion) | Data Platform |
| `ingestion_jobs` | Data Platform | Gateway, Web | Data Platform | Data Platform |
| `dbwd_rates` | Data Platform | Compliance Core (via DP API), Gateway | Data Platform (refresh pipeline) | Data Platform (upsert on refresh) |
| `users` | Data Platform | Gateway (auth validation) | Data Platform | Data Platform |
| `regulation_chunks` | Data Platform | Compliance Core (RAG search) | Data Platform (seeding) | Data Platform |
| `artifacts` | Data Platform | Agent, Gateway | Data Platform | Never |
| `ExtractedWCP` | Compliance Core | Agent | Compliance Core (extraction) | Ephemeral (not stored) |
| `DeterministicReport` | Compliance Core | Agent | Compliance Core (rule engine) | Ephemeral (not stored) |
| `LLMVerdict` | Agent | (internal) | Agent (LLM generation) | Ephemeral |
| `TrustScoredDecision` | Agent | Gateway, Data Platform | Agent (trust score + synthesis) | Ephemeral (persisted as DecisionRecord by DP) |

## Reader/Writer Matrix

```
                    ┌─────────┬─────────┬──────────┬──────────────────┬──────────────┐
                    │  Web    │ Gateway │  Agent   │ Compliance Core  │ Data Platform │
┌───────────────────┼─────────┼─────────┼──────────┼──────────────────┼──────────────┤
│ decisions         │  Read   │  Read   │  None    │  None            │  Read/Write  │
│ audit_events      │  None   │  Read   │  None    │  None            │  Read/Write  │
│ contracts         │  Read   │  R/W    │  None    │  None            │  Read/Write  │
│ payroll_records   │  Read   │  R/W    │  None    │  None            │  Read/Write  │
│ ingestion_jobs    │  Read   │  R/W    │  None    │  None            │  Read/Write  │
│ dbwd_rates        │  None   │  Read   │  Read*   │  Read            │  Read/Write  │
│ users             │  None   │  Read*  │  None    │  None            │  Read/Write  │
│ regulation_chunks │  None   │  None   │  None    │  Read            │  Read/Write  │
│ artifacts         │  None   │  Read   │  Read    │  None            │  Read/Write  │
│ ExtractedWCP      │  None   │  None   │  Create  │  Create (source) │  None        │
│ DeterministicRpt  │  None   │  None   │  Create  │  Create (source) │  None        │
│ LLMVerdict        │  None   │  None   │  Create  │  None            │  None        │
│ TrustScoredDec.   │  Read   │  Read   │  Create  │  None            │  Read        │
└───────────────────┴─────────┴─────────┴──────────┴──────────────────┴──────────────┘
```

*Read* = via Gateway proxy (Web never calls Data Platform directly)
*Read\** = indirect read (Gateway validates auth against DP, Agent looks up DBWD rates via CC)

## Invariant Boundary Rules

1. **Agent never writes to the database** — it returns `TrustScoredDecision` objects
2. **Data Platform creates official `DecisionRecord`s** — it's the only service that persists
3. **Compliance Core never persists** — it returns structured extraction/validation results
4. **Gateway never reasons** — it routes, validates, and authenticates
5. **All cross-service requests carry `x-request-id` and `x-trace-id`**
6. **Web never calls backend services directly** — all traffic goes through Gateway

## Why This Separation?

The V4 monolith (data-platform doing persistence + analytics + ingestion + quality) violated the Single Responsibility Principle. Each V5 service now has:

- **Distinct failure mode**: DB down (DP) ≠ LLM rate limited (Agent) ≠ extraction regex broken (CC)
- **Independent testing**: Unit tests don't need real databases or LLM APIs
- **Separate scaling**: Agent needs GPU/LLM scaling; Data Platform needs DB connection pool scaling
- **Clear reason to change**: New DBWD rates → only DP changes. New prompt → only Agent changes. New check → only CC changes.
