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
`tests/fixtures/golden/portfolio-evidence-v2.json`. Timestamps, generated identifiers,
runtime durations, filesystem paths, environment details, and secret-shaped values
are removed or redacted before hashing.

## Verify or replay

```bash
pnpm evidence
node scripts/verify_portfolio_evidence.mjs \
  artifacts/portfolio/wcp-compliance-agent-v5-evidence \
  --golden tests/fixtures/golden/portfolio-evidence-v2.json
```

The verifier has no third-party runtime dependency. Missing files, malformed JSON or
manifests, unindexed files, checksum or byte-count mismatches, reproducibility drift,
and golden-fixture drift return a nonzero exit.

This bundle proves a reproducible local engineering path. It is not evidence of a
hosted deployment, live SAM.gov availability, live LLM quality, or production-scale
PostgreSQL/Redis behavior.

## Strict rate authority profile (2026-10-28 diagnostic repair)

The current normalized report identifies `validation_profile: strict-rate-scope-v2`.
Its payroll supplies an explicit locality, week ending and the available
`DC-2025-001` determination. The canonical rule engine refuses to substitute a
missing date/locality or a different requested determination. Unverified scope
creates review warnings and does not produce wage/fringe findings from an
unrelated rate.

The original `tests/fixtures/golden/portfolio-evidence.json` is retained byte for
byte as historical evidence. Its requested `DC20240001` did not match the local
`DC-2025-001` table. The new `portfolio-evidence-v2.json` is a distinct fixture;
it must not be described as reproducing the original profile unchanged.

The separate100-example Python golden set is also immutable.94 examples lack a
week-ending date. Its evaluator explicitly uses `historical_fixture_scope=True`
to reproduce that old bounded rule profile. Neither HTTP request schemas nor
agent inputs expose that option. A passing historical golden suite does not
establish current input authority or legal correctness. Current missing/mismatched
scope regressions exercise the default strict path separately.
