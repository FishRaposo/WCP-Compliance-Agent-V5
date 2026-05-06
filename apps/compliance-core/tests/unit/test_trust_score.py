
from wcp_compliance.models.enums import CheckStatus, OverallStatus, TrustBand, VerdictStatus
from wcp_compliance.models.schemas import (
    Citation,
    ComplianceCheck,
    DeterministicReport,
    LLMVerdict,
)
from wcp_compliance.rules.engine import compute_trust_components
from wcp_compliance.rules.trust_score import compute_trust_score, determine_trust_band


def _make_deterministic(**overrides) -> DeterministicReport:
    defaults = dict(
        job_id="test-001",
        report_id="rpt-001",
        artifact_id=None,
        checks=[
            ComplianceCheck(
                check_id="wage_test",
                check_type="wage_rate",
                employee_name="John",
                status=CheckStatus.PASS,
                expected_value=51.69,
                actual_value=55.00,
                variance=3.31,
                regulation_cite="40 U.S.C. § 3142",
                message="Pass",
            ),
            ComplianceCheck(
                check_id="ot_test",
                check_type="overtime",
                employee_name="John",
                status=CheckStatus.PASS,
                message="No OT",
            ),
        ],
        overall_status=OverallStatus.PASS,
        violation_count=0,
        warning_count=0,
        passed_count=2,
        dbwd_rates_used=[],
    )
    defaults.update(overrides)
    return DeterministicReport(**defaults)


def _make_verdict(**overrides) -> LLMVerdict:
    return LLMVerdict(
        job_id="test-001",
        verdict=overrides.get("verdict", VerdictStatus.APPROVED),
        reasoning=overrides.get("reasoning", "All checks passed"),
        citations=[Citation(regulation="40 U.S.C. § 3142", section="", text="")],
        confidence=overrides.get("confidence", 0.95),
    )


def test_compute_trust_score_perfect():
    components = {
        "deterministic": 0.35,
        "classification": 0.25,
        "llm_self": 0.20,
        "agreement": 0.20,
    }
    score = compute_trust_score(components)
    assert abs(score - 1.0) < 0.001


def test_compute_trust_score_zero():
    components = {"deterministic": 0.0, "classification": 0.0, "llm_self": 0.0, "agreement": 0.0}
    score = compute_trust_score(components)
    assert score == 0.0


def test_compute_trust_score_partial():
    components = {
        "deterministic": 0.30,
        "classification": 0.20,
        "llm_self": 0.15,
        "agreement": 0.10,
    }
    score = compute_trust_score(components)
    assert abs(score - 0.75) < 0.001


def test_determine_trust_band_auto_approve():
    assert determine_trust_band(0.90) == TrustBand.AUTO_APPROVE
    assert determine_trust_band(0.85) == TrustBand.AUTO_APPROVE
    assert determine_trust_band(1.0) == TrustBand.AUTO_APPROVE


def test_determine_trust_band_flag_for_review():
    assert determine_trust_band(0.70) == TrustBand.FLAG_FOR_REVIEW
    assert determine_trust_band(0.60) == TrustBand.FLAG_FOR_REVIEW
    assert determine_trust_band(0.66) == TrustBand.FLAG_FOR_REVIEW


def test_determine_trust_band_require_human_review():
    assert determine_trust_band(0.50) == TrustBand.REQUIRE_HUMAN_REVIEW
    assert determine_trust_band(0.0) == TrustBand.REQUIRE_HUMAN_REVIEW
    assert determine_trust_band(0.35) == TrustBand.REQUIRE_HUMAN_REVIEW


def test_trust_components_no_violations_llm_approved():
    det = _make_deterministic(violation_count=0, warning_count=0)
    ver = _make_verdict(verdict=VerdictStatus.APPROVED, confidence=0.95)
    comps = compute_trust_components(det, ver)
    assert comps["deterministic"] == 0.35
    assert comps["agreement"] == 0.20
    assert comps["classification"] == 0.2375
    assert comps["llm_self"] == 0.19


def test_trust_components_with_violations_llm_rejects():
    det = _make_deterministic(violation_count=2, warning_count=0, overall_status=OverallStatus.FAIL)
    ver = _make_verdict(verdict=VerdictStatus.REJECTED, confidence=0.80)
    comps = compute_trust_components(det, ver)
    assert comps["deterministic"] < 0.35
    assert comps["agreement"] == 0.10


def test_trust_components_mismatch():
    det = _make_deterministic(violation_count=3, warning_count=0, overall_status=OverallStatus.FAIL)
    ver = _make_verdict(verdict=VerdictStatus.APPROVED, confidence=0.90)
    comps = compute_trust_components(det, ver)
    assert comps["agreement"] == 0.0


def test_trust_components_no_violations_llm_needs_review():
    det = _make_deterministic(violation_count=0, warning_count=0)
    ver = _make_verdict(verdict=VerdictStatus.NEEDS_REVIEW, confidence=0.70)
    comps = compute_trust_components(det, ver)
    assert comps["agreement"] == 0.10
