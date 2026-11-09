# Smell — WCP Compliance Agent V5

**Date:** 2026-11-08  
**Mode:** smell  
**Scope:** the shared console shell, dashboard, role pages, analytics and login.  
**Register:** Product / compliance console.

## Verdict

**CLEAN — 10/10.** The generic indigo AI dashboard is gone. The surface now reads as an ink-and-brass audit ledger: deterministic authority first, a posture strip, numbered command entries and dense evidence views. No open tells.

## Score

| # | Odor | Score | Evidence |
|---|---|---|---|
| 1 | Tech gradient | 1 | No indigo→purple→pink; solid brass accent only. |
| 2 | Generic tech hue | 1 | Ink green, brass, warm neutral and status colors tied to a compliance console. |
| 3 | Feature tile grid | 1 | Numbered command ledger; no equal icon-feature cards. |
| 4 | Accent rail | 1 | Brass rules mark the posture column and ledger entries; they encode structure. |
| 5 | Unearned blur | 1 | Glass/blur removed; solid ink surfaces. |
| 6 | Stat monument | 1 | Counts are a compact audit-posture ledger, not a hero monument. |
| 7 | Icon topper | 1 | No decorative icon grid; icons only label actions/status. |
| 8 | Bounce everywhere | 1 | Reduced-motion rule; no pulse/glow; short state transitions. |
| 9 | Default type | 1 | System sans is appropriate for an operator console; hierarchy comes from scale and density. |
| 10 | Center stack | 1 | Left-aligned audit brief and ledger composition. |
| | **Total** | **10/10** | No confirmed tells. |

## Resolved tells

| Tell | Where it was | Replacement |
|---|---|---|
| Indigo/purple glow and holographic shield | Dashboard hero | Audit brief + posture ledger |
| Glass panels and gradient buttons | Shared utilities | Solid ink surfaces, solid brass accent |
| Equal five-card launchpad | Dashboard | Numbered command strip |
| 9–11px labels | Dashboard, tables, filters | 12–14px technical labels |
| Missing mobile navigation | Layout shell | Native mobile details menu |

## What is working

- The visible h1 names the decision rule, not the product category: "Payroll compliance, decided before the model speaks."
- The posture ledger shows passing audits, average trust and decisions in the same first read.
- The command strip reads as an index of audit views, not a marketing feature grid.
- The palette and density are specific to an audit console; status colors retain labels and text.
- The mobile menu exposes every route without turning the console into a card stack.

## Considered but rejected

| Location | Candidate | Rejected because |
|---|---|---|
| Charts | Remove all telemetry | The charts are operator context; contrast and labels now pass. |
| Status colors | Reduce to one hue | Status hue is a secondary cue beside text labels; removing it would weaken scanning. |
| System sans | Add a serif display face | Product register favors plain sans; identity lives in the ledger structure and palette. |
| Dark surface | Switch the console to light paper | Operators use this as an instrument; the ink surface reduces glare and preserves chart contrast. |

## Prompt fidelity

Name exact. Category visible. User pressure (audit/review under time) named. Artifact (payroll, findings, rule/source, decision) present. Evidence (deterministic checks, trust, tests) present. A swap to an unrelated SaaS would fail immediately.

## Verification

**Run:** rendered every route; inspected computed palette, type, targets and heading count; axe every route; mobile disclosure; performance. No open tell. Not verified: live provider-backed data and a screen-reader session.
