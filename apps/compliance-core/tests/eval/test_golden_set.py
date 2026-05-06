"""Golden-set evaluation: runs deterministic validation against known examples.

Validates that the rule engine produces correct verdicts and violation counts
for a fixed set of WH-347 payroll examples.
"""

import json
from pathlib import Path

import pytest

from wcp_compliance.extraction.pdf_extractor import extract_from_text
from wcp_compliance.rules.engine import run_rule_engine

HERE = Path(__file__).parent
GOLDEN_SET_FILE = HERE / "golden_set" / "examples.json"
BASELINE_FILE = HERE / "baseline_scores.json"


def load_golden_set():
    with open(GOLDEN_SET_FILE) as f:
        return json.load(f)


def load_baseline():
    with open(BASELINE_FILE) as f:
        return json.load(f)


GOLDEN_SET = load_golden_set()
BASELINE = load_baseline()


def _verdict_to_expected(deterministic) -> str:
    """Map deterministic report to expected verdict."""
    if deterministic.overall_status == "pass":
        return "approved"
    if deterministic.overall_status == "fail":
        return "rejected"
    return "needs_review"


@pytest.mark.asyncio
@pytest.mark.parametrize("example", GOLDEN_SET, ids=[e["id"] for e in GOLDEN_SET])
async def test_golden_example(example: dict):
    """Run each golden example through extraction and deterministic validation."""
    extracted = extract_from_text(example["input"])
    report = await run_rule_engine(extracted)

    # Verify verdict matches expected
    verdict = _verdict_to_expected(report)
    assert verdict == example["expected_verdict"], (
        f"Expected verdict '{example['expected_verdict']}', got '{verdict}' "
        f"for {example['id']}: {example['description']}"
    )

    # Verify overall status
    assert report.overall_status == example["expected_overall"], (
        f"Expected overall '{example['expected_overall']}', got '{report.overall_status}' "
        f"for {example['id']}"
    )

    # Verify violation count
    if "expected_violations" in example:
        assert report.violation_count == example["expected_violations"], (
            f"Expected {example['expected_violations']} violations, "
            f"got {report.violation_count}"
        )
    if "expected_violations_min" in example:
        assert report.violation_count >= example["expected_violations_min"], (
            f"Expected at least {example['expected_violations_min']} violations, "
            f"got {report.violation_count}"
        )

    # Verify warning count
    if "expected_warnings" in example:
        assert report.warning_count == example["expected_warnings"]
    if "expected_warnings_min" in example:
        assert report.warning_count >= example["expected_warnings_min"]


@pytest.mark.asyncio
async def test_regression_against_baseline():
    """Verify no regression against baseline scores."""
    baseline_scores = BASELINE.get("scores", {})
    failures = []

    for example in GOLDEN_SET:
        ex_id = example["id"]
        if ex_id not in baseline_scores:
            continue

        extracted = extract_from_text(example["input"])
        report = await run_rule_engine(extracted)
        verdict = _verdict_to_expected(report)
        baseline = baseline_scores[ex_id]

        if baseline.get("verdict_match"):
            if verdict != example["expected_verdict"]:
                exp = example["expected_verdict"]
                msg = f"{ex_id}: verdict mismatch (expected {exp}, got {verdict})"
                failures.append(msg)

        if baseline.get("overall_match"):
            if report.overall_status != example["expected_overall"]:
                exp = example["expected_overall"]
                msg = f"{ex_id}: overall mismatch (expected {exp}, got {report.overall_status})"
                failures.append(msg)

        if baseline.get("violation_count_min_met"):
            min_violations = example.get("expected_violations_min", 0)
            if report.violation_count < min_violations:
                msg = (
                    f"{ex_id}: violation count regression "
                    f"({report.violation_count} < {min_violations})"
                )
                failures.append(msg)

    if failures:
        summary = "\n".join(failures[:10])
        pytest.fail(f"Regression detected in {len(failures)} examples:\n" + summary)
