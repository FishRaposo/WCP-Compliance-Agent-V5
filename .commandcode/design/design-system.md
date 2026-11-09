# Design system — WCP Compliance Agent V5

**Register:** Product / compliance console. **Direction:** ink-and-brass audit ledger.

## Tokens

| Role | Value |
|---|---|
| Canvas | `#0c1410` |
| Raised surface / sidebar | `#111a15` / `#101a14` |
| Ink | `#f1ede4` |
| Body / secondary | `#d8cdbb` |
| Muted / technical | `#9c8b73` |
| Brass accent | `#a97c3f` |
| Brass action | `#8a6a33` |
| Brass rule | `#9a743c` |
| Destructive | `#8f3a2c` |
| Focus ring | `hsl(38 46% 45%)` |
| Border | `hsl(148 14% 19%)` |
| Radius | 0.4rem; cards 0.75rem |

**Type:** system sans (`ui-sans-serif`), body 14/16px, technical labels 12px, page h1 30–36px, h2 18–24px. **Targets:** 44px minimum on buttons, inputs, selects, nav links and tabs. **Mobile inputs:** 16px to prevent iOS focus zoom.

## Composition

- Shell: 256px desktop audit rail; mobile native `details` menu with all routes.
- Dashboard: audit brief → posture ledger → numbered command strip → decision-volume chart → telemetry → recent audit ledger.
- Page pattern: one h1, short purpose line, filters/actions, evidence table/list, detail drawer.
- Charts: brass data, 12px axis labels, restrained grid; status is text + color.
- Login: utility card, one h1, one action; no marketing hero.

## States and interaction

Buttons/inputs/selects share 44px primitives. Focus-visible rings at 2px; skip link; mobile menu links close on selection; dialogs are native/focus-managed; empty/error/loading states remain on each page; telemetry is `role="status" aria-live="polite"`; disabled states use explicit surfaces rather than opacity alone.

## Motion and access

No glow, parallax or pulse; short state transitions; `prefers-reduced-motion` sets animation/transition to 0.01ms; no autoplay. Axe WCAG 2A/AA 0 on all 12 routes at 390/1440; 320px no overflow; one h1 per route; 16px mobile form text.

## Module record

| Module | Result |
|---|---|
| setup | Brief created with user, job, artifact, evidence and refused drift. |
| checkup | 60/60; all vitals healthy. |
| smell | 10/10; indigo/glass/glow tells removed. |
| review | 50/50; no open findings. |
| deslop | Removed gradient, glass blur, glow, holographic shield and stat monument. |
| typeset | 12–14px technical scale; 16px mobile controls. |
| recolor | Ink/brass ledger palette with accessible primary/destructive foregrounds. |
| motion | Removed pulse/glow; reduced-motion rule. |
| interaction | Native mobile menu, named filters, 44px primitives, skip link. |
| a11y | Axe 0 every route; one h1; focus; aria-live; 16px mobile inputs. |
| relayout | Audit brief + posture ledger + numbered command strip. |
| responsive | 12 routes at 320/390/1440; no overflow. |
| tokenize | Tailwind brass/neutral scales and UI primitives. |
| finish | Typecheck, lint, build, 33 tests, 2 E2E, LCP 636/284ms, CLS 0. |
| refine | Dense operator console with ledger hierarchy. |
| voice | Deterministic authority; evidence before explanation. |
| surface | Loading/empty/error/disabled/drawer/mobile states reviewed. |
| redesign | Applied to shell, dashboard hero, command strip and login. |

## Evidence map

`apps/web/src/index.css`, `components/Layout.tsx`, `pages/Dashboard.tsx`, `pages/Login.tsx`, `components/ui/*`, `tailwind.config.ts`, `tests/e2e/portfolio-smoke.spec.ts`, `.commandcode/design/*`.
