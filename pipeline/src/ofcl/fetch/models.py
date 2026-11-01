"""
Modelli dati per l'acquisizione cortese dei documenti dai 19 Comuni del Locarnese.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

DocKind = Literal[
    "PREVENTIVO",
    "CONSUNTIVO",
    "PIANO_FINANZIARIO",
    "CREDITO_INVESTIMENTO",
    "RAPPORTO_COMMISSIONE",
    "ALTRO",
]


@dataclass(frozen=True)
class DiscoveredDocument:
    """Documento individuato all'albo o nella sezione finanziaria del Comune."""

    ust_code: int
    municipality_slug: str
    title: str
    doc_url: str
    page_url: str
    doc_kind: DocKind
    published_date: date | None = None
    mm_number: str | None = None  # es. 'MM 08/2026'
    fiscal_year: int | None = None  # es. 2026 o 2027
    contains_personal_data: bool = False  # Guardrail nLPD / LPDP
    metadata: dict[str, Any] = field(default_factory=dict)
