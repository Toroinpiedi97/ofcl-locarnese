"""
Ispezione Geometrica e Indicizzazione Sezioni PDF MCA2 (Task T032).

Funzionalità:
1. Rilevamento Text Layer e qualifica (GECOTI_V3, CRYSTAL_REPORTS, GENERIC_GRID, SCAN_IMAGE).
2. Indicizzatore pagine per le sezioni canoniche dell'art. 22 RGFCC:
   - lett. a: Riassunto generale (CE a 3 stadi, CI, finanziamento, bilancio)
   - lett. b: Dettaglio del conto economico e investimenti
   - lett. c: Ricapitolazione per genere di conto (natura a 4 cifre)
   - lett. d: Ricapitolazione per dicastero / classificazione funzionale
   - lett. e: Tabella dei cespiti (beni amministrativi)
   - lett. f: Tabella di controllo dei crediti d'investimento
   - lett. g: Bilancio (Stato patrimoniale)
   - lett. o: Analisi finanziaria (8 Indicatori SEL)
3. Estrazione metadati di sistema (header Ge.Co.Ti., timestamp, colonne comparative).
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import pdfplumber

logger = logging.getLogger(__name__)

LayoutFamily = Literal[
    "GECOTI_V3",
    "CRYSTAL_REPORTS",
    "GENERIC_GRID",
    "SCAN_IMAGE",
]

_GECOTI_TIMESTAMP_RE = re.compile(r"\b(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}:\d{2})\b")
_MULTIPLIER_RE = re.compile(r"moltiplicatore\s+(?:pf\s+)?(\d{1,3}(?:\.\d+)?)\s*%", re.IGNORECASE)

# Vocabolario canonico delle sezioni art. 22 RGFCC
SECTION_PATTERNS = {
    "lett_a": [
        re.compile(r"riassunto\s+del\s+(?:consuntivo|preventivo)", re.IGNORECASE),
        re.compile(r"riassunto\s+generale", re.IGNORECASE),
    ],
    "lett_c": [
        re.compile(r"ricapitolazione\s+per\s+genere\s+di\s+conto", re.IGNORECASE),
        re.compile(r"ripartizione\s+per\s+genere\s+di\s+conto", re.IGNORECASE),
        re.compile(r"per\s+genere\s+di\s+conto", re.IGNORECASE),
    ],
    "lett_d": [
        re.compile(r"ricapitolazione\s+per\s+dicaster", re.IGNORECASE),
        re.compile(r"classificazione\s+funzionale", re.IGNORECASE),
        re.compile(r"ripartizione\s+istituzionale", re.IGNORECASE),
    ],
    "lett_e": [
        re.compile(r"tabella\s+dei\s+cespiti", re.IGNORECASE),
        re.compile(r"beni\s+amministrativi", re.IGNORECASE),
        re.compile(r"tabell[ae]\s+degli\s+ammortamenti", re.IGNORECASE),
    ],
    "lett_f": [
        re.compile(r"tabella\s+(?:di\s+)?controllo\s+dei\s+crediti", re.IGNORECASE),
        re.compile(r"controllo\s+crediti", re.IGNORECASE),
        re.compile(r"crediti\s+d'investimento", re.IGNORECASE),
    ],
    "lett_g": [
        re.compile(r"bilancio\s+(?:al|stato\s+patrimoniale)", re.IGNORECASE),
        re.compile(r"stato\s+patrimoniale", re.IGNORECASE),
    ],
    "lett_o": [
        re.compile(r"indicatori\s+finanziari", re.IGNORECASE),
        re.compile(r"analisi\s+finanziaria", re.IGNORECASE),
    ],
    "lett_b": [
        re.compile(r"dettaglio\s+del\s+conto", re.IGNORECASE),
        re.compile(r"esame\s+del\s+conto\s+economico", re.IGNORECASE),
    ],
}


@dataclass
class PdfInspectionReport:
    """Rapporto di ispezione geometrica e strutturale di un PDF contabile."""

    pdf_path: Path
    sha256: str
    page_count: int
    has_text_layer: bool
    layout_family: LayoutFamily
    sections: dict[str, list[int]] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


def compute_sha256(path: Path) -> str:
    """Calcola l'hash crittografico SHA-256 del file."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


