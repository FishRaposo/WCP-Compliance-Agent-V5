# Portfolio handoff — WCP

## What changed (branch `feat/wcp-portfolio`)

Baseline re-verification on a fresh environment (Node 24/pnpm 9.15.0, Python
3.12.15 via uv, Poetry 1.8.5, no Docker/PG/Redis/credentials):

1. **Baseline flakes** — offline compliance-core bridge timeout (4.5s) was
   marginal on cold venvs; gateway `redis-refused` test timed out on Windows
   refused-connect (~11s). Both now tolerable/env-tunable.
2. **WC-04 durable, idempotent decision/review** — the flagship defect: a
   duplicate `job_id` **silently overwrote** the official decision. Now
   insert-or-classify → 201 created / 200 identical-replay / 409 conflict.
   Post-commit publish failure records a durable
   `decision_event_publish_failed` audit event instead of pretending delivery.
   Review override dedupes identical replays and rejects conflicting second
   reviews. Five new integration proofs incl. file-SQLite engine-restart
   durability — all on the portable profile.
3. **WC-02 rate provenance + safe abstention** — fuzzy trade→rate matches are
   now flagged (WARNING, names matched trade + WD) instead of silently
   substituted; `safeVerdict` blocks `approved` on warning-bearing coverage.
   Golden `gs-062` updated deliberately (misspelled trade → `needs_review`).

## Deferred honestly

- WC-03 decimal internals — existing float boundary behavior is consistent
  across the stack; a Decimal migration is a larger contract-versioning effort
  documented as remaining scope, not silently skipped.
- WC-05 20-PDF held-out adversarial set + real-PG/Redis integration run —
  deferred; portable profile + 100-example golden set is the current evidence.
- WC-06 guided-review visual pass — existing demo already covers queue/audit/
  analyze/analytics routes; deeper interactive scenarios remain open.
- Docker build, live LLM mode, real PG/Redis — documented boundaries.

## Evidence

`docs/portfolio-baseline.md` (gate table), `docs/supported-rule-pack.md`
(coverage/abstention semantics), `docs/portfolio-verification.md` (reproduce
commands), CHANGELOG 5.4.0.
