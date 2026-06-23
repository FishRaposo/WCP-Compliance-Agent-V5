/**
 * Web API types — re-exported from the shared `@wcp/contracts` package (the single source of
 * truth for cross-service shapes). The web no longer hand-declares these, which keeps it in
 * lock-step with the gateway contract and eliminates the field drift we used to hit (e.g.
 * `DecisionSummary` missing `reasoning_summary` / `citations`).
 *
 * `export *` re-exports both the inferred types and the underlying Zod schemas, so components
 * can also validate payloads at runtime against the same contract when useful.
 */
export * from "@wcp/contracts";