class PdfInspector:
    """Ispeziona la struttura interna dei PDF MCA2."""

    def __init__(self, pdf_path: Path) -> None:
        self.pdf_path = pdf_path
        self.sha256: str = ""

    def inspect(self, *, max_pages_for_detection: int = 5) -> PdfInspectionReport:
        """Esegue l'ispezione completa del PDF, indicizzando le sezioni art. 22 RGFCC."""
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"File PDF non trovato: {self.pdf_path}")

        try:
            self.sha256 = compute_sha256(self.pdf_path)
            with pdfplumber.open(self.pdf_path) as pdf:
                page_count = len(pdf.pages)
                if page_count == 0:
                    return PdfInspectionReport(
                        pdf_path=self.pdf_path,
                        sha256=self.sha256,
                        page_count=0,
                        has_text_layer=False,
                        layout_family="SCAN_IMAGE",
                    )

                # 1. Verifica Text Layer sulle prime pagine
                detection_pages = min(page_count, max_pages_for_detection)
                first_pages_text = [
                    pdf.pages[i].extract_text() or "" for i in range(detection_pages)
                ]
                combined_first = "\n".join(first_pages_text)
                has_text_layer = len(combined_first.strip()) >= 80

                if not has_text_layer:
                    return PdfInspectionReport(
                        pdf_path=self.pdf_path,
                        sha256=self.sha256,
                        page_count=page_count,
                        has_text_layer=False,
                        layout_family="SCAN_IMAGE",
                    )

                # 2. Scansione pagine e Rilevamento Layout Family
                # Raccogliamo i testi per sezioni e layout
                sections: dict[str, list[int]] = {}
                metadata: dict[str, Any] = {}
                found_gecoti = False
                found_crystal = False

                for page_idx, page in enumerate(pdf.pages):
                    page_num = page_idx + 1
                    text = page.extract_text() or ""
                    if not text:
                        continue

                    lines = text.splitlines()
                    header_text = " ".join(lines[:6])
                    low_header = header_text.lower()

                    # Controllo marcatori Ge.Co.Ti. / CCE Gordola
                    if (
                        "mca2" in low_header
                        or "ge.co.ti" in low_header
                        or "gecoti" in low_header
                        or "cce gordola" in low_header
                        or "centro comune elettronico" in low_header
                        or bool(_GECOTI_TIMESTAMP_RE.search(header_text))
                    ):
                        found_gecoti = True

                    if "crystal reports" in low_header or "seagate" in low_header:
                        found_crystal = True

                    # Metadati da header
                    if "generation_timestamp" not in metadata:
                        ts_match = _GECOTI_TIMESTAMP_RE.search(header_text)
                        if ts_match:
                            metadata["generation_timestamp"] = ts_match.group(1)

                    if "tax_multiplier_pct" not in metadata:
                        mult_match = _MULTIPLIER_RE.search(header_text)
                        if mult_match:
                            metadata["tax_multiplier_pct"] = float(mult_match.group(1))

                    # Indicizzazione sezioni art. 22 RGFCC
                    matched_section = False
                    for sec_code, patterns in SECTION_PATTERNS.items():
                        for pat in patterns:
                            if pat.search(header_text):
                                sections.setdefault(sec_code, []).append(page_num)
                                matched_section = True
                                break
                        if matched_section:
                            break

                    # Rilevamento pagine di continuazione per tabelle multi-pagina (es. lett_f crediti)
                    if (
                        not matched_section
                        and "lett_f" in sections
                        and page_num == sections["lett_f"][-1] + 1
                        and (
                            "credito consumato" in text.lower()
                            or "totale investimenti" in text.lower()
                        )
                    ):
                        sections["lett_f"].append(page_num)

                # Determinazione LayoutFamily
                layout: LayoutFamily = "GENERIC_GRID"
                if found_gecoti:
                    layout = "GECOTI_V3"
                elif found_crystal:
                    layout = "CRYSTAL_REPORTS"

                return PdfInspectionReport(
                    pdf_path=self.pdf_path,
                    sha256=self.sha256,
                    page_count=page_count,
                    has_text_layer=True,
                    layout_family=layout,
                    sections=sections,
                    metadata=metadata,
                )
        except Exception as err:
            logger.exception("Errore durante l'ispezione del PDF %s", self.pdf_path)
            return PdfInspectionReport(
                pdf_path=self.pdf_path,
                sha256=self.sha256,
                page_count=0,
                has_text_layer=False,
                layout_family="SCAN_IMAGE",
                metadata={
                    "error": str(err),
                    "error_type": type(err).__name__,
                    "error_code": "CORRUPT_OR_UNREADABLE_PDF",
                },
            )


def inspect_pdf(pdf_path: Path) -> PdfInspectionReport:
    """Helper di alto livello per ispezionare un PDF contabile."""
    inspector = PdfInspector(pdf_path)
    return inspector.inspect()
