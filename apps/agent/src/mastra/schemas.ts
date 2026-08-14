import { z } from "zod";

/**
 * Canonical Zod schemas for the agent service.
 *
 * These mirror the cross-service contracts (`packages/contracts/schemas`) and the
 * gateway <-> agent HTTP contract. Field names are snake_case on purpose: the gateway,
 * web client, and data-platform all depend on them byte-for-byte. Do not rename.
 */

export const VerdictStatusSchema = z.enum(["approved", "rejected", "needs_review"]);
export type VerdictStatus = z.infer<typeof VerdictStatusSchema>;

export const TrustBandSchema = z.enum([
  "auto_approve",
  "flag_for_review",
  "require_human_review",
]);
export type TrustBand = z.infer<typeof TrustBandSchema>;

export const CheckStatusSchema = z.enum(["pass", "fail", "warning"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const CheckTypeSchema = z.enum([
  "wage_rate",
  "overtime",
  "fringe_benefit",
  "signature",
  "total_arithmetic",
  "classification",
  "data_integrity",
  "minimum_wage",
]);
export type CheckType = z.infer<typeof CheckTypeSchema>;

export const OverallStatusSchema = z.enum(["pass", "fail", "warnings"]);
export type OverallStatus = z.infer<typeof OverallStatusSchema>;

export const CitationSchema = z.object({
  regulation: z.string(),
  section: z.string().default(""),
  text: z.string().default(""),
});
export type Citation = z.infer<typeof CitationSchema>;

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
  total_tokens: z.number().int(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const ContractorInfoSchema = z.object({
  name: z.string(),
  address: z.string().default(""),
  ein: z.string().default(""),
});
export type ContractorInfo = z.infer<typeof ContractorInfoSchema>;

export const ProjectInfoSchema = z.object({
  name: z.string(),
  location: z.string().default(""),
  contract_number: z.string().default(""),
  wage_determination_number: z.string().default(""),
});
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;

export const EmployeeRecordSchema = z.object({
  name: z.string(),
  trade_classification: z.string(),
  hours_worked: z.number(),
  overtime_hours: z.number().default(0),
  hourly_wage: z.number(),
  fringe_benefits: z.number().default(0),
  gross_earnings: z.number(),
  deductions: z.number().default(0),
  net_wages: z.number(),
});
export type EmployeeRecord = z.infer<typeof EmployeeRecordSchema>;

export const OfflineExtractionMetadataSchema = z.object({
  noncanonical_input_issues: z.array(z.string()),
});
export type OfflineExtractionMetadata = z.infer<typeof OfflineExtractionMetadataSchema>;

export const ExtractedWCPSchema = z.object({
  job_id: z.string(),
  contractor: ContractorInfoSchema,
  project: ProjectInfoSchema,
  employees: z.array(EmployeeRecordSchema),
  certification_date: z.string().nullable().optional(),
  payroll_number: z.number().nullable().optional(),
  week_ending: z.string().nullable().optional(),
  report_id: z.string().nullable().optional(),
  artifact_id: z.string().nullable().optional(),
  offline_metadata: OfflineExtractionMetadataSchema.nullable().optional(),
});
export type ExtractedWCP = z.infer<typeof ExtractedWCPSchema>;

export const ComplianceCheckSchema = z.object({
  check_id: z.string(),
  check_type: CheckTypeSchema,
  employee_name: z.string(),
  status: CheckStatusSchema,
  expected_value: z.number().nullable().optional(),
  actual_value: z.number().nullable().optional(),
  variance: z.number().nullable().optional(),
  regulation_cite: z.string().default(""),
  message: z.string().default(""),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

export const DBWDRateRecordSchema = z.object({
  trade: z.string(),
  locality: z.string(),
  rate: z.number(),
  fringe: z.number(),
  effective_date: z.string(),
  wage_determination_number: z.string().default(""),
});
export type DBWDRateRecord = z.infer<typeof DBWDRateRecordSchema>;

export const DeterministicReportSchema = z.object({
  job_id: z.string(),
  report_id: z.string().nullable().optional(),
  artifact_id: z.string().nullable().optional(),
  checks: z.array(ComplianceCheckSchema),
  overall_status: OverallStatusSchema,
  violation_count: z.number().int(),
  warning_count: z.number().int(),
  passed_count: z.number().int().nullable().optional(),
  dbwd_rates_used: z.array(DBWDRateRecordSchema).default([]),
  confidence_inputs: z.record(z.string(), z.number()).nullable().optional(),
});
export type DeterministicReport = z.infer<typeof DeterministicReportSchema>;

/**
 * The structured output the verdict agent must emit. This is the schema handed to
 * Mastra's `structuredOutput` option, so the model is constrained to it.
 */
export const LLMVerdictSchema = z.object({
  verdict: VerdictStatusSchema,
  reasoning: z.string(),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
  referenced_check_ids: z.array(z.string()).min(1),
});
export type LLMVerdict = z.infer<typeof LLMVerdictSchema>;

export const TrustScoredDecisionSchema = z.object({
  job_id: z.string(),
  verdict: VerdictStatusSchema,
  trust_score: z.number().min(0).max(1),
  trust_band: TrustBandSchema,
  requires_human_review: z.boolean(),
  violation_count: z.number().int(),
  warning_count: z.number().int(),
  llm_confidence: z.number(),
  reasoning_summary: z.string(),
  citations: z.array(CitationSchema),
  cost_usd: z.number().nullable().optional(),
  latency_ms: z.number().int().nullable().optional(),
  step_latencies: z
    .object({
      extract_ms: z.number().int().nullable().optional(),
      validate_ms: z.number().int().nullable().optional(),
      verdict_ms: z.number().int().nullable().optional(),
      trust_ms: z.number().int().nullable().optional(),
      persist_ms: z.number().int().nullable().optional(),
    })
    .optional(),
  phoenix_trace_id: z.string().optional(),
  created_at: z.string().optional(),
});
export type TrustScoredDecision = z.infer<typeof TrustScoredDecisionSchema>;

/** Request body for POST /internal/workflows/wcp-pipeline */
export const PipelineRequestSchema = z.object({
  text: z.string().min(1),
  job_id: z.string().optional(),
  prompt_version: z.string().optional(),
});
export type PipelineRequest = z.infer<typeof PipelineRequestSchema>;
