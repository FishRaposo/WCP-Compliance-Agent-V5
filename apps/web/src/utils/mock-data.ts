import type {
  AnalyticsOverview,
  TrustScoredDecision,
  DecisionSummary,
  DecisionVolume,
  ApprovalRateResponse,
  TrustBandDistribution,
  CostAnalytics,
  JobStatus,
  IngestionJobSummary,
  PaginatedContracts,
  PaginatedPayrolls,
} from "../types/api";

/** Portfolio demo: one WH-347 payroll case referenced across all mock routes. */
export const DEMO_JOB_ID = "job-wh347-demo-2026";
export const DEMO_DECISION_ID = "dec-wh347-demo-2026";
export const DEMO_CONTRACT_ID = "contract-wh347-demo";
export const DEMO_CONTRACT_NUMBER = "DBA-2026-347";
export const DEMO_PAYROLL_ID = "payroll-wh347-demo-001";
export const DEMO_INGESTION_JOB_ID = "ing-wh347-demo";

const DEMO_CREATED_AT = "2026-01-09T14:32:00.000Z";
const DEMO_WEEK_ENDING = "2026-01-09";

const DEMO_REASONING =
  "Deterministic validation rejected this WH-347: Electrician Jane Worker was paid $45.00/hr against a $51.69 DBWD minimum for Boston, MA; fringe benefits were under-reported; overtime arithmetic does not reconcile with claimed hours. The LLM explains the audit record — compliance checks decide the verdict.";

const DEMO_CITATIONS = [
  {
    regulation: "40 U.S.C. \u00A7 3142(b)",
    section: "3142",
    text: "Prevailing wage requirements for laborers and mechanics on federal contracts",
  },
  {
    regulation: "29 CFR 5.5(a)(1)",
    section: "5.5",
    text: "Wage determination compliance and certified payroll submission",
  },
  {
    regulation: "29 CFR 5.5(a)(3)",
    section: "5.5",
    text: "Fringe benefit contributions must meet or exceed the determination",
  },
] as const;

export const mockTrustScoredDecision: TrustScoredDecision = {
  job_id: DEMO_JOB_ID,
  verdict: "rejected",
  trust_score: 0.42,
  trust_band: "require_human_review",
  requires_human_review: true,
  violation_count: 3,
  warning_count: 2,
  llm_confidence: 0.91,
  reasoning_summary: DEMO_REASONING,
  citations: [...DEMO_CITATIONS],
  cost_usd: 0.0038,
  latency_ms: 2140,
  phoenix_trace_id: "trace-wh347-demo-2026",
  created_at: DEMO_CREATED_AT,
};

export const mockDecisionSummaries: DecisionSummary[] = [
  {
    decision_id: DEMO_DECISION_ID,
    job_id: DEMO_JOB_ID,
    verdict: "rejected",
    trust_score: 0.42,
    trust_band: "require_human_review",
    requires_human_review: true,
    violation_count: 3,
    warning_count: 2,
    reasoning_summary: DEMO_REASONING,
    citations: [...DEMO_CITATIONS],
    created_at: DEMO_CREATED_AT,
  },
  {
    decision_id: "dec-wh347-demo-prior-001",
    job_id: "job-wh347-demo-prior-001",
    verdict: "approved",
    trust_score: 0.94,
    trust_band: "auto_approve",
    requires_human_review: false,
    violation_count: 0,
    warning_count: 0,
    created_at: "2026-01-02T11:00:00.000Z",
  },
  {
    decision_id: "dec-wh347-demo-prior-002",
    job_id: "job-wh347-demo-prior-002",
    verdict: "needs_review",
    trust_score: 0.68,
    trust_band: "flag_for_review",
    requires_human_review: false,
    violation_count: 1,
    warning_count: 1,
    created_at: "2025-12-26T09:15:00.000Z",
  },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const mockDecisionVolume: DecisionVolume[] = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10),
  count: i === 13 ? 3 : Math.floor(seededRandom(i) * 4) + 1,
  avg_trust: Number((0.55 + seededRandom(i + 100) * 0.35).toFixed(2)),
}));

export const mockAnalyticsOverview: AnalyticsOverview = {
  total_decisions: 24,
  total_contracts: 1,
  avg_trust_score: 0.71,
  overall_approval_rate: 0.667,
  human_review_queue_depth: 1,
  decisions_this_month: 6,
  note: `Mock mode \u2014 portfolio demo centers on ${DEMO_JOB_ID} (WH-347 rejected)`,
};

export const mockApprovalRate: ApprovalRateResponse = {
  overall: { total: 24, approved: 16, rate: 0.667 },
  by_trust_band: [
    { trust_band: "auto_approve", total: 16, approved: 16, rate: 1.0 },
    { trust_band: "flag_for_review", total: 7, approved: 5, rate: 0.714 },
    { trust_band: "require_human_review", total: 1, approved: 0, rate: 0.0 },
  ],
};

export const mockTrustBandDistribution: TrustBandDistribution[] = [
  { trust_band: "auto_approve", count: 16, percentage: 66.7 },
  { trust_band: "flag_for_review", count: 7, percentage: 29.2 },
  { trust_band: "require_human_review", count: 1, percentage: 4.2 },
];

