"""
Filtro Preventivo di Conformità nLPD / LPDP (Guardrail C-04).

Identifica ed esclude preventivamente dalla pubblicazione aperta i Messaggi Municipali
o risoluzioni che trattano dati personali di persone fisiche (condoni, sgravi nominativi,
assistenza sociale, naturalizzazioni, espropri, tutele).

Carica le parole chiave da `registry/glossario.yaml` (sezione `privacy_blacklist`)
con fallback robusto su costanti predefinite.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

# Fallback predefinito se il file di configurazione non è accessibile
_DEFAULT_SENSITIVE_KEYWORDS: frozenset[str] = frozenset({
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
    "espropriazione",
    "diffida",
    "sanzione",
    "ingiunzione",
    "contravvenzione",
    "multa",
    "dati personali",
    "domanda di grazia",
})


def _get_glossario_keywords() -> frozenset[str]:
    """Carica le keyword di esclusione nLPD da registry/glossario.yaml."""
    try:
        repo_root = Path(__file__).resolve().parents[4]
        glossario_path = repo_root / "registry" / "glossario.yaml"
        if glossario_path.exists():
            data = yaml.safe_load(glossario_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                kws = data.get("privacy_blacklist", {}).get("keywords", [])
                if kws:
                    return frozenset(kws).union(_DEFAULT_SENSITIVE_KEYWORDS)
    except Exception:  # noqa: BLE001, S110
        pass
    return _DEFAULT_SENSITIVE_KEYWORDS


_ACTIVE_KEYWORDS = _get_glossario_keywords()
_SENSITIVE_REGEX = re.compile(
    r"\b(?:" + "|".join(re.escape(k) for k in _ACTIVE_KEYWORDS) + r")\b",
    re.IGNORECASE,
)


def contains_personal_data(text: str | None) -> bool:
    """Restituisce True se il testo contiene riferimenti a categorie protette nLPD."""
    if not text:
        return False
    return bool(_SENSITIVE_REGEX.search(text))
