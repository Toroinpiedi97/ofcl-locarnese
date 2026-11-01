"""
Filtro Preventivo di Conformità nLPD / LPDP (Guardrail C-04).

Identifica ed esclude preventivamente dalla pubblicazione aperta i Messaggi Municipali
o risoluzioni che trattano dati personali di persone fisiche (condoni, sgravi nominativi,
assistenza sociale, naturalizzazioni, espropri, tutele).
"""

from __future__ import annotations

import re

# Termini sentinella di dati personali nei comuni ticinesi
_SENSITIVE_KEYWORDS = frozenset({
    "naturalizzazione",
    "attinenza",
    "cittadinanza",
    "condono",
    "sgravio fiscale",
    "tassazione",
    "reclamo fiscale",
    "aiuto sociale",
    "soccorso d'inverno",
    "assistenza",
    "curatela",
    "tutela",
    "esproprio",
    "diffida",
    "sanzione",
    "ingiunzione",
    "contravvenzione",
})

_SENSITIVE_REGEX = re.compile(
    r"\b(?:" + "|".join(re.escape(k) for k in _SENSITIVE_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def contains_personal_data(text: str | None) -> bool:
    """Restituisce True se il testo contiene riferimenti a categorie protette nLPD."""
    if not text:
        return False
    return bool(_SENSITIVE_REGEX.search(text))
