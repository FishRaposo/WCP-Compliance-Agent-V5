# Testing and verification

## Canonical local gates

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm evidence
pnpm test:e2e
```

The finalization run passed 42 Contracts, 66 Agent, 45 Gateway, 29 Web, and four
tooling tests. Playwright passed desktop and 390x844 mobile smoke flows for login,
dashboard, analysis/decision proof, analytics, and review queue. The evidence bundle
reproduced the tracked normalized fixture.

## Python 3.12/Poetry gates

```bash
cd apps/compliance-core
poetry install --no-interaction
poetry run ruff check .
poetry run mypy src
poetry run pytest tests/unit tests/eval -q

cd ../data-platform
poetry install --no-interaction
poetry run ruff check .
poetry run mypy src
poetry run pytest tests/unit tests/integration -q
```

Compliance Core passed 84 unit tests and 101 eval tests locally: 100 normalized golden
examples plus one baseline-regression test. That local virtual environment uses Python
3.14; the CI workflow remains the authoritative Python 3.12/Poetry environment. Data
Platform integration uses PostgreSQL and Redis service containers there.

## Optional infrastructure checks

```bash
docker compose -f infra/docker-compose.prod.yml config
docker compose -f infra/docker-compose.prod.yml build
```

Docker is not required by the credential-free demo. The Compose gates run in CI;
local execution requires Docker and is recorded separately from source-level proof.

## Scope of proof

The suites pin extraction variants, deterministic verdict/trust behavior, service
contracts, offline composition, cache and SSE fallback/replay, evidence integrity,
and browser fixture flows. They do not claim load-test results, live provider quality,
live SAM.gov uptime, or a hosted production deployment.
