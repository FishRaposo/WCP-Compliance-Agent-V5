from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Citation(BaseModel):
    regulation: str
    section: str = ""
    text: str = ""


class DecisionCreate(BaseModel):
    job_id: str = Field(min_length=1)
    verdict: str
    trust_score: float = Field(ge=0.0, le=1.0)
    trust_band: str
    requires_human_review: bool = False
    violation_count: int = Field(default=0, ge=0)
    warning_count: int = Field(default=0, ge=0)
    reasoning_summary: str = ""
    citations: list[Citation] = Field(default_factory=list)
    cost_usd: float | None = None
    latency_ms: int | None = None
    phoenix_trace_id: str = ""
    contract_id: str | None = None


class DecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    verdict: str
    trust_score: float
    trust_band: str
    requires_human_review: bool
    violation_count: int
    warning_count: int
    reasoning_summary: str | None = None
    citations: list[Any] = Field(default_factory=list)
    cost_usd: float | None = None
    latency_ms: int | None = None
    phoenix_trace_id: str | None = None
    contract_id: str | None = None
    created_at: datetime


class AuditEventCreate(BaseModel):
    job_id: str = Field(min_length=1)
    event_type: str = Field(min_length=1)
    actor: str = "system"
    payload: dict[str, Any] = Field(default_factory=dict)
    regulation_references: list[str] = Field(default_factory=list)
    trace_id: str = ""


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    event_type: str
    actor: str = "system"
    payload: dict[str, Any] = Field(default_factory=dict)
    regulation_references: list[str] = Field(default_factory=list)
    trace_id: str = ""
    created_at: datetime


ContractStatus = Literal["active", "completed", "terminated", "suspended"]
ContractSource = Literal["manual", "sftp", "api", "database", "csv"]


class ContractCreate(BaseModel):
    contract_number: str = Field(min_length=1)
    project_name: str = Field(min_length=1)
    contractor_name: str = Field(min_length=1)
    contractor_ein: str | None = None
    agency: str | None = None
    locality: str = Field(min_length=1)
    start_date: date
    end_date: date | None = None
    total_value: Decimal | None = None
    source: ContractSource = "manual"
    source_reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ContractUpdate(BaseModel):
    project_name: str | None = None
    contractor_name: str | None = None
    contractor_ein: str | None = None
    agency: str | None = None
    locality: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    total_value: Decimal | None = None
    status: ContractStatus | None = None
    source_reference: str | None = None
    metadata: dict[str, Any] | None = None


class ContractFilters(BaseModel):
    status: ContractStatus | None = None
    contractor: str | None = None
    locality: str | None = None
    sort: str = "created_at"
    order: Literal["asc", "desc"] = "desc"


class ContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_number: str
    project_name: str
    contractor_name: str
    contractor_ein: str | None = None
    agency: str | None = None
    locality: str
    start_date: date
    end_date: date | None = None
    total_value: Decimal | None = None
    status: str
    source: str
    source_reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    decision_count: int = 0
    payroll_record_count: int = 0
    latest_decision_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PaginatedContracts(BaseModel):
    items: list[ContractResponse]
    total: int
    page: int
    per_page: int
    pages: int


class BulkImportResult(BaseModel):
    job_id: str
    created: int
    skipped: int
    failed: int
    errors: list[dict[str, Any]] = Field(default_factory=list)


class PayrollRecordCreate(BaseModel):
    employee_name: str = Field(min_length=1)
    employee_id_hash: str | None = None
    trade_code: str = Field(min_length=1)
    locality_code: str = Field(min_length=1)
    week_ending: date
    hours_monday: Decimal | None = None
    hours_tuesday: Decimal | None = None
    hours_wednesday: Decimal | None = None
    hours_thursday: Decimal | None = None
    hours_friday: Decimal | None = None
    hours_saturday: Decimal | None = None
    hours_sunday: Decimal | None = None
    total_hours: Decimal = Field(ge=0)
    hourly_rate: Decimal = Field(ge=0)
    gross_pay: Decimal = Field(ge=0)
    fringe_rate: Decimal | None = Field(default=None, ge=0)
    fringe_total: Decimal | None = Field(default=None, ge=0)
    overtime_hours: Decimal = Field(default=Decimal("0"), ge=0)
    overtime_pay: Decimal = Field(default=Decimal("0"), ge=0)
    decision_id: str | None = None
    source_file: str | None = None

    @model_validator(mode="after")
    def validate_daily_hours(self) -> "PayrollRecordCreate":
        for value in (
            self.hours_monday,
            self.hours_tuesday,
            self.hours_wednesday,
            self.hours_thursday,
            self.hours_friday,
            self.hours_saturday,
            self.hours_sunday,
        ):
            if value is not None and (value < 0 or value > 24):
                raise ValueError("daily hours must be between 0 and 24")
        return self


class PayrollRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    contract_id: str
    employee_name: str
    employee_id_hash: str | None = None
    trade_code: str
    locality_code: str
    week_ending: date
    hours_monday: Decimal | None = None
    hours_tuesday: Decimal | None = None
    hours_wednesday: Decimal | None = None
    hours_thursday: Decimal | None = None
    hours_friday: Decimal | None = None
    hours_saturday: Decimal | None = None
    hours_sunday: Decimal | None = None
    total_hours: Decimal
    hourly_rate: Decimal
    gross_pay: Decimal
    fringe_rate: Decimal | None = None
    fringe_total: Decimal | None = None
    overtime_hours: Decimal = Decimal("0")
    overtime_pay: Decimal = Decimal("0")
    decision_id: str | None = None
    source_file: str | None = None
    ingestion_job_id: str | None = None
    created_at: datetime


class PayrollBulkImportRequest(BaseModel):
    contract_id: str
    records: list[PayrollRecordCreate]
    source: str = "manual"
    source_reference: str | None = None


class PayrollBulkImportResult(BaseModel):
    job_id: str
    created: int
    failed: int
    errors: list[dict[str, Any]] = Field(default_factory=list)


class PayrollFilters(BaseModel):
    contract_id: str | None = None
    trade_code: str | None = None
    employee_name: str | None = None
    week_start: date | None = None
    week_end: date | None = None
    has_violation: bool | None = None


class PaginatedPayrolls(BaseModel):
    items: list[PayrollRecordResponse]
    total: int
    page: int
    per_page: int
    pages: int


class IngestionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    type: str
    status: str
    source_type: str
    source_reference: str | None = None
    contract_id: str | None = None
    total_records: int
    processed_records: int
    failed_records: int
    error_details: list[dict[str, Any]] = Field(default_factory=list)
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DBWDRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trade: str
    locality: str
    rate: float
    fringe: float
    effective_date: date
    wage_determination_number: str
    created_at: datetime
