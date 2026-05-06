import { describe, it, expect } from "vitest";
import {
  ExtractedWCPSchema,
  DeterministicReportSchema,
  TrustScoredDecisionSchema,
  LLMVerdictSchema,
  CitationSchema,
  VerdictStatusSchema,
  TrustBandSchema,
} from "../../src/types.js";

describe("types", () => {
  describe("VerdictStatusSchema", () => {
    it("accepts valid statuses", () => {
      expect(VerdictStatusSchema.parse("approved")).toBe("approved");
      expect(VerdictStatusSchema.parse("rejected")).toBe("rejected");
      expect(VerdictStatusSchema.parse("needs_review")).toBe("needs_review");
    });

    it("rejects invalid status", () => {
      expect(() => VerdictStatusSchema.parse("invalid")).toThrow();
    });
  });

  describe("TrustBandSchema", () => {
    it("accepts valid bands", () => {
      expect(TrustBandSchema.parse("auto_approve")).toBe("auto_approve");
      expect(TrustBandSchema.parse("flag_for_review")).toBe("flag_for_review");
      expect(TrustBandSchema.parse("require_human_review")).toBe("require_human_review");
    });
  });

  describe("CitationSchema", () => {
    it("parses valid citation", () => {
      const citation = CitationSchema.parse({ regulation: "40 U.S.C. § 3142" });
      expect(citation.regulation).toBe("40 U.S.C. § 3142");
      expect(citation.section).toBe("");
      expect(citation.text).toBe("");
    });
  });

  describe("ExtractedWCPSchema", () => {
    it("parses valid extracted WCP", () => {
      const data = {
        job_id: "job-001",
        contractor: { name: "TestCo", address: "123 St", ein: "12-3456789" },
        project: { name: "Test", location: "DC", contract_number: "C-001", wage_determination_number: "WD-001" },
        employees: [{
          name: "John", trade_classification: "Electrician",
          hours_worked: 40, overtime_hours: 0, hourly_wage: 55.0,
          fringe_benefits: 1400.0, gross_earnings: 2200.0,
          deductions: 150.0, net_wages: 2050.0,
        }],
      };
      const result = ExtractedWCPSchema.parse(data);
      expect(result.job_id).toBe("job-001");
    });
  });

  describe("TrustScoredDecisionSchema", () => {
    it("parses valid decision", () => {
      const data = {
        job_id: "job-001",
        verdict: "approved",
        trust_score: 0.95,
        trust_band: "auto_approve",
        requires_human_review: false,
        violation_count: 0,
        warning_count: 0,
        llm_confidence: 0.95,
        reasoning_summary: "All checks passed",
        citations: [{ regulation: "40 U.S.C. § 3142", section: "", text: "" }],
        cost_usd: 0.01,
        latency_ms: 500,
        phoenix_trace_id: "trace-123",
        created_at: "2025-01-01T00:00:00Z",
      };
      const result = TrustScoredDecisionSchema.parse(data);
      expect(result.verdict).toBe("approved");
      expect(result.trust_band).toBe("auto_approve");
    });
  });
});
