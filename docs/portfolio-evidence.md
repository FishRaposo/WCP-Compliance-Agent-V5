# Portfolio evidence

The canonical portfolio demonstration is deterministic, offline, and
credential-free:

```bash
pnpm install --frozen-lockfile
pnpm evidence
```

`scripts/portfolio_demo.ts` runs a fixed WH-347 scenario through the canonical
Compliance Core bridge and the local service adapters. It covers extraction,
validation, trust scoring, Agent synthesis, persistence and audit records, cache
fallback, SSE ordering and resume, cost/latency metadata, and the Web mock fixtures.
It does not call a provider or require PostgreSQL, Redis, Docker, or a hosted service.

## Bundle contract

Generated output is ignored under
`artifacts/portfolio/wcp-compliance-agent-v5-evidence/`:

- `manifest.json` describes the schema, files, scenario, and reproducibility hash;
- `report.json` is the normalized machine-readable report;
- `report.md` is the human-readable summary;
- `checksums.sha256` covers every tracked bundle file.

The small normalized comparison fixture is tracked at
`tests/fixtures/golden/portfolio-evidence.json`. Timestamps, generated identifiers,
runtime durations, filesystem paths, environment details, and secret-shaped values
are removed or redacted before hashing.

## Verify or replay

```bash
pnpm evidence
node scripts/verify_portfolio_evidence.mjs \
  artifacts/portfolio/wcp-compliance-agent-v5-evidence \
  --golden tests/fixtures/golden/portfolio-evidence.json
```

The verifier has no third-party runtime dependency. Missing files, malformed JSON or
manifests, unindexed files, checksum or byte-count mismatches, reproducibility drift,
and golden-fixture drift return a nonzero exit.

This bundle proves a reproducible local engineering path. It is not evidence of a
hosted deployment, live SAM.gov availability, live LLM quality, or production-scale
PostgreSQL/Redis behavior.
