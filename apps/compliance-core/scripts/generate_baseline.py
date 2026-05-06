"""Generate baseline scores for golden-set evaluation.

Runs the deterministic engine against all golden examples and saves
the results as baseline scores for regression detection.
"""

import json
from pathlib import Path

from wcp_compliance.extraction.pdf_extractor import extract_from_text
from wcp_compliance.rules.engine import run_rule_engine

HERE = Path(__file__).parent.parent
GOLDEN_SET_FILE = HERE / "tests" / "eval" / "golden_set" / "examples.json"
BASELINE_FILE = HERE / "tests" / "eval" / "baseline_scores.json"


def _verdict_from_status(status: str) -> str:
    if status == "pass":
        return "approved"
    if status == "fail":
        return "rejected"
    return "needs_review"


async def generate_baseline():
    with open(GOLDEN_SET_FILE) as f:
        examples = json.load(f)

    scores = {}
    for ex in examples:
        ex_id = ex["id"]
        extracted = extract_from_text(ex["input"])
        report = await run_rule_engine(extracted)
        verdict = _verdict_from_status(report.overall_status)

        scores[ex_id] = {
            "verdict_match": verdict == ex["expected_verdict"],
            "overall_match": report.overall_status == ex["expected_overall"],
            "violation_count": report.violation_count,
            "warning_count": report.warning_count,
        }

    from datetime import datetime
    baseline = {
        "metadata": {
            "generated_at": datetime.utcnow().isoformat(),
            "model": "deterministic",
            "version": "5.0.0",
        },
        "scores": scores,
    }

    with open(BASELINE_FILE, "w") as f:
        json.dump(baseline, f, indent=2)

    print(f"Baseline generated: {len(scores)} examples saved to {BASELINE_FILE}")


async def main():
    await generate_baseline()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
