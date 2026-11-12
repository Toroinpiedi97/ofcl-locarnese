"""
Modelli dati per l'acquisizione cortese dei documenti dai 19 Comuni del Locarnese.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
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
    summary_md: str | None = None  # Estratto Fit-Markdown pulito (se pagina di 2° livello)
    selector_relocated: bool = False  # True se individuato tramite rilocazione adattiva Scrapling
    metadata: dict[str, Any] = field(default_factory=dict)


DownloadStatus = Literal[
    "DOWNLOADED",
    "CACHED",
    "NOT_MODIFIED",
    "SKIPPED_PRIVACY",
    "SKIPPED_GUARD",
    "TOO_LARGE",
    "INVALID_PDF",
    "ERROR",
]


@dataclass
class DownloadResult:
    """Risultato del download e deduplicazione crittografica di un PDF."""

    doc: DiscoveredDocument
    status: DownloadStatus
    sha256: str | None = None
    size_bytes: int = 0
    local_path: Path | None = None
    r2_key: str | None = None
    etag: str | None = None
    last_modified: str | None = None
    error: str | None = None
