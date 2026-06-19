import { config } from "../config.js";
import type {
  Citation,
  DeterministicReport,
  LLMVerdict,
  TrustBand,
  VerdictStatus,
} from "./schemas.js";

/**
 * Deterministic trust scoring. This is intentionally NOT an LLM concern — the score is a
 * pure, auditable function of the deterministic report and the LLM's self-reported
 * confidence. The four weighted components sum to 1.0 (35/25/20/20).
 */
export interface TrustComponents {
  deterministic: number;
  classification: number;
  llm_self: number;
  agreement: number;
}

export const TRUST_WEIGHTS = {
  deterministic: 0.35,
  classification: 0.25,
  llm_self: 0.2,
  agreement: 0.2,
} as const;

export function computeTrustComponents(
  deterministic: DeterministicReport,
  llmVerdict: Pick<LLMVerdict, "verdict" | "confidence">,
): TrustComponents {
  const violationRatio =
    deterministic.violation_count / Math.max(deterministic.checks.length, 1);
  const deterministicScore = 1.0 - violationRatio;
  const classificationScore = 0.95;
  const llmScore = llmVerdict.confidence;
  const agreementScore = computeAgreement(deterministic, llmVerdict);

  return {
    deterministic: TRUST_WEIGHTS.deterministic * deterministicScore,
    classification: TRUST_WEIGHTS.classification * classificationScore,
    llm_self: TRUST_WEIGHTS.llm_self * llmScore,
    agreement: TRUST_WEIGHTS.agreement * agreementScore,
  };
}

export function computeTrustScore(components: TrustComponents): number {
  const score =
    components.deterministic +
    components.classification +
    components.llm_self +
    components.agreement;
  return Math.min(Math.max(score, 0), 1);
}

export function determineTrustBand(score: number): TrustBand {
  if (score >= config.TRUST_SCORE_HIGH_BAND) {
    return "auto_approve";
  }
  if (score >= config.TRUST_SCORE_REVIEW_THRESHOLD) {
    return "flag_for_review";
  }
  return "require_human_review";
}

export function computeAgreement(
  deterministic: DeterministicReport,
  llmVerdict: Pick<LLMVerdict, "verdict">,
): number {
  const verdict = llmVerdict.verdict;

  if (deterministic.violation_count > 0) {
    // Deterministic truth is "fail": full agreement only if the LLM also rejects.
    // Anything softer (approved / needs_review) is a real disagreement, not neutral.
    return verdict === "rejected" ? 1.0 : 0.0;
  }
  if (verdict === "approved") return 1.0;
  return 0.5;
}

/**
 * Safety override: deterministic violations are the source of compliance truth, so a payroll
 * with hard violations can never be "approved" — nor merely "needs_review". It must be
 * rejected, regardless of what the LLM returned. The LLM adds explanation, not correctness.
 */
export function safeVerdict(
  deterministic: DeterministicReport,
  llmVerdict: Pick<LLMVerdict, "verdict">,
): VerdictStatus {
  if (deterministic.violation_count > 0 && llmVerdict.verdict !== "rejected") {
    return "rejected";
  }
  return llmVerdict.verdict;
}

/**
 * Compose the human-readable reasoning. When the deterministic engine found violations (and
 * especially when it overrode the LLM verdict), lead with the deterministic truth and demote
 * the LLM's free text to context — so a rejected decision never reads like an approval, and
 * attacker-influenced LLM prose can't masquerade as the headline rationale in the audit record.
 */
export function buildReasoningSummary(
  deterministic: DeterministicReport,
  llmVerdict: Pick<LLMVerdict, "reasoning" | "verdict">,
  finalVerdict: VerdictStatus,
): string {
  if (deterministic.violation_count === 0 && deterministic.warning_count === 0) {
    return llmVerdict.reasoning;
  }
  const overridden = finalVerdict !== llmVerdict.verdict;
  const lead = overridden
    ? `Overridden by deterministic checks: ${deterministic.violation_count} violation(s) present, so the payroll cannot be approved.`
    : `Deterministic checks: ${deterministic.violation_count} violation(s), ${deterministic.warning_count} warning(s).`;
  return `${lead} LLM rationale (context): ${llmVerdict.reasoning}`;
}

/**
 * Ground the citations against deterministic truth before persistence. The verdict agent
 * consumes attacker-influenceable payroll text, so on a violation-bearing payroll we keep only
 * LLM citations that match a regulation the deterministic report actually cites, and otherwise
 * synthesize citations from the failed checks. Clean payrolls keep the LLM citations (lower
 * stakes; the sampled citation-groundedness scorer watches those).
 */
export function groundCitations(
  deterministic: DeterministicReport,
  llmCitations: Citation[],
): Citation[] {
  if (deterministic.violation_count === 0) return llmCitations;

  const reportCites = deterministic.checks
    .map((c) => c.regulation_cite)
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase());

  const grounded = llmCitations.filter((c) => {
    const reg = (c.regulation || "").toLowerCase();
    return reg.length > 0 && reportCites.some((rc) => rc.includes(reg) || reg.includes(rc));
  });
  if (grounded.length > 0) return grounded;

  return deterministic.checks
    .filter((c) => c.status === "fail" && c.regulation_cite)
    .map((c) => ({ regulation: c.regulation_cite, section: "", text: c.message }));
}
