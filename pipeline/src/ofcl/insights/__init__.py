"""Motore deterministico di rilevamento anomalie, divergenze e spunti civici per bozze social."""

from ofcl.insights.social_detector import (
    ART_192_DISCLAIMER,
    SocialInsightCandidate,
    SocialSlide,
    detect_all_social_insights,
    detect_budget_divergences,
    detect_credit_overruns,
    detect_fun_facts,
    detect_peer_cost_outliers,
    detect_tariff_gaps,
    detect_tax_multiplier_gaps,
    format_chf_it,
    polish_candidate_with_llm,
)

__all__ = [
    "ART_192_DISCLAIMER",
    "SocialInsightCandidate",
    "SocialSlide",
    "detect_all_social_insights",
    "detect_budget_divergences",
    "detect_credit_overruns",
    "detect_fun_facts",
    "detect_peer_cost_outliers",
    "detect_tariff_gaps",
    "detect_tax_multiplier_gaps",
    "format_chf_it",
    "polish_candidate_with_llm",
]
