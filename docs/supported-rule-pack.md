# Supported rule pack — demonstration scope

**Status: demonstration fixture, not authoritative regulatory coverage.**

## Coverage

| Dimension | Value | Status |
|---|---|---|
| Form variant | WH-347-style certified payroll text/PDF | Synthetic fixtures only |
| Locality | Washington, DC | Only supported locality |
| Rate corpus | 15 trades, in-memory `_FALLBACK_CORPUS` | Synthetic rates frozen at effective_date 2025-01-01, WD `DC-2025-001` — **not** a live or authoritative Davis-Bacon determination |
| Interpretation | Deterministic wage/fringe/overtime/signature/integrity rules | See `wcp_compliance/rules/engine.py` + `checks/` |

## Abstention semantics (pinned by tests)

- **Unknown trade classification** → `classification_*` check FAIL → verdict `rejected`.
- **Locality/date outside the corpus** → WARNING → verdict `needs_review` (unverified coverage abstains; `safeVerdict` blocks `approved` even if the model proposes it).
- **Approximate (fuzzy) trade match** → rate used **and** a WARNING check records requested-vs-matched trade + WD number → `needs_review`. A near-match is never silently substituted.
- **Deterministic FAIL** → cannot become anything but `rejected`, regardless of model output.
- Missing/ambiguous governing rates can never produce `approved`.

## Provenance

`DeterministicReport.dbwd_rates_used` carries every applied `DBWDRateRecord`
(trade, locality, rate, fringe, effective_date, wage_determination_number), and
each `ComplianceCheck` carries its `regulation_cite`. The demo must show these
references; nothing in the UI should imply live DBWD coverage.

## Deliberate interpretation changes (2026-10-24)

- gs-062 (misspelled trade) now expects `needs_review` — approximate
  classification is treated as unverified coverage (WC-02), not silent approval.
