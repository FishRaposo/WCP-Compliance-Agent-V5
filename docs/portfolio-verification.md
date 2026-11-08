# Portfolio verification — WCP

Reproduce every gate without credentials. Python services need Python 3.12 +
Poetry (any installer; the in-project `.venv` layout is required by the
agent→core offline bridge and is pinned via `poetry.toml`).

## Toolchain

```bash
node --version          # 24.15+ (repo CI uses 24.15; 26 verified locally)
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

## Hosted demo — verified 2026-11-08

`https://fishraposo.github.io/wcp-demo/` is the same app built with `VITE_MOCK_API=true` and
`--base=/wcp-demo/`, published as static files. Verified in a headless browser against the live URL:
the **Sample data** badge renders, the deep link `/wcp-demo/review` boots the app through the
`404.html` fallback, `job-wh347-demo-2026` shows 3 violations and 42% trust, and the run made
**zero requests outside `fishraposo.github.io`** with no console errors.

The router takes its basename from `import.meta.env.BASE_URL`, so the same build works at `/` in the
dev server and under a subpath on Pages.

## Offline UI demo — verified 2026-11-07

`pnpm install --frozen-lockfile` then `pnpm demo:ui` on Node 26.13 / pnpm 9.15: install finished
in 2m 11s with the lockfile unchanged, Vite served on `localhost:5173`, mock auth signed in as
`portfolio@example.com`, and the app loaded the sample payroll with the **Sample data** badge.

Click path exercised: Dashboard → Review Queue (`job-wh347-demo-2026`, 42% trust, 3 violations,
2 warnings) → Inspect Audit (three citations: 40 U.S.C. § 3142(b), 29 CFR 5.5(a)(1), 5.5(a)(3)) →
Analyze, pasting `packages/test-fixtures/sample-wh347.txt` and running the five steps to the same
Rejected / 42% outcome with `trace-wh347-demo-2026`, 2,140 ms and $0.0038. **No console errors.**

Two UI defects were found and fixed during the run: dates rendered in the machine locale (Portuguese)
inside an English interface, and the dashboard card read "Inspect flagged flags". Both are fixed in
`apps/web`. Captures live in `docs/images/portfolio/` with their crop boxes recorded.

This proves the offline path the README promises. It does not prove live PostgreSQL/Redis or real
provider output — unchanged from the section above.
