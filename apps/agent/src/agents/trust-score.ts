import { config } from "../config.js";
import type {
  DeterministicReport,
  LLMVerdict,
  TrustBand,
  VerdictStatus,
} from "../types.js";

interface TrustComponents {
  deterministic: number;
  classification: number;
  llm_self: number;
  agreement: number;
}

/**
 * Confidence that trade classifications resolved to a DBWD rate. Mirrors
 * compliance-core `compute_classification_score`: classification checks are only
 * emitted on a failed/ambiguous rate lookup. A FAIL is a full miss, a WARNING a
 * half miss; no classification checks => full confidence (1.0).
 */
export function computeClassificationScore(
  deterministic: DeterministicReport
): number {
  const classificationChecks = deterministic.checks.filter(
    (c) => c.check_type === "classification"
  );
  if (classificationChecks.length === 0) {
    return 1.0;
  }
  const fails = classificationChecks.filter((c) => c.status === "fail").length;
  const warnings = classificationChecks.filter(
    (c) => c.status === "warning"
  ).length;
  const missRatio = (fails + 0.5 * warnings) / classificationChecks.length;
  return Math.max(0.0, 1.0 - missRatio);
}

export function computeTrustComponents(
  deterministic: DeterministicReport,
  llmVerdict: LLMVerdict
): TrustComponents {
  const violationRatio =
    deterministic.violation_count / Math.max(deterministic.checks.length, 1);
  const deterministicScore = 1.0 - violationRatio;
  const classificationScore = computeClassificationScore(deterministic);
  const llmScore = llmVerdict.confidence;
  const agreementScore = computeAgreement(deterministic, llmVerdict);

  return {
    deterministic: 0.35 * deterministicScore,
    classification: 0.25 * classificationScore,
    llm_self: 0.20 * llmScore,
    agreement: 0.20 * agreementScore,
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

function computeAgreement(
  deterministic: DeterministicReport,
  llmVerdict: LLMVerdict
): number {
  const hasViolations = deterministic.violation_count > 0;
  const llmApproved = llmVerdict.verdict === "approved";

  if (hasViolations && llmApproved) {
    return 0.0;
  }
  if (!hasViolations && llmApproved) {
    return 1.0;
  }
  return 0.5;
}

export function safeVerdict(
  deterministic: DeterministicReport,
  llmVerdict: LLMVerdict
): VerdictStatus {
  const hasViolations = deterministic.violation_count > 0;
  const llmApproved = llmVerdict.verdict === "approved";

  if (hasViolations && llmApproved) {
    return "rejected";
  }
  return llmVerdict.verdict;
}
