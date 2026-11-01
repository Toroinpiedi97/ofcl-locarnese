"""
Riconciliazione ed Entity Resolution dei Crediti d'Investimento (Allegato f - Task T034).
Conformità: docs/spec/08-crediti-cespiti-lifecycle.md §4.

Cascata deterministica a 4 livelli:
- Livello 1: (ust_code, entity_id, account_full, canonical_mm, vote_date) coincidenza esatta (confidenza 1.00)
- Livello 2: Continuità contabile |used_at_0101(T) - spent_total(T-1)| <= 1.00 CHF (confidenza 0.95)
- Livello 3: Match fuzzy controllato su Jaccard similarità >= 0.70 (confidenza 0.75..0.89 -> NEEDS_REVIEW)
- Livello 4: Creazione nuova entità credito
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

from ofcl.classify.classifier import canonical_mm
from ofcl.extract.table_extractor import CreditWorkItem

ConfidenceLevel = Literal["EXACT_KEY", "ACCOUNTING_CONTINUITY", "FUZZY_MATCH", "NEW_CREDIT"]


@dataclass
class ResolvedCreditEntity:
    """Credito d'investimento riconciliato con livello di confidenza."""

    ust_code: int
    entity_id: str
    account_code: str
    canonical_mm_no: str | None
    title: str
    voted_credit: Decimal
    spent_total: Decimal
    remaining_credit: Decimal
    has_overrun: bool
    confidence_level: ConfidenceLevel
    confidence_score: float
    matched_parent_id: str | None = None
    needs_review: bool = False


def _jaccard_similarity(s1: str, s2: str) -> float:
    """Calcola la similarità di Jaccard tra due testi normalizzati."""
    tokens1 = set(re.findall(r"\w+", s1.lower()))
    tokens2 = set(re.findall(r"\w+", s2.lower()))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


class CreditEntityResolver:
    """Riconcilia le righe dell'Allegato f multi-anno nell'entità stabile core.investment_credit."""

    def __init__(
        self,
        ust_code: int,
        entity_id: str,
        mm_mode: Literal["YEARLY_RESET", "SEQUENTIAL"] = "YEARLY_RESET",
    ) -> None:
        self.ust_code = ust_code
        self.entity_id = entity_id
        self.mm_mode: Literal["YEARLY_RESET", "SEQUENTIAL"] = mm_mode

    def resolve_work_item(
        self,
        item: CreditWorkItem,
        existing_credits: list[dict[str, Any]],
        prev_year_snapshot: dict[str, Decimal] | None = None,
    ) -> ResolvedCreditEntity:
        """
        Riconcilia una singola opera estratta con la cascata a 4 livelli.
        """
        canon_mm = canonical_mm(item.mm_no, self.mm_mode)
        item_title = item.description.strip()

        # Livello 1: Chiave forte esatta (confidenza 1.00)
        for cand in existing_credits:
            if (
                cand.get("account_code") == item.account_code
                and cand.get("canonical_mm") == canon_mm
            ):
                return ResolvedCreditEntity(
                    ust_code=self.ust_code,
                    entity_id=self.entity_id,
                    account_code=item.account_code,
                    canonical_mm_no=canon_mm,
                    title=item_title,
                    voted_credit=item.voted_credit,
                    spent_total=item.spent_total,
                    remaining_credit=item.remaining_credit,
                    has_overrun=item.has_overrun,
                    confidence_level="EXACT_KEY",
                    confidence_score=1.00,
                    matched_parent_id=cand.get("id"),
                    needs_review=False,
                )

        # Livello 2: Continuità contabile (confidenza 0.95)
        # Se used_at_0101(T) == spent_total(T-1) per lo stesso conto MCA2
        if prev_year_snapshot and item.account_code in prev_year_snapshot:
            prev_spent = prev_year_snapshot[item.account_code]
            if abs(item.spent_prev - prev_spent) <= Decimal("1.00"):
                return ResolvedCreditEntity(
                    ust_code=self.ust_code,
                    entity_id=self.entity_id,
                    account_code=item.account_code,
                    canonical_mm_no=canon_mm,
                    title=item_title,
                    voted_credit=item.voted_credit,
                    spent_total=item.spent_total,
                    remaining_credit=item.remaining_credit,
                    has_overrun=item.has_overrun,
                    confidence_level="ACCOUNTING_CONTINUITY",
                    confidence_score=0.95,
                    matched_parent_id=None,
                    needs_review=False,
                )

        # Livello 3: Match fuzzy controllato su titolo opera (Jaccard >= 0.70)
        best_cand = None
        best_sim = 0.0
        for cand in existing_credits:
            if cand.get("account_code") == item.account_code:
                cand_title = cand.get("title", "")
                sim = _jaccard_similarity(item_title, cand_title)
                if sim > best_sim:
                    best_sim = sim
                    best_cand = cand

        if best_cand and best_sim >= 0.70:
            return ResolvedCreditEntity(
                ust_code=self.ust_code,
                entity_id=self.entity_id,
                account_code=item.account_code,
                canonical_mm_no=canon_mm,
                title=item_title,
                voted_credit=item.voted_credit,
                spent_total=item.spent_total,
                remaining_credit=item.remaining_credit,
                has_overrun=item.has_overrun,
                confidence_level="FUZZY_MATCH",
                confidence_score=round(best_sim, 2),
                matched_parent_id=best_cand.get("id"),
                needs_review=True,  # Inviato alla coda curatore per approvazione
            )

        # Livello 4: Nuovo credito d'investimento
        return ResolvedCreditEntity(
            ust_code=self.ust_code,
            entity_id=self.entity_id,
            account_code=item.account_code,
            canonical_mm_no=canon_mm,
            title=item_title,
            voted_credit=item.voted_credit,
            spent_total=item.spent_total,
            remaining_credit=item.remaining_credit,
            has_overrun=item.has_overrun,
            confidence_level="NEW_CREDIT",
            confidence_score=1.00,
            matched_parent_id=None,
            needs_review=False,
        )
