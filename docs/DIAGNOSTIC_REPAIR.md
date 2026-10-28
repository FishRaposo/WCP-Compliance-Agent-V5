# Diagnostic repair candidate — 2026-10-28

This branch fixes reproduced contract and review-state boundaries; connected
browser acceptance remains pending. No live provider credential or generative
model was used.

- Compliance Core now routes `/internal/extract` and `/internal/validate`
  through the same offline bridge and deterministic rule engine as
  `validate_wcp`, so text and structured paths agree. Explicit
  "No Work Performed" payrolls are valid without employee rows when payroll
  number, week-ending and certification fields are present; genuinely
  noncanonical input fails closed with `offline_input_completeness` warnings.
- Data Platform review state is derived and atomic: `requires_human_review=true`
  means "still awaiting a human outcome" (explicit flag or unresolved pending
  verdict), and `trust_band=require_human_review` selects both review bands
  including legacy `flag_for_review` rows. Overrides require terminal verdicts
  (`needs_review` returns 422), use compare-and-set on the actionable state,
  return the recorded review for identical retries, and reject conflicting
  re-reviews with 409.
- A missing event broker no longer drops evidence silently: the durable
  `decision_event_publish_failed` audit event records the outage.
- Gateway review identity comes from the verified auth context, never the
  request body; decision responses expose normalized `decision_id`; upstream
  conflicts surface as meaningful statuses. The web review queue requests the
  derived pending filter.
- The committed normalized golden evidence fixture
  (`tests/fixtures/golden/portfolio-evidence-v2.json`) was missing and broke
  the committed-fixture test and `pnpm evidence` on fresh clones; it is now
  generated deterministically and committed.

Verification: compliance-core 194 pytest, data-platform 103 (+5 skipped) pytest,
agent 70 vitest, gateway 48 vitest, web 30 vitest, contracts 42 vitest; Ruff and
mypy clean on both Python services; tsc and eslint clean on all TypeScript
packages.

Open acceptance includes the connected multi-service run, browser checks, and
hosted CI.
