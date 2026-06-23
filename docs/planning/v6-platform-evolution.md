# V6 Platform Evolution — Design Doc

**Status:** Proposed (awaiting approval). **Date:** 2026-06-20.

Apply the pattern that produced the Mastra agent migration — *adopt the framework that
already owns the domain; delete the hand-rolled version* — to the other four services, and add
new services. Every item below is anchored to a defect the recent cross-module review found
(contract drift, auth bypass, brittle extraction, fake ingestion, non-atomic audit): each was a
symptom of hand-rolling a solved problem.

**Preserved across all phases:** the five-service architecture, the gateway↔agent HTTP
contract, "deterministic checks are the source of compliance truth / the LLM never overrides,"
the "agent never writes the DB" boundary, and **mock mode** (zero external services/keys).

## 0. Verifiability reality (this sandbox vs CI/infra)

This sandbox has **no poetry** (Python tests run only in CI), **no Temporal/OPA/OpenFGA
servers**, and **no warehouse**. The plan is honest about what gets *verified here* vs *CI/infra*.

| Phase | Item | Verifiable in sandbox | Needs CI / infra |
|---|---|---|---|
| 1 | Typed contracts (TS half) | ✅ tsp compile, Zod gen, ts-rest, typecheck, vitest | Pydantic gen (datamodel-codegen) + pytest = CI |
| 1 | MCP server | ✅ fully (InMemoryTransport + mocked ServiceClient) | — |
| 1 | Web typed client + router | ✅ fully (typecheck + vitest) | — |
| 2 | Temporal (data-platform) | ⚠️ static only (write code) | Temporal server + pytest (test-server binary downloads on first run) |
| 2 | DBWD ingestion | ⚠️ parser logic over fixtures (CI pytest) | SAM.gov key + scheduler + Postgres/DuckDB |
| 3 | OPA/Rego rules | ✅ Rego + `opa test` (CLI binary, no server) | regorus wheel + pytest in CI |
| 3 | dbt analytics | ✅ `dbt parse`/`compile`; dbt-duckdb `dbt build` (local file) | dbt-postgres run = CI/db |
| 4 | OpenFGA authz + auth | ⚠️ model + middleware with mocks | OpenFGA server + auth provider |
| 5 | Reporting / Notification / Eval | ✅ generate PDF / mocked providers / scorer runs | provider keys for live send |

## Phase 1 — Typed contracts + MCP server + Web typing *(fully verifiable here)*

Highest leverage, best showcase, zero new runtime infra. Do this first — the typed contract
unblocks and de-risks every later phase.

### 1a. Typed contracts — TypeSpec + ts-rest

**Replaces** `packages/contracts/generate.py` (+ `schemas/*.json`, `generated/`). That generator
is both lossy (enums → bare `str`, drops `uuid`/`date-time` formats + min/max, collapses
objects to `z.any()`/`dict`) **and orphaned** — `generated/typescript/index.ts` is imported only
by the contracts test, and `generated/python/__init__.py` is imported by **nobody** (data-platform
and compliance-core hand-roll their own SQLAlchemy + Pydantic models, the exact drift source).

**Toolchain (build-time only, no runtime infra):**
- **TypeSpec 1.13** (`@typespec/compiler` + `@typespec/http` + `@typespec/openapi3`) is the single
  source. `tsp compile` → `generated/openapi.3.1.yaml`.
- **TS:** `openapi-zod-client@1.18.3` → `generated/zod.ts` (Zod **3** — matches the repo).
- **Python:** `datamodel-code-generator@0.65.0` → `generated/python/models.py`
  (`--output-model-type pydantic_v2.BaseModel --use-annotated --field-constraints`), preserving
  enums/formats/constraints.
- **Public web↔gateway HTTP API:** `ts-rest@3.52.1` (`@ts-rest/core` + `@ts-rest/open-api`) — one
  runtime-validated contract consumed by the React client and the Hono gateway, with full TS
  inference. **Not** `@hono/zod-openapi@1.4` — it peer-requires Zod **4**, forcing a repo-wide
  Zod 3→4 migration we explicitly avoid.

