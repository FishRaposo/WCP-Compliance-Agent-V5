# Contributing

## Dev Setup

```bash
# Prerequisites: Node.js 20+, Python 3.12, pnpm 9+, Poetry 1.8+

git clone <repo-url>
cd wcp-compliance-agent-v5

# Install TypeScript dependencies
pnpm install --frozen-lockfile

# Install Python dependencies
cd apps/compliance-core && poetry install
cd ../data-platform && poetry install
```

## Code Style

### TypeScript
- ES modules, strict mode, Node 20+
- ESLint + Prettier via Turborepo
- Run: `pnpm lint`

### Python
- ruff line-length 100, Python 3.12, mypy strict
- Run: `cd apps/<service> && poetry run ruff check . && poetry run mypy src/`

## Testing

```bash
# Run TypeScript and tooling tests
pnpm test

# Generate and verify the credential-free portfolio bundle
pnpm evidence

# Run desktop and mobile browser smoke tests
pnpm test:e2e

# Run Python tests
cd apps/compliance-core && poetry run pytest tests/unit -v
cd apps/data-platform && poetry run pytest tests/unit -v

# Run golden-set evaluation
cd apps/compliance-core && poetry run pytest tests/eval -v
```

## Mock Mode

The canonical evidence and browser paths run without external services:

```bash
pnpm evidence
pnpm test:e2e
```

`VITE_MOCK_API=true` also runs the Web app from fixtures. A live Data Platform
persistence flow still requires its configured database; do not describe fixture or
adapter execution as a hosted full-stack deployment.

## PR Process

1. Write tests for your changes
2. Run `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test`
3. Run Python tests for any Python changes
4. Run golden-set eval if changing deterministic logic
5. Ensure no regressions in golden-set baseline

## Architecture Rules

- Agent never writes to the database
- Data Platform is the only service that persists
- Compliance Core never persists
- Gateway never reasons
- All cross-service calls carry `x-request-id` and `x-trace-id`

## CI

Independent hygiene, TypeScript/evidence, browser, Python-service, and Docker jobs
run on every push or pull request to `main`. See `.github/workflows/ci.yml` for the
exact locked toolchains and commands.

Golden-set evaluation runs weekly (Monday 6 AM) and on manual trigger.
