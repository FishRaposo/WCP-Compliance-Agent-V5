from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from wcp_compliance.models.enums import (
    CheckStatus,
    CheckType,
    OverallStatus,
    TrustBand,
    VerdictStatus,
)


class ContractorInfo(BaseModel):
    model_config = ConfigDict(strict=False)

    name: str
    address: str = ""
    ein: str = ""


class ProjectInfo(BaseModel):
    model_config = ConfigDict(strict=False)

    name: str
    location: str = ""
    contract_number: str = ""
    wage_determination_number: str = ""


class EmployeeRecord(BaseModel):
    model_config = ConfigDict(strict=False)

    name: str
    trade_classification: str
    hours_worked: float
    overtime_hours: float = 0.0
    hourly_wage: float
    fringe_benefits: float = 0.0
    gross_earnings: float
    deductions: float = 0.0
    net_wages: float


class OfflineExtractionMetadata(BaseModel):
    model_config = ConfigDict(strict=False)

    noncanonical_input_issues: list[str] = Field(default_factory=list)


class ExtractedWCP(BaseModel):
    model_config = ConfigDict(strict=False)

    job_id: str
    contractor: ContractorInfo
    project: ProjectInfo
    employees: list[EmployeeRecord]
    certification_date: date | None = None
    payroll_number: int | None = None
    week_ending: date | None = None
    report_id: str | None = None
    artifact_id: str | None = None
    offline_metadata: OfflineExtractionMetadata | None = None


class ComplianceCheck(BaseModel):
    model_config = ConfigDict(strict=False)

    check_id: str
    check_type: CheckType
    employee_name: str
    status: CheckStatus
    expected_value: float | None = None
    actual_value: float | None = None
    variance: float | None = None
    regulation_cite: str = ""
    message: str = ""


class DBWDRateRecord(BaseModel):
    model_config = ConfigDict(strict=False)

    trade: str
    locality: str
    rate: float
    fringe: float
    effective_date: date
    wage_determination_number: str = ""


class DeterministicReport(BaseModel):
    model_config = ConfigDict(strict=False)

    job_id: str
    report_id: str | None = None
    artifact_id: str | None = None
    checks: list[ComplianceCheck]
    overall_status: OverallStatus
    violation_count: int
    warning_count: int
    passed_count: int | None = None
    dbwd_rates_used: list[DBWDRateRecord] = Field(default_factory=list)
    confidence_inputs: dict[str, float] | None = None


class Citation(BaseModel):
    model_config = ConfigDict(strict=False)

    regulation: str
    section: str = ""
    text: str = ""


class TokenUsage(BaseModel):
    model_config = ConfigDict(strict=False)

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class LLMVerdict(BaseModel):
    model_config = ConfigDict(strict=False)

    job_id: str
    verdict: VerdictStatus
    reasoning: str
    citations: list[Citation]
    confidence: float
    referenced_check_ids: list[str] = Field(default_factory=list)
    rag_context_used: bool = False
    model: str = ""
    prompt_version: str = ""
    token_usage: TokenUsage | None = None


class TrustScoredDecision(BaseModel):
    model_config = ConfigDict(strict=False)

    job_id: str
    verdict: VerdictStatus
    trust_score: float
    trust_band: TrustBand
    requires_human_review: bool
    violation_count: int
    warning_count: int
    llm_confidence: float
    reasoning_summary: str
    citations: list[Citation]
    cost_usd: float | None = None
    latency_ms: int | None = None
    trace_id: str = ""
    created_at: datetime | None = None


class AuditEvent(BaseModel):
    model_config = ConfigDict(strict=False)

    event_id: UUID
    job_id: str
    event_type: str
    timestamp: datetime
    actor: str = "system"
    payload: dict[str, object] = Field(default_factory=dict)
    regulation_references: list[str] = Field(default_factory=list)
    trace_id: str = ""
