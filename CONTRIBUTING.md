# Contributing

## Dev Setup

```bash
# Prerequisites: Node.js 20+, Python 3.12, pnpm 9+, Poetry 1.8+

git clone <repo-url>
cd wcp-compliance-agent-v5

# Install TypeScript dependencies
pnpm install

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
# Run all TypeScript tests
pnpm test

# Run Python tests
cd apps/compliance-core && poetry run pytest tests/unit -v
cd apps/data-platform && poetry run pytest tests/unit -v

# Run golden-set evaluation
cd apps/compliance-core && poetry run pytest tests/eval -v
```

## Mock Mode

All testing can be done without external services:

```bash
VITE_MOCK_API=true LLM_MODE=mock WCP_MOCK_AUTH=true pnpm dev
```

This runs the full stack with mock data — no PostgreSQL, Redis, or API keys needed.

## PR Process

1. Write tests for your changes
2. Run `pnpm typecheck && pnpm lint && pnpm test`
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

Three parallel pipelines run on every push to master:
- TypeScript: typecheck → lint → build → test
- Compliance Core: ruff → mypy → pytest
- Data Platform: ruff → mypy → pytest

Golden-set evaluation runs weekly (Monday 6 AM) and on manual trigger.