**Layout:**
```
packages/contracts/
  models.tsp, tspconfig.yaml          # source of truth (data models)
  src/http.ts                          # ts-rest router for the public API
  generated/openapi.3.1.yaml           # tsp output
  generated/zod.ts                     # openapi-zod-client output (committed)
  generated/python/models.py           # datamodel-codegen output (committed)
  scripts/generate.(ts|sh)             # orchestrates tsp + zod + pydantic
```
**Wiring (incremental):** gateway `routes/contracts.ts` (today re-declares Zod by hand) and the
web client import the one ts-rest contract; data-platform/compliance-core import generated
Pydantic DTOs, replacing hand-rolled request/response models module-by-module. Internal
gateway↔agent contract and the `400 {error, details}` shape are preserved.

**Test strategy:** (1) **golden-file drift test** — run the full pipeline and diff against
committed `openapi.yaml`/`zod.ts`/`models.py`; any drift fails CI (the guardrail `generate.py`
lacked). (2) **round-trip parity** — a fixture (e.g. `TrustScoredDecision`) parsed by both
generated Zod and generated Pydantic must accept/reject identically. (3) ts-rest router 400 +
typed-response tests. (4) `pnpm typecheck`.

**Verifiable here:** the entire TS side (tsp compile, Zod gen, ts-rest, typecheck, vitest).
**CI-only:** `datamodel-codegen` + Pydantic pytest.

**Risks/rollback:** Zod-3 ecosystem lock-in (revisit emitter if the repo moves to Zod 4);
`openapi-zod-client` is community-maintained. Rollback: keep the old `@wcp/contracts` until the
ts-rest/TypeSpec path is consumed everywhere; both can coexist behind the package.

**Definition of done:** TypeSpec source compiles; Zod + Pydantic generated + committed; ts-rest
contract consumed by gateway + web; drift + parity tests green; old generator removed.

### 1b. MCP server — new `apps/mcp-server`

Expose the compliance engine (`validate`, `dbwd-lookup`, `wage-search`) over **MCP** so Claude /
any agent can use it directly — turning the platform into an agent-native compliance API and
extending the Mastra story.

- `@modelcontextprotocol/sdk@^1.29.0` (peer `zod ^3.25 || ^4` — matches repo). `McpServer` +
  `server.registerTool(name, config, handler)`. **Dual transports** from one factory:
  `StdioServerTransport` (Claude Desktop / Code) and `StreamableHTTPServerTransport`
  (stateless) mounted on a tiny `@hono/node-server` app (remote/agent).
- Each tool is a thin wrapper over a compliance-core `/internal/*` call via the repo's
  `ServiceClient` (`@wcp/typescript-client`), forwarding `X-Internal-Token` + trace headers.
- **Package** mirrors `apps/gateway`: scripts (dev/build/typecheck/test/lint), deps
  `@modelcontextprotocol/sdk`, `zod`, `hono`, `@hono/node-server`, `@wcp/typescript-client`,
  `pino`, `dotenv`.

**Test strategy (fully sandbox-verifiable):** `InMemoryTransport` + `Client` with a **mocked
ServiceClient** — `listTools`, `callTool` happy + error paths, Zod input validation, and
trace/auth-header forwarding assertions; `tsc --noEmit` + `vitest`.

**Gotcha (from research):** the GitHub `main` README is an unreleased v2 with a different API —
**pin 1.29.0 and verify against the installed `.d.ts`**; `inputSchema` takes a **raw zod shape**,
not a wrapped `z.object`.

**DoD:** server factory + 3 tools; both transports; full in-memory test suite green; README with
`claude_desktop_config.json` + HTTP usage.

### 1c. Web — typed client + TanStack Router

- Generate the web API client from the ts-rest contract (kills the `DecisionSummary`-missing-fields
  class of drift we hit). **TanStack Router 1.170** for typed routes. Lean into the existing SSE
  decision feed for live updates.
- **Tests:** component + client-typing tests (vitest, jsdom). Fully verifiable here.

## Phase 2 — Temporal + DBWD ingestion *(infra: Temporal server, SAM.gov)*

### 2a. Temporal in the data platform

Own ingestion / ETL / analytics-refresh as **durable, retryable, observable** workflows,
replacing the hand-rolled `pipelines/*` + Redis-stream choreography (the "ingestion jobs").

