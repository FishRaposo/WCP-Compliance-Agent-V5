from __future__ import annotations

from wcp_compliance.config import settings
from wcp_compliance.models.enums import TrustBand


def compute_trust_score(components: dict[str, float]) -> float:
    return sum(components.values())


def determine_trust_band(score: float) -> TrustBand:
    if score >= settings.trust_score_high_band:
        return TrustBand.AUTO_APPROVE
    elif score >= settings.trust_score_medium_band:
        return TrustBand.FLAG_FOR_REVIEW
    else:
        return TrustBand.REQUIRE_HUMAN_REVIEW
