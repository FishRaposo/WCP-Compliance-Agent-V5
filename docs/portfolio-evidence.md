# Portfolio evidence

The canonical portfolio demonstration is deterministic, offline, and
credential-free:

```bash
pnpm install --frozen-lockfile
pnpm evidence
```

`scripts/portfolio_demo.ts` runs a fixed WH-347 scenario through the canonical
Compliance Core bridge and the local service adapters. The scenario tells the
same rejected story as the Web demo (Jane Worker, Electrician, paid $45.00/hr against
the $51.69 minimum, under-reported fringe, overtime paid at straight time). The
locality is Washington, DC because the offline wage data only holds DC rates. The real
rule engine finds three violations, the Agent returns `rejected`, and `report.md` lists
each violation with its expected and actual values and regulation citation. The Web
demo's trust score and band are hand-written mock values for illustration and differ
from the score the pipeline computes here. It covers extraction,
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

To change the scenario on purpose, regenerate the fixture and review its diff before
committing it:

```bash
pnpm --filter @wcp/agent exec tsx ../../scripts/portfolio_demo.ts --update-golden
git diff tests/fixtures/golden/portfolio-evidence.json
pnpm evidence
```

The printed reproducibility SHA-256 is the canonical hash of the fixture, and the
verifier recomputes it from `report.json`.

The verifier has no third-party runtime dependency. Missing files, malformed JSON or
manifests, unindexed files, checksum or byte-count mismatches, reproducibility drift,
and golden-fixture drift return a nonzero exit.

This bundle proves a reproducible local engineering path. It is not evidence of a
hosted deployment, live SAM.gov availability, live LLM quality, or production-scale
PostgreSQL/Redis behavior.
