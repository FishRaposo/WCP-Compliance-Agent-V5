import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  AuditEventSchema,
  ContractSchema,
  DecisionDraftSchema,
  DecisionRecordSchema,
  DeterministicReportSchema,
  ExtractedWCPSchema,
  IngestionJobSchema,
  PayrollRecordSchema,
} from "../generated/typescript/index.js";

const schemas: [string, z.ZodTypeAny][] = [
  ["AuditEventSchema", AuditEventSchema],
  ["ContractSchema", ContractSchema],
  ["DecisionDraftSchema", DecisionDraftSchema],
  ["DecisionRecordSchema", DecisionRecordSchema],
  ["DeterministicReportSchema", DeterministicReportSchema],
  ["ExtractedWCPSchema", ExtractedWCPSchema],
  ["IngestionJobSchema", IngestionJobSchema],
  ["PayrollRecordSchema", PayrollRecordSchema],
];

describe("Schema validation", () => {
  it.each(schemas)("%s is a valid ZodObject", (_name, schema) => {
    expect(schema).toBeDefined();
    expect(schema._def.typeName).toBe("ZodObject");
  });

  it("all 8 schemas are defined", () => {
    expect(schemas).toHaveLength(8);
  });

  it("AuditEventSchema requires event_id, decision_id, event_type, timestamp", () => {
    const result = AuditEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("ExtractedWCPSchema requires job_id, contractor, project, employees", () => {
    const result = ExtractedWCPSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DeterministicReportSchema requires report_id, artifact_id, checks, overall_status, violation_count, warning_count", () => {
    const result = DeterministicReportSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DecisionDraftSchema requires request_id, artifact_id, deterministic_report_id, verdict, summary, issues, trust_score, trust_band", () => {
    const result = DecisionDraftSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("DecisionRecordSchema requires decision_id, request_id, artifact_id, verdict, trust_score, trust_band, created_at", () => {
    const result = DecisionRecordSchema.safeParse({});
    expect(result.success).toBe(false);
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
