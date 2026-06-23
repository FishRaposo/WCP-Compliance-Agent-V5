import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../src/schemas.js";
import { apiContract } from "../src/contract.js";
import { buildOpenApi } from "../src/openapi.js";

describe("contract schemas (single source of truth)", () => {
  it("TrustScoredDecision parses a valid decision", () => {
    const d = S.TrustScoredDecision.parse({
      job_id: "j",
      verdict: "approved",
      trust_score: 0.9,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      reasoning_summary: "All checks passed.",
      citations: [],
    });
    expect(d.verdict).toBe("approved");
  });

  it("DecisionSummary carries reasoning_summary + citations (the field set web depends on)", () => {
    const s = S.DecisionSummary.parse({
      decision_id: "d",
      job_id: "j",
      verdict: "rejected",
      trust_score: 0.5,
      trust_band: "flag_for_review",
      requires_human_review: false,
      violation_count: 1,
      warning_count: 0,
      reasoning_summary: "Wage below prevailing rate.",
      citations: [{ regulation: "29 CFR 5.5", section: "", text: "" }],
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(s.citations?.[0]?.regulation).toBe("29 CFR 5.5");
  });

  it("ReviewRequest rejects an empty reviewer", () => {
    expect(S.ReviewRequest.safeParse({ verdict: "approved", reviewer: "" }).success).toBe(false);
    expect(S.ReviewRequest.safeParse({ verdict: "approved", reviewer: "auditor@x.com" }).success).toBe(true);
  });
});

describe("ts-rest contract + OpenAPI", () => {
  it("exposes the core public routes", () => {
    expect(Object.keys(apiContract)).toEqual(
      expect.arrayContaining(["analyze", "listDecisions", "getDecision", "reviewDecision"]),
    );
  });

  it("the committed generated/openapi.json matches the contract (drift guard)", () => {
    const committed = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../generated/openapi.json"), "utf8"),
    );
    expect(buildOpenApi()).toEqual(committed);
  });
});
