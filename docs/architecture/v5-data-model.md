# V5 Data Model

## Tables

```
┌──────────────────────────────────────────────────────┐
│ decisions                                             │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ job_id (TEXT, UNIQUE)                                │
│ verdict (TEXT)       — "approved"|"rejected"|N/R     │
│ trust_score (FLOAT)  — 0.0 - 1.0                    │
│ trust_band (TEXT)    — auto_approve|flag|require      │
│ requires_human_review (BOOL)                         │
│ violation_count (INT)                                │
│ warning_count (INT)                                  │
│ reasoning_summary (TEXT)                             │
│ citations (JSONB)    — [{regulation, section, text}]  │
│ cost_usd (FLOAT)     — LLM token cost                │
│ latency_ms (INT)     — pipeline duration              │
│ phoenix_trace_id (TEXT)                              │
│ contract_id (TEXT)   — FK → contracts                │
│ created_at (TIMESTAMPTZ)                             │
└──────────────────────────────────────────────────────┘
         │ 1:N
         ▼
┌──────────────────────────────────────────────────────┐
│ audit_events                                          │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ job_id (TEXT)        — FK → decisions                │
│ event_type (TEXT)    — "decision_created"|"HR_flagged"│
│ actor (TEXT)         — "agent"|"system"               │
│ payload (JSONB)      — event-specific data            │
│ regulation_references (TEXT[])                        │
│ trace_id (TEXT)                                      │
│ created_at (TIMESTAMPTZ)                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ contracts                                             │
├──────────────────────────────────────────────────────┤
│ id (TEXT, PK)                                        │
│ contract_number (TEXT, UNIQUE)                       │
│ project_name (TEXT)                                  │
│ contractor_name (TEXT)                               │
│ contractor_ein (TEXT)                                │
│ agency (TEXT)                                        │
│ locality (TEXT)                                      │
│ start_date (DATE)                                    │
│ end_date (DATE)                                      │
│ total_value (NUMERIC(14,2))                          │
│ status (TEXT)        — active|completed|terminated    │
│ source (TEXT)        — manual|sftp|api|csv            │
│ metadata (JSONB)                                     │
│ created_at / updated_at (TIMESTAMPTZ)                │
└──────────────────────────────────────────────────────┘
         │ 1:N (list-partitioned by contract_id)
         ▼
┌──────────────────────────────────────────────────────┐
│ payroll_records                                       │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ contract_id (TEXT, PK — partition key)               │
│ employee_name (TEXT)                                 │
│ trade_code (TEXT)                                    │
│ locality_code (TEXT)                                 │
│ week_ending (DATE)                                   │
│ hours_* — Mon-Sun (NUMERIC(4,1))                     │
│ total_hours (NUMERIC(5,1))                           │
│ hourly_rate (NUMERIC(8,2))                           │
│ gross_pay (NUMERIC(10,2))                            │
│ fringe_rate / fringe_total (NUMERIC)                  │
│ overtime_hours / overtime_pay (NUMERIC)               │
│ decision_id (TEXT)    — FK → decisions                │
│ ingestion_job_id (TEXT) — FK → ingestion_jobs         │
│ created_at (TIMESTAMPTZ)                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ dbwd_rates                                            │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ trade (TEXT)          — "Electrician"                 │
│ locality (TEXT)       — "Washington, DC"              │
│ rate (FLOAT)          — prevailing wage               │
│ fringe (FLOAT)        — fringe benefit rate            │
│ effective_date (DATE)                                 │
│ wage_determination_number (TEXT)                      │
│ created_at (TIMESTAMPTZ)                             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ regulation_chunks                                     │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ text (TEXT)          — regulation text content        │
│ embedding (pgvector) — 1536-dim vector                │
│ metadata (JSONB)     — {regulation, section, title}   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ ingestion_jobs                                        │
├──────────────────────────────────────────────────────┤
│ id (TEXT, PK)                                        │
│ type (TEXT)          — contract_import|payroll_import │
│ status (TEXT)        — pending|running|complete|failed │
│ source_type (TEXT)   — sftp|api|csv                   │
│ contract_id (TEXT)   — FK → contracts                 │
│ total_records / processed / failed (INT)              │
│ error_details (JSONB)                                 │
│ started_at / completed_at (TIMESTAMPTZ)               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ users                                                 │
├──────────────────────────────────────────────────────┤
│ id (UUID, PK)                                        │
│ email (TEXT, UNIQUE)                                 │
│ password_hash (TEXT)                                 │
│ role (TEXT)           — analyst|admin                  │
│ created_at (TIMESTAMPTZ)                             │
└──────────────────────────────────────────────────────┘
```

## Key Relationships

- `decisions.job_id` → `audit_events.job_id` (1:N — one decision, many audit events)
- `contracts.id` → `payroll_records.contract_id` (1:N — list-partitioned)
- `contracts.id` → `decisions.contract_id` (1:N — optional)
- `ingestion_jobs.id` → `payroll_records.ingestion_job_id` (1:N)
- `dbwd_rates` is a lookup table (no FKs, referenced by Compliance Core during validation)

## Partitioning

`payroll_records` is list-partitioned by `contract_id` for query performance and data isolation. Each new contract creates a partition: `payroll_records_contract_{id}`.
