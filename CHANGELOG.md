# Changelog

## [5.3.0] - 2026-08-14

### Comprehensive portfolio finalization

- Expanded the WH-347 parser and 100-example golden set for alternate labels,
  US/long-form dates, decimal hours, and malformed-input refusal without changing
  existing verdict or trust-score baselines.
- Added versioned pipeline, trace, cost/latency, and evidence contracts with generated
  TypeScript/Python types.
- Added deterministic five-service offline composition that delegates compliance
  decisions to the canonical Python engine and preserves persistence/audit boundaries.
- Completed local Data Platform ingestion lifecycle, cache fallback, deterministic
  rate snapshots, Parquet manifests/checksums, and DuckDB contracts.
- Hardened SSE with deterministic IDs, heartbeats, local replay, per-client Redis
  cursors, and in-memory fallback.
- Added the reproducible `pnpm evidence` bundle/verifier and desktop/mobile Playwright
  smoke coverage.
- Aligned Node 20/pnpm 9.15 and Python 3.12/Poetry install gates, CI, and Docker build
  contexts; added repository hygiene and artifact upload jobs.
- Reconciled architecture, operations, security, testing, historical planning, and
  public portfolio documentation. Hosted/team workflows and mandatory external
  infrastructure remain explicitly deferred.

## [5.2.0] - 2026-06-19

### Agent → Mastra migration
- Rebuilt the Agent service on **Mastra 1.45** (`@mastra/core`): `Agent` with structured output + dynamic model routing, `createTool` tools, a `createWorkflow`/`createStep` pipeline, an opt-in suspend/resume human-review workflow, `@mastra/rag`, `@mastra/memory`, scorers, and `@mastra/langfuse` observability. Removed the hand-rolled pipeline, model router, prompt registry, and Langfuse wiring. See [ADR 0008](docs/adrs/0008-agent-built-on-mastra.md).
- Upgraded the agent's model layer to AI SDK v6 (`@ai-sdk/openai`/`anthropic` 3, `ollama-ai-provider-v2`) and `zod ^3.25`; removed three unused dependencies.
- Preserved the gateway↔agent HTTP contract and mock mode (runs with zero external services/keys).

### Hardening (review fixes)
- `safeVerdict` now rejects any non-rejected verdict when deterministic violations exist; reasoning and citations are grounded in deterministic truth before persistence.
- The verdict step degrades to the deterministic verdict on LLM failure; routes use a constant-time internal-token compare, an env-gated auth skip (fail closed), defensive JSON parsing (400 on malformed bodies), and resume-body validation.

### Documentation
- Added [CLAUDE.md](CLAUDE.md) and the AGENTS.md "Agent Layer (Mastra)" reference. Reconciled verification counts (274 unit tests; TypeScript subset 136).

---

## [5.1.1] - 2026-06-16

### Hardening
- Propagated `X-Internal-Token`, `x-request-id`, and `x-trace-id` through Gateway → Agent → Compliance Core/Data Platform calls.
- Added production guardrails so mock auth / missing internal service tokens cannot silently ship in production.
- Added Content-Length preflight rejection for oversized Compliance Core uploads before reading request bodies.
- Fixed Gateway PDF analysis route to call the actual `/internal/extract` endpoint and forward internal headers.
- Fixed Agent search tool contract to consume the Compliance Core `SearchResult` envelope.

### Documentation
- Reconciled verification counts: 260 source-collected unit tests, 24 Data Platform integration tests, and 92 golden-set eval examples.
- Added README “Current verification state” section separating unit tests, integration tests, eval examples, and E2E coverage.
- Marked ADR 0007 as Accepted in the ADR index to match the ADR file.

---

## [5.0.1] - 2026-06-03

### Security Fixes
- **CRIT-01**: Replaced plaintext password comparison with bcrypt hashing
- **CRIT-02**: Added SQL injection protection in DuckDB analytics queries
- **CRIT-03**: Fixed rate limiter IP spoofing vulnerability
- **CRIT-04**: Added memory cap to prevent rate limiter DoS
- **CRIT-05**: Removed JWT from response body; httpOnly cookies only
- **HIGH-01**: Added internal service token authentication
- **HIGH-02**: Removed localStorage token storage in frontend
- **HIGH-03**: Added Zod validation on bulk import endpoints
- **HIGH-04**: Replaced permissive passthrough() with strict schema
- **HIGH-05**: Implemented Redis connection pooling
- **HIGH-06**: Fixed content-type bypass on file upload

### Performance Improvements
- **PERF-01**: Parallel SAM.gov wage determination fetching
- **PERF-02**: Batch insert for payroll records
- **PERF-03**: Removed duplicate query in decision repo
- **PERF-06**: Persistent aiohttp session for SAM.gov client