- **Python SDK `temporalio==1.29`** inside `apps/data-platform` (NOT the TS SDK — keep ETL in the
  service that owns the SQLAlchemy repos + DuckDB writers). A **Temporal worker** process (own
  container) hosts `@workflow.defn` workflows + `@activity.defn` activities; FastAPI endpoints
  become thin clients calling `client.start_workflow(...)`. Activities reuse the **unchanged**
  `services/`, `repositories/`, `db/session.py`.
- **Infra:** a Temporal server — self-host via docker-compose (`temporalio/auto-setup` backed by
  Postgres; the repo already runs Postgres — Temporal uses its own DB on the same instance, not
  Redis) or `temporal server start-dev` for dev; or **Temporal Cloud** (mTLS, cost). Adds a worker
  deployment.

**Test strategy:** `WorkflowEnvironment` (time-skipping) for workflow tests; activities unit-tested
with a mocked session. **Caveat:** `WorkflowEnvironment.start_*` downloads a `temporal-test-server`
binary from GitHub releases on first run (needs egress) → **CI/infra only**.

**Risks/rollback:** meaningful operational weight (a Temporal cluster). Rollback: keep the existing
Redis-stream path behind a flag until workflows reach parity; migrate one pipeline at a time.

### 2b. DBWD ingestion — new `apps/dbwd-ingestion`

Make "deterministic checks are the source of truth" *real* by ingesting actual Davis-Bacon
**General Wage Determinations** instead of the seed corpus.

- **Source:** **SAM.gov** (official federal GWD repository since 2019). There is **no dedicated WD
  REST API** → a scheduled **fetch-and-parse** of WD documents + the SAM WD data extract,
  normalized into Postgres (authoritative rate tables) and mirrored to DuckDB. compliance-core then
  reads these rates.
- **Orchestration:** Temporal (2a) schedules daily revision-diffing.
- **Infra:** free SAM.gov `api_key`; outbound HTTPS; Postgres + DuckDB (already in stack); object
  storage for raw determination docs.

**Test strategy:** **fixture-locked parser regression tests** — commit real WD samples and assert
the parser extracts the right `(wd_number, revision, effective_date, trade, rate, fringe)`. Parser
is pure-Python (CI pytest); fetch/schedule is infra.

**Risks:** brittle parser (SAM WD formatting changed recently) → treat as a maintained, fixture-
tested component; revision/effective-date mis-keying → validate keys explicitly.

## Phase 3 — OPA/Rego rules + dbt analytics *(infra: opa CLI / dbt)*

### 3a. OPA/Rego in compliance-core

Make the compliance rules **declarative, versioned, testable policy** — "the rules are data you can
show an auditor" — replacing imperative Python branches (where the overtime + classification bugs
we just fixed were hiding).

