# Portfolio baseline — WCP Compliance Agent V5

Re-baselined 2026-10-24 on branch `feat/wcp-portfolio`.

## Verified gates (this environment, no credentials)

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | clean (pnpm 9.15.0, Node 24; repo targets Node 20+) |
| `pnpm test` | 7/7 turbo packages green — Contracts 42, Agent 70, Gateway 45, Web 30 (+4 tooling) |
| compliance-core `poetry install` (py3.12 in-project venv) | clean via uv-managed 3.12.15 |
| `poetry run ruff check .` + `mypy src/` | clean (both Python services) |
| `pytest tests/unit tests/eval` (compliance-core) | 89 unit + 101 eval = 190 pass |
| data-platform `pytest tests` (SQLite/in-memory portable profile) | 98 pass, 5 PG-only skips |
| Hosted CI | green on `main` prior to this branch (dependabot-era run); new run pending on this PR |

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
