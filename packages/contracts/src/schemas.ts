import { z } from "zod";

/**
 * The single source of truth for the cross-service data shapes (DTOs). Every TypeScript
 * service imports these Zod schemas / inferred types from `@wcp/contracts` instead of
 * re-declaring them, which is what eliminates the drift the old codegen allowed. The OpenAPI
 * document (and, in CI, the Python Pydantic models) are generated from these via the ts-rest
 * contract — see `contract.ts` and `openapi.ts`.
 */

export const VerdictStatus = z.enum(["approved", "rejected", "needs_review"]);
export type VerdictStatus = z.infer<typeof VerdictStatus>;

export const TrustBand = z.enum(["auto_approve", "flag_for_review", "require_human_review"]);
export type TrustBand = z.infer<typeof TrustBand>;

export const ContractStatus = z.enum(["active", "completed", "terminated", "suspended"]);
export type ContractStatus = z.infer<typeof ContractStatus>;

export const Citation = z.object({
  regulation: z.string(),
  section: z.string().default(""),
  text: z.string().default(""),
});
export type Citation = z.infer<typeof Citation>;

/** The agent's trust-scored decision (also the body persisted to the Data Platform). */
export const TrustScoredDecision = z.object({
  job_id: z.string(),
  verdict: VerdictStatus,
  trust_score: z.number().min(0).max(1),
  trust_band: TrustBand,
  requires_human_review: z.boolean(),
  violation_count: z.number().int(),
  warning_count: z.number().int(),
  llm_confidence: z.number().optional(),
  reasoning_summary: z.string(),
  citations: z.array(Citation),
  cost_usd: z.number().nullish(),
  latency_ms: z.number().int().nullish(),
  phoenix_trace_id: z.string().optional(),
  created_at: z.string().optional(),
});
export type TrustScoredDecision = z.infer<typeof TrustScoredDecision>;

/** A persisted decision row as returned by the Data Platform / gateway list+detail endpoints. */
export const DecisionSummary = z.object({
  decision_id: z.string(),
  job_id: z.string(),
  verdict: VerdictStatus,
  trust_score: z.number(),
  trust_band: TrustBand,
  requires_human_review: z.boolean(),
  violation_count: z.number().int(),
  warning_count: z.number().int(),
  reasoning_summary: z.string().nullish(),
  citations: z.array(Citation).optional(),
  created_at: z.string(),
});
export type DecisionSummary = z.infer<typeof DecisionSummary>;

// ── request bodies ──
export const AnalyzeRequest = z.object({
  text: z.string().min(1),
  job_id: z.string().optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const ReviewRequest = z.object({
  verdict: VerdictStatus,
  reviewer: z.string().min(1),
  note: z.string().optional(),
});
export type ReviewRequest = z.infer<typeof ReviewRequest>;

// ── analytics ──
export const AnalyticsOverview = z.object({
  total_decisions: z.number(),
  total_contracts: z.number(),
  avg_trust_score: z.number(),
  overall_approval_rate: z.number(),
  human_review_queue_depth: z.number(),
  decisions_this_month: z.number(),
  note: z.string().optional(),
});
export type AnalyticsOverview = z.infer<typeof AnalyticsOverview>;

export const DecisionVolume = z.object({
  date: z.string(),
  count: z.number(),
  avg_trust: z.number().optional(),
});
export type DecisionVolume = z.infer<typeof DecisionVolume>;

// ── contracts / payrolls / ingestion ──
export const ContractSummary = z.object({
  id: z.string(),
  contract_number: z.string(),
  project_name: z.string(),
  contractor_name: z.string(),
  locality: z.string(),
  status: ContractStatus,
  decision_count: z.number(),
  payroll_record_count: z.number(),
  created_at: z.string(),
});
export type ContractSummary = z.infer<typeof ContractSummary>;

export const PayrollRecordSummary = z.object({
  id: z.string(),
  contract_id: z.string(),
  employee_name: z.string(),
  trade_code: z.string(),
  locality_code: z.string(),
  week_ending: z.string(),
  total_hours: z.number(),
  hourly_rate: z.number(),
  gross_pay: z.number(),
});
export type PayrollRecordSummary = z.infer<typeof PayrollRecordSummary>;

export const IngestionJobSummary = z.object({
  job_id: z.string(),
  type: z.enum(["contract_import", "payroll_import", "general"]),
  status: z.enum(["pending", "running", "completed", "failed", "partial"]),
  source_type: z.string(),
  total_records: z.number(),
  processed_records: z.number(),
  failed_records: z.number(),
  created_at: z.string(),
});
export type IngestionJobSummary = z.infer<typeof IngestionJobSummary>;

export const PaginatedContracts = z.object({
  items: z.array(ContractSummary),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  pages: z.number(),
});
export type PaginatedContracts = z.infer<typeof PaginatedContracts>;

export const PaginatedPayrolls = z.object({
  items: z.array(PayrollRecordSummary),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  pages: z.number(),
});
export type PaginatedPayrolls = z.infer<typeof PaginatedPayrolls>;

// ── analytics (extended) ──
export const ApprovalRateOverall = z.object({
  total: z.number(),
  approved: z.number(),
  rate: z.number(),
});
export type ApprovalRateOverall = z.infer<typeof ApprovalRateOverall>;

export const ApprovalRateByBand = z.object({
  trust_band: z.string(),
  total: z.number(),
  approved: z.number(),
  rate: z.number(),
});
export type ApprovalRateByBand = z.infer<typeof ApprovalRateByBand>;

export const ApprovalRateResponse = z.object({
  overall: ApprovalRateOverall,
  by_trust_band: z.array(ApprovalRateByBand),
});
export type ApprovalRateResponse = z.infer<typeof ApprovalRateResponse>;

export const TrustBandDistribution = z.object({
  trust_band: z.string(),
  count: z.number(),
  percentage: z.number(),
});
export type TrustBandDistribution = z.infer<typeof TrustBandDistribution>;

export const CostAnalytics = z.object({
  total_decisions: z.number(),
  decisions_this_month: z.number(),
  note: z.string().optional(),
});
export type CostAnalytics = z.infer<typeof CostAnalytics>;

export const JobStatus = z.object({
  job_id: z.string(),
  status: z.enum(["pending", "processing", "complete", "failed"]),
  result: TrustScoredDecision.optional(),
  error: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type JobStatus = z.infer<typeof JobStatus>;

export const PipelineStep = z.object({
  label: z.string(),
  status: z.enum(["pending", "running", "done", "error"]),
});
export type PipelineStep = z.infer<typeof PipelineStep>;

// ── errors ──
export const ErrorResponse = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
