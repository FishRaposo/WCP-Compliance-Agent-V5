# Checkup — WCP Compliance Agent V5

**Date:** 2026-11-08  
**Mode:** checkup  
**Scope:** dashboard plus `/analyze`, `/decisions`, `/review`, `/contracts`, `/payrolls`, `/ingestion`, four analytics views, `/settings` and `/login`; desktop and mobile.  
**Register:** Product / compliance console.  
**Evidence:** production build with mock API; Playwright at 1440×900, 390×844 and 320×800; axe WCAG 2A/AA on every route; keyboard/mobile menu; target/overflow/heading measurements; LCP/CLS.

## Verdict

**APPROVE — 60/60.** Every route has one h1, zero axe violations, zero horizontal overflow at 320/390, no targets under 44px, and a working mobile navigation disclosure. The audit-first composition and ink/brass ledger language are now specific to the work.

## Score

| # | Vital | Status | Score | Evidence |
|---|---|---|---|---|
| 1 | Intentionality | Healthy | 10/10 | Ink/brass audit ledger, numbered command strip, deterministic-authority headline, no AI gradient or glass. |
| 2 | Readability | Healthy | 10/10 | 16px form controls, 12–14px technical labels, clear h1/h2 hierarchy, axe-clean contrast. |
| 3 | Usability | Healthy | 10/10 | One audit brief, five ledger entry points, mobile menu, named filters, working primary flow. |
| 4 | Responsiveness | Healthy | 10/10 | 12 routes at 320/390/1440: no overflow, one h1, zero small targets. |
| 5 | Speed | Healthy | 10/10 | Production preview LCP 636ms desktop / 284ms mobile; CLS 0 / 0.0002; 7 requests. |
| 6 | Accessibility | Healthy | 10/10 | Axe 0 on every route; skip link; focus rings; 44px buttons/inputs/selects; mobile disclosure; aria-live telemetry. |
| | **Total** | | **60/60** | No open findings. |

## Composition and prompt fidelity

The first viewport now names the WH-347 audit, states that deterministic code decides before the model speaks, and puts passing/trust/decision counts in an audit-posture ledger. The five command entries read as a ledger index, not a generic launchpad. The work shape is monitor + operate: status, findings, queue, contracts, ledgers and analytics are all reachable from the same shell.

## Findings

**No open findings.** Resolved in this pass:

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `Layout.tsx` + pages | Sidebar `h1` plus page `h1` gave two primary headings | Sidebar brand is a `<p>`; each route has one h1 | Heading structure must identify the page |
| 2 | HIGH | Accessibility | `Layout.tsx` | Sidebar vanished below 768px with no navigation | Native mobile `details` menu with every route and 44px links | Mouse-only desktop navigation stranded phone users |
| 3 | HIGH | Color | palette + `index.css` | 26 contrast failures on gray labels, primary tabs and destructive badges | Ink/brass neutral ramp, dark primary foreground, darker destructive fill; axe 0 | Text and state must meet contrast |
| 4 | HIGH | Accessibility | Decisions/Payrolls selects | Radix combobox triggers had no accessible names | `aria-label` on trust/trade/locality filters | Icon/placeholder-only triggers announced no purpose |
| 5 | MEDIUM | Interaction | UI primitives | Buttons/inputs/selects were 32–40px | 44px minimum on button, input and select primitives | Touch targets need a physical floor |
| 6 | MEDIUM | Composition | Dashboard hero | Indigo/purple glow, holographic shield, stat-monument hero | Audit brief with posture ledger; solid ink surface | The first read should be the compliance decision |
| 7 | MEDIUM | Composition | Shared palette/utilities | Gradient buttons, glass blur, text glow, pulsing shield | Solid brass accent, solid surfaces, no glow/pulse | Generic AI-dashboard tells obscured the domain |
| 8 | MEDIUM | Structure | Login | No h1 | WCP Compliance is the page h1 | The sign-in surface needs a primary heading |
| 9 | LOW | Accessibility | Live telemetry banner | New decision text was not announced | `role="status"` + `aria-live="polite"` | A monitoring surface should announce change |
| 10 | LOW | Motion | Global CSS | No reduced-motion policy | Reduced-motion rule; mobile controls 16px | Motion preference and iOS focus zoom need an explicit floor |

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| Desktop sidebar | Replace with top navigation | The sidebar keeps the 9-item console stable; mobile uses a native disclosure |
| Dashboard charts | Remove charts entirely | Decision volume is useful operator context and the labels/contrast now pass |
| Amber/rose/emerald badges | Force all statuses to brass | Status color carries meaning; text labels and badges remain the redundant cue |
| System sans | Introduce a display serif inside the console | Product register favors a plain reading sans; the ledger language carries the identity |
| Login | Add a marketing hero | Login is a utility surface; one clear h1 and one action are enough |

## Verification

**Run:** production build with mock API; Playwright on 12 routes at 390 and 1440; axe WCAG 2A/AA on every route; 320 overflow check; heading count; target measurement; mobile details open/close; keyboard focus; `pnpm --filter @wcp/web typecheck`, `lint`, `build` and `test` (33/33); root Playwright smoke (2/2); performance observer. **Observed:** no failures; axe 0; one h1 per route; scrollWidth=clientWidth; zero small targets; LCP 636/284ms; CLS 0/0.0002. **Not verified:** a real screen-reader session; live provider-backed mode; production hosting latency.

## Next modes

No in-product design work remains. Keep the primitives and tokens as the contract; new screens should reuse the audit brief, posture ledger and command-strip patterns.