### Bug Fixes
- Upgraded asyncpg from 0.30.0 to 0.31.0 (Windows compatibility)
- Added aiohttp as dev dependency for SAM.gov tests

---

## V5.1.0 (2026-05-06) — Portfolio Completion

### Added
- **V4 Analytics Web Pages** — 4 analytics pages (Overview, Compliance, Wages, LLM Cost) with KPICard, ChartCard, AnalyticsLayout components and lazy-loaded routes
- **SAM.gov WDOL Client** — `connectors/sam_gov.py` (245 lines) — search, fetch, and extract DBWD wage determinations from SAM.gov API
- **Redis Cache Service** — `services/redis_cache.py` — 24h TTL cache for DBWD rate lookups with pattern-based invalidation
- **DuckDB Archive Integration** — `storage/duckdb_init.py` — register PostgreSQL tables and Parquet archives as DuckDB views
- **Deployment** — 5 Dockerfiles + `docker-compose.prod.yml` + `deployment.md` + `seed_all.py`
- **ADR 0007** — Trust Score Weights — documents weight reconciliation decision

### Changed
- **Trust score weights aligned** — TypeScript now matches Python: 35/25/20/20 (was 40/15/25/20)
- **Golden-set expanded** — 10 → 92 examples covering all check types, edge cases, and format variants
- **Gateway SSE enhanced** — Redis Streams consumer with heartbeat fallback
- **Compliance Core search** — hybrid RAG endpoint (BM25 + vector + cross-encoder) replaces stub
- **Data Platform analytics** — 9 endpoints (overview, volume, approval-by-trade, trust-band-distribution, cost, compliance, wages, llm)
- **DBWD refresh** — seeds 20 Washington DC trades from in-memory corpus (upsert)
- **Artifact repository** — proper SQL implementation with upsert
- **Redis Streams** — decision events published on persist, SSE bridge in Gateway
- **Quality validators** — contract, payroll, and DBWD rate validation
- **Enterprise connectors** — BaseConnector ABC, SFTP, API, Database, Registry
- **Parquet export** — PyArrow + Snappy + MD5
- **Prefect ETL flows** — `import_safe_flow` decorator, dbwd_refresh, bulk_ingest, decision_export
- **Observability** — OpenTelemetry tracing (both Python services), metrics collector, Phoenix setup
- **CI/CD** — main CI pipeline (3 parallel jobs) + weekly golden-set evaluation

### Fixed
- Web app API path mismatch (`/api/*` → `/api/v1/*`)
- Gateway analytics endpoints (4 missing proxies)
- Compliance Core search GET/POST method mismatch
- Artifacts table missing from migration
- DBWD refresh pipeline `async for get_session()` bug
- Analytics router duplicate function + async/sync bug
- TypeScript trust score weight alignment with Python

### Documentation
- README with architecture diagram, quick start, mock mode, pipeline overview
- V5 request flow (16-step sequence diagram)
- V5 data ownership matrix (13 entities, R/W by service)
- V5 data model (7 tables with relationships)
- V2→V5 evolution narrative with version comparison
- ADR index (7 decisions)
- Case study (problem, architecture, pipeline, RAG, lessons learned)
- Porting audit (76/88 V3 files ported, 86%)
- Known gaps document
- CONTRIBUTING.md, LICENSE (MIT), deployment guide

### Testing
- 260 source-collected unit tests across all services (75 CC + 60 DP + 57 Agent + 22 Gateway + 29 Web + 17 Contracts)
- 92 golden-set eval examples with regression detection
- 7/7 TypeScript packages typecheck clean
- Both Python services: ruff + mypy + pytest clean

---

## V5.0.0 (2026-03-15) — Initial Release

### Architecture
- Five-service monorepo: Web, Gateway, Agent, Compliance Core, Data Platform
- Turborepo + pnpm workspaces (TypeScript) + Poetry (Python)
- PostgreSQL 16 (pgvector) + Redis 7

### Core Pipeline
- WH-347 PDF/text → extract → validate → LLM verdict → trust score → persist
- Deterministic rule engine (5 checks per employee + data integrity + minimum wage)
- DBWD rate lookup with fuzzy matching (20 DC trades)
- LLM verdict agent with mock mode and multi-provider routing
- Trust score (4-component weighted, safe verdict override)

### Services
- Web: React 19, Vite, Shadcn/ui, TanStack Query, mock mode
- Gateway: Hono, JWT auth, rate limiting, SSE streaming, request tracing
- Agent: Vercel AI SDK, Langfuse, prompt registry, model router
- Compliance Core: FastAPI, pdfplumber, Pydantic v2, 12+ regex patterns
- Data Platform: FastAPI, SQLAlchemy, Alembic, 7 tables, partitioned payrolls
