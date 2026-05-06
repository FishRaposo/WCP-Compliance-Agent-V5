# V2 → V5 Evolution

## Version History

### V2 — TypeScript Monolith (Proof of Concept)

**Stack:** TypeScript, Express, React, SQLite

A single TypeScript application that proved AI-assisted compliance validation could exist. The entire pipeline ran in-process: extraction, validation, LLM verdict, and persistence all in one TypeScript runtime.

**Key lesson:** It worked, but the LLM layer couldn't be trusted alone. We needed deterministic math checks alongside the LLM reasoning.

### V3 — First Separation

**Stack:** Python backend (FastAPI), TypeScript agent (Express), React frontend

The first architectural split: deterministic validation moved to Python (FastAPI) with proper Davis-Bacon math, while the LLM agent stayed in TypeScript. This was the "Compliance Core" concept born — the Python service was the source of compliance truth, not the LLM.

**Key lesson:** Two services were manageable, but the boundary between "backend" and "agent" was fuzzy. The backend started doing too many things (persistence, analytics, ingestion).

### V4 — Expansion Pressure

**Stack:** Python backend grew to include data platform features (analytics, ingestion, quality), TypeScript agent, React frontend with analytics pages

The "backend" service became a monolith-within-a-monolith — handling persistence, DuckDB analytics, CSV ingestion, data quality validation, DBWD rate refresh, and Parquet export. The boundary pressure was evident: changing any one subsystem risked breaking others.

**Key lesson:** A service that does "everything with data" has no clear reason to change. Every feature change touched the same service. Testing was slow because the test matrix kept expanding.

### V5 — Boundary Rebuild

**Stack:** Five services by responsibility — Web, Gateway, Agent, Compliance Core, Data Platform

The V5 architecture enforces strict boundaries:

| Service | What it owns | What it never does |
|---|---|---|
| **Web** | UI state, user interactions | Business logic, data access |
| **Gateway** | Auth, routing, rate limiting | Reasoning, persistence |
| **Agent** | LLM orchestration, verdict synthesis | Database writes, extraction |
| **Compliance Core** | Deterministic validation, DBWD lookup | Persistence, LLM reasoning |
| **Data Platform** | Decision records, audit events, contracts, payrolls | Extraction, validation, verdicts |

## Version Comparison

| | V2 | V3 | V4 | V5 |
|---|---|---|---|---|
| Services | 1 | 2 | 3 | 5 |
| Deterministic validation | Basic regex | Full checks | Full checks + trust score | Same, optimized |
| LLM integration | In-process | Agent service | Agent + RAG | Agent + hybrid RAG |
| Database | SQLite | PostgreSQL | PostgreSQL + pgvector | Same, partitioned |
| Analytics | None | None | DuckDB + PostgreSQL | PostgreSQL (scalable) |
| Ingestion | None | None | SFTP/CSV connectors | Connector registry |
| Testing | ~40 tests | ~80 tests | ~120 tests | **205 tests** |
| Key weakness | LLM trusted alone | Fuzzy boundaries | Monolith backend | — |
| Key strength | Proved concept | Separation worked | Full pipeline | **Clean boundaries** |
