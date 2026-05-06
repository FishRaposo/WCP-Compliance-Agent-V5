import { describe, it, expect } from "vitest";
import {
  computeTrustComponents,
  computeTrustScore,
  determineTrustBand,
  safeVerdict,
} from "../../src/agents/trust-score.js";
import type { DeterministicReport, LLMVerdict } from "../../src/types.js";

function makeDeterministic(overrides: Partial<DeterministicReport> = {}): DeterministicReport {
  return {
    job_id: "test-001",
    report_id: "rpt-001",
    artifact_id: undefined,
    checks: [
      {
        check_id: "wage_test",
        check_type: "wage_rate",
        employee_name: "John",
        status: "pass",
        message: "Pass",
        regulation_cite: "test",
        expected_value: 51.69,
        actual_value: 55.0,
        variance: 3.31,
      },
      {
        check_id: "ot_test",
        check_type: "overtime",
        employee_name: "John",
        status: "pass",
        message: "No OT",
      },
    ],
    overall_status: "pass",
    violation_count: 0,
    warning_count: 0,
    passed_count: 2,
    dbwd_rates_used: [],
    ...overrides,
  };
}

function makeVerdict(overrides: Partial<LLMVerdict> = {}): LLMVerdict {
  return {
    job_id: "test-001",
    verdict: "approved",
    reasoning: "All good",
    citations: [],
    confidence: 0.95,
    referenced_check_ids: ["wage_test"],
    rag_context_used: false,
    model: "gpt-4o-mini",
    prompt_version: "v1",
    langfuse_trace_id: "",
    token_usage: undefined,
    ...overrides,
  };
}

describe("trust-score", () => {
  describe("computeTrustComponents", () => {
    it("returns 0.35 for deterministic when no violations", () => {
      const det = makeDeterministic();
      const ver = makeVerdict();
      const comps = computeTrustComponents(det, ver);
      expect(comps.deterministic).toBeCloseTo(0.35);
    });

    it("returns lower deterministic when violations present", () => {
      const det = makeDeterministic({ violation_count: 1, checks: [...makeDeterministic().checks] });
      const ver = makeVerdict();
      const comps = computeTrustComponents(det, ver);
      expect(comps.deterministic).toBeLessThan(0.35);
    });

    it("returns agreement=0 when violations but LLM approves", () => {
      const det = makeDeterministic({ violation_count: 3 });
      const ver = makeVerdict({ verdict: "approved" });
      const comps = computeTrustComponents(det, ver);
      expect(comps.agreement).toBe(0);
    });

    it("returns agreement=0.20 when no violations and LLM approves", () => {
      const det = makeDeterministic({ violation_count: 0 });
      const ver = makeVerdict({ verdict: "approved" });
      const comps = computeTrustComponents(det, ver);
      expect(comps.agreement).toBeCloseTo(0.20);
    });

    it("returns agreement=0.10 when ambiguous", () => {
      const det = makeDeterministic({ violation_count: 0 });
      const ver = makeVerdict({ verdict: "rejected" });
      const comps = computeTrustComponents(det, ver);
      expect(comps.agreement).toBeCloseTo(0.10);
    });
  });

  describe("computeTrustScore", () => {
    it("clamps to 1.0 max", () => {
      const score = computeTrustScore({ deterministic: 0.5, classification: 0.5, llm_self: 0.5, agreement: 0.5 });
      expect(score).toBe(1.0);
    });

    it("returns 0 for all-zero components", () => {
      const score = computeTrustScore({ deterministic: 0, classification: 0, llm_self: 0, agreement: 0 });
      expect(score).toBe(0);
    });

    it("sums components correctly", () => {
      const score = computeTrustScore({ deterministic: 0.3, classification: 0.1, llm_self: 0.2, agreement: 0.15 });
      expect(score).toBeCloseTo(0.75);
    });
  });

  describe("determineTrustBand", () => {
    it("auto_approve at 0.85+", () => {
      expect(determineTrustBand(0.85)).toBe("auto_approve");
      expect(determineTrustBand(0.95)).toBe("auto_approve");
    });

    it("flag_for_review at 0.60-0.84", () => {
      expect(determineTrustBand(0.60)).toBe("flag_for_review");
      expect(determineTrustBand(0.75)).toBe("flag_for_review");
    });

    it("require_human_review below 0.60", () => {
      expect(determineTrustBand(0.50)).toBe("require_human_review");
      expect(determineTrustBand(0)).toBe("require_human_review");
    });
  });

  describe("safeVerdict", () => {
    it("overrides approved to rejected when violations exist", () => {
      const det = makeDeterministic({ violation_count: 3 });
      const ver = makeVerdict({ verdict: "approved" });
      expect(safeVerdict(det, ver)).toBe("rejected");
    });

    it("passes through when no violations and approved", () => {
      const det = makeDeterministic({ violation_count: 0 });
      const ver = makeVerdict({ verdict: "approved" });
      expect(safeVerdict(det, ver)).toBe("approved");
    });

    it("passes through when verdict is needs_review", () => {
      const det = makeDeterministic({ violation_count: 3 });
      const ver = makeVerdict({ verdict: "needs_review" });
      expect(safeVerdict(det, ver)).toBe("needs_review");
    });
  });
});
