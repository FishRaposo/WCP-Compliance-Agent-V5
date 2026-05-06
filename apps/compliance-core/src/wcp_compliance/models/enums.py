from enum import StrEnum


class VerdictStatus(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class CheckStatus(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"


class CheckType(StrEnum):
    WAGE_RATE = "wage_rate"
    OVERTIME = "overtime"
    FRINGE_BENEFIT = "fringe_benefit"
    SIGNATURE = "signature"
    TOTAL_ARITHMETIC = "total_arithmetic"
    CLASSIFICATION = "classification"
    DATA_INTEGRITY = "data_integrity"
    MINIMUM_WAGE = "minimum_wage"


class TrustBand(StrEnum):
    AUTO_APPROVE = "auto_approve"
    FLAG_FOR_REVIEW = "flag_for_review"
    REQUIRE_HUMAN_REVIEW = "require_human_review"


class JobStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class OverallStatus(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    WARNINGS = "warnings"
