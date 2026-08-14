import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  AuditEventSchema,
  ContractSchema,
  DecisionRecordSchema,
  DeterministicReportSchema,
  ExtractedWCPSchema,
  IngestionJobSchema,
  PipelineEventSchema,
  TraceContextSchema,
  CostLatencySchema,
  EvidenceManifestSchema,
  PayrollRecordSchema,
  TrustScoredDecisionSchema,
} from "../generated/typescript/index.js";
import { attachPipelineMetadata, createPipelineEvent } from "../adapters.js";

const schemas: [string, z.ZodTypeAny][] = [
  ["AuditEventSchema", AuditEventSchema],
  ["ContractSchema", ContractSchema],
  ["DecisionRecordSchema", DecisionRecordSchema],
  ["DeterministicReportSchema", DeterministicReportSchema],
  ["ExtractedWCPSchema", ExtractedWCPSchema],
  ["IngestionJobSchema", IngestionJobSchema],
  ["PipelineEventSchema", PipelineEventSchema],
  ["TraceContextSchema", TraceContextSchema],
  ["CostLatencySchema", CostLatencySchema],
  ["EvidenceManifestSchema", EvidenceManifestSchema],
  ["PayrollRecordSchema", PayrollRecordSchema],
  ["TrustScoredDecisionSchema", TrustScoredDecisionSchema],
];

describe("Schema validation", () => {
  it.each(schemas)("%s is a valid ZodObject", (_name, schema) => {
    expect(schema).toBeDefined();
    expect(schema._def.typeName).toBe("ZodObject");
  });

  it("all 12 schemas are defined", () => {
    expect(schemas).toHaveLength(12);
  });

  it("accepts versioned additive pipeline metadata without changing legacy decision fields", () => {
    expect(
      TraceContextSchema.safeParse({ schema_version: "v1", request_id: "req-001", trace_id: "trace-001" })
        .success,
    ).toBe(true);
    expect(
      CostLatencySchema.safeParse({ schema_version: "v1", cost_usd: 0.002, latency_ms: 125 }).success,
    ).toBe(true);
    expect(
      EvidenceManifestSchema.safeParse({
        schema_version: "v1",
        artifact_id: "artifact-001",
        entries: [{ name: "deterministic-report.json", sha256: "a".repeat(64) }],
      }).success,
    ).toBe(true);
    expect(
      PipelineEventSchema.safeParse({
        schema_version: "v1",
        event_type: "validation_complete",
        job_id: "job-001",
        trace_context: { request_id: "req-001" },
      }).success,
    ).toBe(true);
  });

  it("adapts legacy payloads additively without changing their values or enum strings", () => {
    const legacy = { job_id: "job-001", verdict: "approved", trust_band: "auto_approve" };
    const adapted = attachPipelineMetadata(legacy, {
      trace_context: { schema_version: "v1", request_id: "req-001" },
    });

    expect(adapted).toMatchObject(legacy);
    expect(adapted.trace_context).toEqual({ schema_version: "v1", request_id: "req-001" });
    expect(
      createPipelineEvent({ schema_version: "v1", event_type: "decision_persisted", job_id: "job-001" }),
    ).toMatchObject({ event_type: "decision_persisted", job_id: "job-001" });
  });

  it("AuditEventSchema requires id, job_id, event_type, created_at", () => {
    const result = AuditEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("ExtractedWCPSchema requires job_id, contractor, project, employees", () => {
    const result = ExtractedWCPSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DeterministicReportSchema requires checks, overall_status, violation_count, warning_count", () => {
    const result = DeterministicReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DeterministicReportSchema accepts a report without report_id or artifact_id", () => {
    const result = DeterministicReportSchema.safeParse({
      checks: [],
      overall_status: "pass",
      violation_count: 0,
      warning_count: 0,
    });
    expect(result.success).toBe(true);
  });

  it("AuditEventSchema accepts the Data Platform audit-event response", () => {
    const result = AuditEventSchema.safeParse({
      id: "evt-001",
      job_id: "job-001",
      event_type: "decision_persisted",
      actor: "system",
      payload: {},
      regulation_references: [],
      trace_id: "trace-001",
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("TrustScoredDecisionSchema requires the trust-scored agent decision payload", () => {
    const result = TrustScoredDecisionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DecisionRecordSchema requires the data platform decision response payload", () => {
    const result = DecisionRecordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("TrustScoredDecisionSchema accepts the Agent trust-scored decision sent for persistence", () => {
    const result = TrustScoredDecisionSchema.safeParse({
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.92,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      reasoning_summary: "All checks passed.",
      citations: [],
      cost_usd: 0,
      latency_ms: 125,
      phoenix_trace_id: "trace-001",
    });

    expect(result.success).toBe(true);
  });

  it("DecisionRecordSchema accepts the Data Platform decision response", () => {
    const result = DecisionRecordSchema.safeParse({
      id: "dec-001",
      job_id: "job-001",
      verdict: "approved",
      trust_score: 0.92,
      trust_band: "auto_approve",
      requires_human_review: false,
      violation_count: 0,
      warning_count: 0,
      reasoning_summary: "All checks passed.",
      citations: [],
      cost_usd: 0,
      latency_ms: 125,
      phoenix_trace_id: "trace-001",
      contract_id: "ctr-001",
      created_at: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("PayrollRecordSchema requires employee_name, trade_code, week_ending, hours_worked, hourly_rate, gross_pay", () => {
    const result = PayrollRecordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("IngestionJobSchema requires id, type, status", () => {
    const result = IngestionJobSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("ContractSchema requires contract_number, project_name, contractor_name, locality", () => {
    const result = ContractSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
