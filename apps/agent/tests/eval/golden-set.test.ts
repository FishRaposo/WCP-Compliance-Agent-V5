import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { verdictAgreementScorer } from "../../src/mastra/scorers/verdict-agreement.scorer.js";

/**
 * Golden-set data + scorer integrity, offline.
 *
 * The full pipeline eval (running 100 examples through extract -> validate -> verdict) runs
 * in CI with the Python services up (see apps/compliance-core/tests/eval + eval.yml). This
 * offline test guards the golden-set data contract the eval depends on, and exercises the
 * Mastra scorer (`scorer.run`) over the real golden labels.
 */
const goldenUrl = new URL(
  "../../../compliance-core/tests/eval/golden_set/examples.json",
  import.meta.url,
);

type GoldenExample = {
  id: string;
  input: string;
  expected_verdict: string;
  expected_overall: string;
};

const golden = JSON.parse(readFileSync(goldenUrl, "utf8")) as GoldenExample[];

describe("golden set", () => {
  it("loads ~100 examples with the required fields", () => {
    expect(Array.isArray(golden)).toBe(true);
    expect(golden.length).toBeGreaterThanOrEqual(90);
    for (const ex of golden) {
      expect(ex.id).toBeTruthy();
      expect(typeof ex.input).toBe("string");
      expect(["approved", "rejected", "needs_review"]).toContain(ex.expected_verdict);
      expect(["pass", "fail", "warnings"]).toContain(ex.expected_overall);
    }
  });

  it("verdictAgreementScorer scores 1.0 across the golden labels (sanity)", async () => {
    const sample = golden.slice(0, 20);
    const results = await Promise.all(
      sample.map((ex) =>
        verdictAgreementScorer.run({
          input: ex.id,
          output: { verdict: ex.expected_verdict },
          groundTruth: { expected_verdict: ex.expected_verdict },
        }),
      ),
    );
    const passRate = results.filter((r) => r.score === 1).length / results.length;
    expect(passRate).toBe(1);
  });
});
