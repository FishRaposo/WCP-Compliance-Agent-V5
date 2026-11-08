# Portfolio baseline — WCP Compliance Agent V5

Re-baselined 2026-11-08 on branch `migration/zod-4-full`.

## Verified gates (this environment, no credentials)

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | clean (pnpm 9.15.0, Node 26; repo targets Node 24.15+) |
| `pnpm test` | 7/7 turbo packages green — Contracts 42, Agent 71, Gateway 50, Web 33 (+4 tooling) |
| compliance-core `poetry install` (py3.12 in-project venv) | clean via uv-managed 3.12.15 |
| `poetry run ruff check .` + `mypy src/` | clean (both Python services) |
| `pytest tests/unit tests/eval` (compliance-core) | 194 pass |
| data-platform `pytest tests` (SQLite/in-memory portable profile) | 103 pass, 5 PG-only skips |
| Hosted CI | green on `main` prior to this branch (dependabot-era run); new run pending on this PR |

## 2026-11-08 dependency migration

- **zod 3.25 → 4.6.6.** All six manifests that carried zod were reconciled; three were dead dependencies. `error.format()` became `z.treeifyError()`, `z.string().url()/email()` became `z.url()/z.email()`, `.passthrough()/.strict()` became `z.looseObject()/z.strictObject()`, and generated `z.record(z.any())` became `z.record(z.string(), z.unknown())`.
- **One Vite and one Vitest.** Vitest 3.2.6 → 4.1.12; Vite is 8.3.6 only (the nested 6.4.4 copy is gone); jsdom 31.
- **Security pins:** `@modelcontextprotocol/sdk` 1.29.0 → 1.32.2, `probe-image-size` 7.5.0, `fast-copy` 4.3.1, the Mastra-aliased `@ai-sdk/provider-utils-v5` 3.0.45, and `undici` 5.29.0 → 6.29.1 (which also removed the vulnerable `@fastify/busboy` 2 copy). `minimatch` 11 and `deepmerge` stay open (eslint 10 pins minimatch ^10; deepmerge has no patched version).
- **Python:** pytest 9.2.0, pytest-asyncio 1.4.1.post1, pyarrow 23.0.1; starlette 1.10.0 and cryptography 50.0.2 were already current.
- **Node floor:** 24.15+ everywhere (jsdom 31's engine floor; Mastra 1.45 needs 22.13+); CI and all three Dockerfiles now use Node 24.
- **Blocked, with the reason:** AI SDK provider 4.x and ollama 4.x emit `LanguageModelV4` / require `ai@^7`, while Mastra 1.45 consumes `MastraLanguageModelV3`; Vitest 5 breaks the agent's constructor mocks and buys nothing over 4.1.

## Baseline defects found and fixed

- `compliance-core-bridge` timeout 4.5s — flaky on cold venv/slow hosts (offline path only; now env-tunable, default 30s).
- `redis-refused.test.ts` 3s timeout vs ~11s Windows refused-connect path → 20s.
- `persist_decision` upsert silently overwrote the official record on duplicate `job_id` — now created/duplicate/conflict with 409 semantics.
- Post-commit publish failure was silently dropped — now a durable `decision_event_publish_failed` audit event.
- Review override was not idempotent — identical replays dedupe, conflicting second reviews 409.
- Fuzzy trade→rate match silently substituted rates — now provenance-flagged WARNING.
- `safeVerdict` let `approved` stand on warning-bearing (unverified) coverage — now abstains to `needs_review`.

## Deferred honestly

- Real PostgreSQL/Redis integration suite (`infra/docker-compose.test.yml`) — not run here; portable SQLite profile proves the contract semantics, not PG-specific behavior (e.g. `on_conflict_do_nothing` parity is covered for both dialects in code, integration-verified on SQLite only).
- Live LLM provider mode (`LLM_MODE=real`) — requires keys; mock mode is the verified path.
- Docker image builds — recipe unchanged; not rebuilt locally.
- Golden-set corpus is synthetic/agent-authored; no domain-expert validation claimed.
- 20-PDF held-out adversarial set (WC-05 plan) — not authored; extraction eval remains the 100-example golden set only.
