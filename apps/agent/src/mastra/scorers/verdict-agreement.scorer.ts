import { createScorer } from "@mastra/core/evals";

/**
 * Deterministic (code) scorer: does the produced verdict match the expected label?
 *
 * Used to evaluate the pipeline against the golden set. `output` is the produced decision
 * (`{ verdict }`), `groundTruth` is the golden example (`{ expected_verdict }`). Pure code —
 * no LLM — so it runs in CI with zero keys.
 */
export const verdictAgreementScorer = createScorer({
  id: "verdict-agreement",
  name: "Verdict Agreement",
  description:
    "Scores 1.0 when the produced compliance verdict matches the expected golden-set verdict, else 0.0.",
})
  .generateScore(({ run }) => {
    const output = run.output as { verdict?: string } | undefined;
    const groundTruth = run.groundTruth as { expected_verdict?: string } | undefined;
    const actual = String(output?.verdict ?? "").trim().toLowerCase();
    const expected = String(groundTruth?.expected_verdict ?? "").trim().toLowerCase();
    if (!expected) return 0;
    return actual === expected ? 1 : 0;
  })
  .generateReason(({ run, score }) => {
    const output = run.output as { verdict?: string } | undefined;
    const groundTruth = run.groundTruth as { expected_verdict?: string } | undefined;
    return score === 1
      ? `Verdict "${output?.verdict}" matches expected.`
      : `Expected "${groundTruth?.expected_verdict}", got "${output?.verdict}".`;
  });
