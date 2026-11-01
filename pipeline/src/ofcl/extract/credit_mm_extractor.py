"""
Estrattore Metadati per Messaggi Municipali di Richiesta Credito (Task T035).
Conformità: docs/spec/08-crediti-cespiti-lifecycle.md §3.1 e §4.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from ofcl.extract.chf_parser import parse_chf

_AMOUNT_VOTED_PATTERNS = [
    re.compile(r"credito\s+(?:quadro\s+)?(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
    re.compile(r"importo\s+(?:complessivo\s+)?(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
    re.compile(r"spesa\s+(?:lorda\s+)?(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
]

_SUBSIDY_PATTERNS = [
    re.compile(r"sussidi[oi]?\s+(?:cantonale|paloc|fer|previsto)?\s*(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
    re.compile(r"contribut[oi]\s+(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
]

_NET_PATTERNS = [
    re.compile(r"(?:onere|spesa)\s+nett[ao]\s+(?:a\s+carico\s+del\s+comune\s+)?(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
    re.compile(r"costo\s+netto\s+(?:di\s+)?(?:fr\.?|chf)?\s*([0-9'’]+(?:\.[0-9]{2})?)", re.IGNORECASE),
]


@dataclass
class CreditMmMetadata:
    """Metadati estratti da un Messaggio Municipale di richiesta credito."""

    amount_gross: Decimal | None
    subsidies_expected: Decimal | None
    net_expected: Decimal | None
    vat_included: bool
    work_category: str | None
    confidence: float
    raw_snippets: dict[str, str]


class CreditMmExtractor:
    """Estrae gli importi lordi, sussidi ed oneri netti dai Messaggi Municipali puntuali."""

    @staticmethod
    def extract_from_text(text: str) -> CreditMmMetadata:
        snippets: dict[str, str] = {}
        gross: Decimal | None = None
        subsidies: Decimal | None = None
        net: Decimal | None = None

        # 1. Credito Lordo / Richiesto
        for pat in _AMOUNT_VOTED_PATTERNS:
            m = pat.search(text)
            if m:
                raw = m.group(1)
                try:
                    val = parse_chf(raw)
                    if val and val > Decimal("1000.00"):
                        gross = val
                        snippets["gross"] = m.group(0)
                        break
                except ValueError:
                    pass

        # 2. Sussidi attesi
        for pat in _SUBSIDY_PATTERNS:
            m = pat.search(text)
            if m:
                raw = m.group(1)
                try:
                    val = parse_chf(raw)
                    if val and val > Decimal("0.00"):
                        subsidies = val
                        snippets["subsidies"] = m.group(0)
                        break
                except ValueError:
                    pass

        # 3. Onere Netto a carico del Comune
        for pat in _NET_PATTERNS:
            m = pat.search(text)
            if m:
                raw = m.group(1)
                try:
                    val = parse_chf(raw)
                    if val and val > Decimal("0.00"):
                        net = val
                        snippets["net"] = m.group(0)
                        break
                except ValueError:
                    pass

        # Se net non è esplicitato ma abbiamo gross e subsidies: net = gross - subsidies
        if net is None and gross is not None and subsidies is not None:
            net = gross - subsidies

        # 4. Regime IVA
        low = text.lower()
        vat_included = "iva inclusa" in low or "iva compresa" in low or ("iva" not in low and "escl" not in low)

        # 5. Categoria d'opera
        category = None
        if any(w in low for w in ["strad", "marciapied", "viabilit"]):
            category = "VIABILITA_STRADE"
        elif any(w in low for w in ["scuol", "palestr", "asilo", "infanzia"]):
            category = "EDILIZIA_SCOLASTICA"
        elif any(w in low for w in ["canalizz", "depura", "fogn"]):
            category = "CANALIZZAZIONI_DEPURAZIONE"
        elif any(w in low for w in ["acquedot", "acqua potabile", "bacino"]):
            category = "ACQUA_POTABILE"

        confidence = 0.90 if gross is not None else 0.50

        return CreditMmMetadata(
            amount_gross=gross,
            subsidies_expected=subsidies,
            net_expected=net,
            vat_included=vat_included,
            work_category=category,
            confidence=confidence,
            raw_snippets=snippets,
        )
