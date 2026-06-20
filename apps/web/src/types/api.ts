export type VerdictStatus = "approved" | "rejected" | "needs_review";
export type TrustBand = "auto_approve" | "flag_for_review" | "require_human_review";

export interface Citation {
  regulation: string;
  section: string;
  text: string;
}

export interface TrustScoredDecision {
  job_id: string;
  verdict: VerdictStatus;
  trust_score: number;
  trust_band: TrustBand;
  requires_human_review: boolean;
  violation_count: number;
  warning_count: number;
  llm_confidence: number;
  reasoning_summary: string;
  citations: Citation[];
  cost_usd?: number;
  latency_ms?: number;
  phoenix_trace_id?: string;
  created_at?: string;
}

export interface DecisionSummary {
  decision_id: string;
  job_id: string;
  verdict: VerdictStatus;
  trust_score: number;
  trust_band: TrustBand;
  requires_human_review: boolean;
  violation_count: number;
  warning_count: number;
  reasoning_summary?: string | null;
  citations?: Citation[];
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "complete" | "failed";
  result?: TrustScoredDecision;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface DecisionVolume {
  date: string;
  count: number;
  avg_trust?: number;
}

export interface AnalyticsOverview {
  total_decisions: number;
  total_contracts: number;
  avg_trust_score: number;
  overall_approval_rate: number;
  human_review_queue_depth: number;
  decisions_this_month: number;
  note: string;
}

export interface ApprovalRateOverall {
  total: number;
  approved: number;
  rate: number;
}

export interface ApprovalRateByBand {
  trust_band: string;
  total: number;
  approved: number;
  rate: number;
}

export interface ApprovalRateResponse {
  overall: ApprovalRateOverall;
  by_trust_band: ApprovalRateByBand[];
}

export interface TrustBandDistribution {
  trust_band: string;
  count: number;
  percentage: number;
}

export interface CostAnalytics {
  total_decisions: number;
  decisions_this_month: number;
  note: string;
}

export interface PipelineStep {
  label: string;
  status: "pending" | "running" | "done" | "error";
}

export type ContractStatus = "active" | "completed" | "terminated" | "suspended";
export type IngestionJobType = "contract_import" | "payroll_import" | "general";
export type IngestionJobStatus = "pending" | "running" | "completed" | "failed" | "partial";

export interface ContractSummary {
  id: string;
  contract_number: string;
  project_name: string;
  contractor_name: string;
  locality: string;
  status: ContractStatus;
  decision_count: number;
  payroll_record_count: number;
  created_at: string;
}

export interface PaginatedContracts {
  items: ContractSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface PayrollRecordSummary {
  id: string;
  contract_id: string;
  employee_name: string;
  trade_code: string;
  locality_code: string;
  week_ending: string;
  total_hours: number;
  hourly_rate: number;
  gross_pay: number;
}

export interface PaginatedPayrolls {
  items: PayrollRecordSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface IngestionJobSummary {
  job_id: string;
  type: IngestionJobType;
  status: IngestionJobStatus;
  source_type: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  created_at: string;
}
