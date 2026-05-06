# Architecture Decision Records

| # | Title | Status | Summary |
|---|---|---|---|
| 0001 | V5 Service Split | Accepted | Split monorepo into five services: Web, Gateway, Agent, Compliance Core, Data Platform. Each gets a distinct failure mode and reason to change. |
| 0002 | Agent Does Not Persist Decisions | Accepted | Agent returns `TrustScoredDecision` objects; Data Platform creates official `DecisionRecord`. Agent never imports SQLAlchemy or connects to PostgreSQL. |
| 0003 | Data Platform Owns Decision Records | Accepted | Data Platform is the single source of truth for all persisted data. No other service writes to the database. Audit events are created atomically with decisions. |
| 0004 | Compliance Core Owns Deterministic Truth | Accepted | All wage validation, DBWD rate lookup, and deterministic checks run in Compliance Core. The LLM adds explanation and context, not correctness. |
| 0005 | DBWD Rate Ownership | Accepted | DBWD rates are stored in Data Platform (dbwd_rates table), but Compliance Core performs the in-memory matching and fuzzy lookup. Eventually, Compliance Core will query Data Platform for rates. |
| 0006 | Monorepo with Turborepo | Accepted | Single monorepo managed by Turborepo + pnpm workspaces. Shared packages in `packages/`. Services in `apps/`. TypeScript and Python services co-exist with their own toolchains. |
| 0007 | Trust Score Weights | Proposed | Adopt Python weights (35/25/20/20) as single source of truth. Align TypeScript implementation to match. Documented in golden-set evaluation. |
