# Portfolio verification — WCP

Reproduce every gate without credentials. Python services need Python 3.12 +
Poetry (any installer; the in-project `.venv` layout is required by the
agent→core offline bridge and is pinned via `poetry.toml`).

## Toolchain

```bash
node --version          # 20+ (repo CI uses 20; 22/24 also verified)
pnpm --version          # 9.15.0 (declared packageManager)
python3.12 --version    # e.g. via `uv python install 3.12`
poetry --version        # 1.8.5
```

## TypeScript (repo root)

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test               # Contracts 42 + Agent 70 + Gateway 45 + Web 30 + 4 tooling
pnpm build
pnpm evidence           # deterministic evidence bundle + checksums
pnpm demo:ui            # offline demo at http://localhost:5173
```

## Compliance Core (`apps/compliance-core`)

```bash
poetry env use <python3.12-path>     # e.g. `uv python find 3.12`
poetry install --no-interaction      # in-project .venv
poetry run ruff check .
poetry run mypy src/
poetry run pytest tests/unit tests/eval -q   # 89 + 101 = 190
```

## Data Platform (`apps/data-platform`) — portable profile

```bash
poetry env use <python3.12-path>
poetry install --no-interaction
poetry run ruff check .
poetry run mypy src/
poetry run pytest tests -q            # 98 pass, 5 PG-only skips
```

Integration tests run on in-memory SQLite via `tests/integration/conftest.py`
— no Docker needed. The decision/review idempotency and restart-durability
proofs live in `tests/integration/test_portfolio_review.py` (file-backed
SQLite for the restart case). Real PostgreSQL/Redis parity is exercised by CI
or `infra/docker-compose.test.yml` and is **not** claimed here.

## What this does not prove

- Live PG/Redis behavior, live LLM provider output, Docker image runtime, or
  authoritative Davis-Bacon rate coverage (synthetic corpus — see
  `docs/supported-rule-pack.md`).