export const mockCostAnalytics: CostAnalytics = {
  total_decisions: 24,
  decisions_this_month: 6,
  note: `Mock mode \u2014 demo case ${DEMO_JOB_ID}; no real LLM costs incurred`,
};

export const mockJobStatus: JobStatus = {
  job_id: DEMO_JOB_ID,
  status: "complete",
  result: mockTrustScoredDecision,
  created_at: DEMO_CREATED_AT,
  updated_at: DEMO_CREATED_AT,
};

export const mockPromptVersions: string[] = ["v2", "v1"];

export const mockContracts: PaginatedContracts = {
  items: [
    {
      id: DEMO_CONTRACT_ID,
      contract_number: DEMO_CONTRACT_NUMBER,
      project_name: "Federal Courthouse Renovation",
      contractor_name: "Keystone Builders",
      locality: "Boston, MA",
      status: "active",
      decision_count: 3,
      payroll_record_count: 2,
      created_at: "2025-11-01T08:00:00.000Z",
    },
  ],
  total: 1,
  page: 1,
  per_page: 25,
  pages: 1,
};

export const mockPayrolls: PaginatedPayrolls = {
  items: [
    {
      id: DEMO_PAYROLL_ID,
      contract_id: DEMO_CONTRACT_ID,
      employee_name: "Jane Worker",
      trade_code: "Electrician",
      locality_code: "Boston, MA",
      week_ending: DEMO_WEEK_ENDING,
      total_hours: 40.0,
      hourly_rate: 45.0,
      gross_pay: 1800.0,
    },
    {
      id: "payroll-wh347-demo-002",
      contract_id: DEMO_CONTRACT_ID,
      employee_name: "Alex Mechanic",
      trade_code: "Laborer",
      locality_code: "Boston, MA",
      week_ending: DEMO_WEEK_ENDING,
      total_hours: 42.0,
      hourly_rate: 38.5,
      gross_pay: 1694.0,
    },
  ],
  total: 2,
  page: 1,
  per_page: 25,
  pages: 1,
};

export const mockIngestionJobs: IngestionJobSummary[] = [
  {
    job_id: DEMO_INGESTION_JOB_ID,
    type: "payroll_import",
    status: "completed",
    source_type: "wh-347",
    total_records: 2,
    processed_records: 2,
    failed_records: 0,
    created_at: DEMO_CREATED_AT,
  },
];

export const mockComplianceAnalytics = {
  total_decisions: 24,
  approval_rate: 66.7,
  by_trade: [
    {
      trade: "Electrician",
      total: 8,
      approved: 5,
      flagged: 2,
      rejected: 1,
      approval_rate: 62.5,
    },
    {
      trade: "Laborer",
      total: 6,
      approved: 4,
      flagged: 1,
      rejected: 1,
      approval_rate: 66.7,
    },
  ],
  by_locality: [
    { locality: "Boston, MA", total: 24, approval_rate: 66.7 },
  ],
  violation_types: [
    { type: "underpayment", count: 1, percentage: 33.3 },
    { type: "missing_fringe", count: 1, percentage: 33.3 },
    { type: "overtime_violation", count: 1, percentage: 33.3 },
  ],
};

export const mockWagesAnalytics = {
  total_decisions: 24,
  violation_rate: 33.3,
  avg_actual_vs_required_diff: -6.69,
  fringe_compliance_rate: 66.7,
  violation_trend: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10),
    violations: i === 13 ? 3 : Math.floor(seededRandom(i + 200) * 2),
    total_checked: Math.floor(seededRandom(i + 300) * 4) + 1,
    violation_rate: i === 13 ? 100 : seededRandom(i + 400) * 20,
  })),
  actual_vs_required: [
    {
      locality: "Boston, MA",
      trade: "Electrician",
      required_wage: 51.69,
      actual_avg: 45.0,
      compliant_pct: 0,
    },
    {
      locality: "Boston, MA",
      trade: "Laborer",
      required_wage: 38.5,
      actual_avg: 38.5,
      compliant_pct: 100,
    },
  ],
  fringe_compliance: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10),
    compliant_pct: i === 13 ? 50 : 85 + seededRandom(i + 800) * 10,
  })),
};

export const mockLLMAnalytics = {
  summary: {
    total_cost: 0.09,
    cost_per_decision: 0.0038,
    avg_latency_ms: 2140,
    total_tokens: 62000,
    decisions: 24,
  },
  cost_per_decision: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10),
    cost_usd: i === 13 ? 0.0038 : seededRandom(i + 900) * 0.02 + 0.002,
    decisions: i === 13 ? 1 : Math.floor(seededRandom(i + 1000) * 3) + 1,
    total_cost: seededRandom(i + 1100) * 0.03 + 0.005,
  })),
  token_usage: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400_000).toISOString().slice(0, 10),
    prompt_tokens: Math.floor(seededRandom(i + 1200) * 4000) + 1500,
    completion_tokens: Math.floor(seededRandom(i + 1300) * 1500) + 500,
    total_tokens: Math.floor(seededRandom(i + 1400) * 5500) + 2000,
  })),
  model_distribution: [
    { model: "gpt-4o-mini", count: 24, percentage: 100, avg_cost: 0.0038 },
  ],
  latency_by_model: [
    { model: "gpt-4o-mini", p50_ms: 1800, p95_ms: 2400, p99_ms: 2800 },
  ],
};