- **Embedded** via the **`regorus`** Python binding (Microsoft's Rust Rego interpreter) — **not** a
  sidecar OPA server, **not** opa-wasm. A `policy/` Rego package (wage/overtime/fringe/arithmetic/
  classification) + a small `rego_engine.py` wrapper invoked by the existing validate step. **DBWD
  rates move from code into versioned JSON `data`.** Keep the **`opa` CLI** (OPA v1.x, Rego v1) as a
  dev/CI dep for `opa test` / `opa fmt` / `opa check`. The "LLM never overrides" contract is
  preserved — OPA produces the authoritative violations; the agent only cites them.

**Test strategy:** `*_test.rego` run under the `opa` CLI (binary, no server) **and** golden-diffed
against `regorus` output (parity guard); Python wrapper unit tests.

**Verifiable here:** Rego + `opa test` if the `opa` binary is fetched (no server). **Risk:**
`regorus` wheel availability (PyPI showed 0 files at check time) — pin/verify, with **opa-wasm** as
the parity-safe fallback; regorus is a re-implementation of Rego, so CI must golden-diff vs the Go
`opa` engine.

### 3b. dbt analytics in the data platform

Own analytics transformations / tests / lineage instead of inline SQL (where we found the DuckDB
queries silently broken).

- **`dbt-core 1.11` + `dbt-duckdb 1.10`** (DuckDB analytics path) **+ `dbt-postgres 1.10`**
  (operational path). A `dbt/` project replaces the inline analytics SQL in the Data Platform.
  Models + schema tests + lineage (`manifest.json`).

**Test strategy:** `dbt parse` / `dbt compile` validate SQL+Jinja with **no warehouse**;
`dbt-duckdb` can run a full `dbt build` locally against a DuckDB file (partly verifiable here);
`dbt test` for schema/data tests. **DoD:** analytics endpoints read dbt models; tests green.

## Phase 4 — Gateway authz + auth runtime *(infra: OpenFGA server, auth provider)*

Close the security class the review found (a total auth bypass) with a real authz engine + a real
identity runtime, replacing hand-rolled jose + cookies + exact-path middleware.

- **Authorization:** **OpenFGA** (Zanzibar/ReBAC) via `@openfga/sdk@0.9.6` — relationship-based
  per-contract access (`auditor` / `admin` / `contractor` + contract membership), which fits
  per-contract sharing far better than Cedar's policy-as-data. Gateway checks via `fga.check`.
- **Auth runtime:** replace hand-rolled JWT with **WorkOS/Clerk** (managed) *or* **Ory/Lucia**
  (self-host) — choose by hosting preference (a per-option matrix will accompany implementation).
- **Infra:** OpenFGA server (`openfga/openfga` + Postgres) + the chosen auth provider.

**Test strategy:** OpenFGA **authorization-model tests** (the OSS model test framework) + gateway
middleware tests with a **mocked FGA client**; live `check` is infra. **Risks:** added infra; auth
provider lock-in (mitigate with an adapter interface).

## Phase 5 — New services *(reporting/export, notification, eval/monitoring)*

- **Reporting/Export** (`apps/reporting`): generate filled **WH-347 PDFs** + regulator-ready
  compliance packets — `pdf-lib 1.17` (fillable AcroForm) or `weasyprint 69` (HTML→PDF). Verifiable
  (generate a PDF locally).
- **Notification** (`apps/notification` or a data-platform worker): human-review SLA + violation
  alerts via email (`resend`/`nodemailer`/SES) + Slack (`@slack/web-api`), triggered by audit
  events / Temporal. Verifiable with mocked providers; live send needs keys.
- **Eval/monitoring**: continuous compliance-accuracy via the **Mastra scorers + the 100-example
  golden set**, surfaced on a web dashboard; a scheduled Temporal/Mastra workflow. Extends the
  agent's eval. Scorer runs are partly verifiable here.

## 6. Cross-cutting

**Infra additions (docker-compose):** Temporal cluster (+ its Postgres DB), OpenFGA (+ Postgres),
object storage for WD docs. OPA is embedded (no server); dbt-duckdb needs no server. New env:
`SAM_GOV_API_KEY`, `TEMPORAL_ADDRESS`, `OPENFGA_API_URL`/store id, auth-provider keys, notification
provider keys.

**CI additions:** contract codegen **drift check** (tsp + zod + pydantic); `opa test`; `dbt parse`;
mcp-server + new-service pipelines; Temporal worker build + `WorkflowEnvironment` tests; fixture-
locked DBWD parser tests.

**Sequencing & dependencies:** Phase 1 first (typed contract de-risks everything). 2b (DBWD data)
feeds 3a (OPA rules read real rates) and is orchestrated by 2a (Temporal). Phase 4 (authz) is
independent. Phase 5 depends on the audit-event stream / Temporal. Each phase is **additive and
flag-gated** — old paths stay until parity, so any phase is independently shippable/revertible.

**Documentation:** each phase adds an ADR (0009…), an AGENTS.md section, and a service README; the
existing docs (`v5-*`, `case-study`) get a "V6 evolution" addendum.

## 7. Program definition of done

Per phase: framework adopted + hand-rolled code deleted; comprehensive docs (ADR + README +
AGENTS.md); tests to the stated strategy (verified here where possible, CI elsewhere); mock mode
preserved; external contracts byte-compatible; CI green. Program: the five services each "own" their
domain via a purpose-built framework, with the typed contract eliminating cross-service drift.
