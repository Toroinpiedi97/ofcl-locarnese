"""
Classificatore di Documenti e Normalizzazione Messaggi Municipali (Task T030).

Funzionalità:
1. canonical_mm(mm_raw, mode): Risoluzione identificativo canonico (YEARLY_RESET vs SEQUENTIAL).
2. classify_text_metadata: Regole su titolo/URL per doc_type, anno fiscale, budget_stage.
3. inspect_and_classify_pdf: Ispezione prime 3 pagine PDF con pdfplumber per text-layer,
   layout family (GECOTI_V3, CRYSTAL_REPORTS, GENERIC_GRID, SCAN_IMAGE), e conferma metadati.
4. Rilevamento automatico di dati personali protetti (nLPD / LPDP) anche dal testo del PDF.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Literal

import pdfplumber

from ofcl.fetch.privacy_filter import contains_personal_data

DocType = Literal[
    "PREVENTIVO",
    "CONSUNTIVO",
    "PIANO_FINANZIARIO",
    "CREDITO_OPERA",
    "REGOLAMENTO",
    "ALTRO",
]

BudgetStage = Literal[
    "PROPOSTA",
    "EMENDATO",
    "APPROVATO",
]

LayoutFamily = Literal[
    "GECOTI_V3",
    "CRYSTAL_REPORTS",
    "GENERIC_GRID",
    "SCAN_IMAGE",
]

NumberingMode = Literal[
    "YEARLY_RESET",
    "SEQUENTIAL",
]

# Pattern per l'estrazione di numeri MM nei vari formati comunali
_MM_RAW_RE = re.compile(
    r"\b(?:MM|Messaggio\s+Municipale)\s*(?:N[°o.]?\s*)?(\d{1,4}(?:[-/]\d{2,4})?)\b",
    re.IGNORECASE,
)

_YEAR_RE = re.compile(r"\b(20\d{2})\b")

_CONSUNTIVO_YEAR_RE = re.compile(
    r"(?:consuntiv[oi]|conti|rendiconto)\s+(?:del\s+comune\s+|comunal[ei]\s+|esercizio\s+)?\b(20\d{2})\b",
    re.IGNORECASE,
)

_PREVENTIVO_YEAR_RE = re.compile(
    r"(?:preventiv[oi]|bilancio\s+preventivo)\s+(?:del\s+comune\s+|comunal[ei]\s+|esercizio\s+)?\b(20\d{2})\b",
    re.IGNORECASE,
)


@dataclass
class DocumentClassification:
    """Risultato strutturato della classificazione di un documento."""

    doc_type: DocType
    fiscal_year: int
    mm_number: str | None = None
    canonical_mm: str | None = None
    budget_stage: BudgetStage | None = None
    detected_layout_family: LayoutFamily | None = None
    confidence: Decimal = Decimal("0.85")
    classified_by: Literal["RULES", "OCR_RULES", "CURATOR"] = "RULES"
    contains_personal_data: bool = False
    has_text_layer: bool = True
    page_count: int = 1


def canonical_mm(
    mm_raw: str | None,
    mode: NumberingMode = "SEQUENTIAL",
    ref_year: int | None = None,
) -> str | None:
    """
    Normalizza la sigla del Messaggio Municipale in formato canonico univoco:
    - YEARLY_RESET (es. Ascona, Orselina, Lavertezzo): "YYYY/NNN" (es. "2023/006", "2026/008")
    - SEQUENTIAL (es. Brissago, Gordola, Brione, Centovalli): "SEQ/NNN" (es. "SEQ/1575", "SEQ/562")
    """
    if not mm_raw:
        return None

    clean = mm_raw.strip()
    match = _MM_RAW_RE.search(clean)
    num_token = match.group(1) if match else clean

    # Rimuove prefissi residui
    num_token = re.sub(r"^(?:MM|N[°o.]?)\s*", "", num_token, flags=re.IGNORECASE).strip()

    if mode == "YEARLY_RESET":
        # Formati con anno e numero: "08/2026", "2026-07", "4/2023", "06-2023"
        sep_match = re.search(r"(\d{1,4})[-/](\d{1,4})", num_token)
        if sep_match:
            p1, p2 = int(sep_match.group(1)), int(sep_match.group(2))
            # Identifica quale parte è l'anno e quale il numero
            if p1 >= 2000:
                year = p1
                num = p2
            elif p2 >= 2000:
                year = p2
                num = p1
            elif p1 in range(18, 50):  # Anno abbreviato a 2 cifre
                year = 2000 + p1
                num = p2
            elif p2 in range(18, 50):
                year = 2000 + p2
                num = p1
            else:
                year = ref_year or 2026
                num = min(p1, p2)
            return f"{year}/{num:03d}"

        # Se c'è solo il numero (es. "05") ma ref_year è fornito
        num_only = re.search(r"\b(\d{1,4})\b", num_token)
        if num_only and ref_year:
            return f"{ref_year}/{int(num_only.group(1)):03d}"

        return num_token.upper()

    # Modalità SEQUENTIAL (progressivo assoluto di legislatura / storico)
    # Se il token ha formato "562/2026", estrae il numero sequenziale primario "562"
    first_num = re.search(r"\b(\d{1,4})\b", num_token)
    if first_num:
        val = int(first_num.group(1))
        # Se il numero appare come un anno isolato (es. 2026) e non c'è altro, usa quello
        return f"SEQ/{val}"

    return num_token.upper()


def classify_text_metadata(
    title: str,
    url: str | None = None,
    ust_code: int | None = None,
    numbering_mode: NumberingMode = "SEQUENTIAL",
) -> DocumentClassification:
    """Classifica un documento analizzando esclusivamente il titolo e l'URL (Pass 1)."""
    text = f"{title} {url or ''}"
    low = text.lower()

    # 1. Determinazione DocType
    doc_type: DocType = "ALTRO"
    if "piano finanziario" in low or "piano economico" in low:
        doc_type = "PIANO_FINANZIARIO"
    elif "consuntiv" in low or "rendiconto" in low or "conti del comune" in low or "conto consuntivo" in low:
        doc_type = "CONSUNTIVO"
    elif "preventiv" in low:
        doc_type = "PREVENTIVO"
    elif "credito" in low or "richiesta di credito" in low or "credito d'opera" in low or "credito suppletorio" in low:
        doc_type = "CREDITO_OPERA"
    elif "regolamento" in low or "ordinanza" in low or "tariffario" in low or "tassa" in low:
        doc_type = "REGOLAMENTO"

    # 2. Risoluzione dell'anno fiscale MCA2
    fiscal_year: int = 2026  # default prudenziale
    if doc_type == "CONSUNTIVO":
        m_cons = _CONSUNTIVO_YEAR_RE.search(title)
        if m_cons:
            fiscal_year = int(m_cons.group(1))
        else:
            # Se è presente un anno nel testo
            years = [int(y) for y in _YEAR_RE.findall(title) if 2018 <= int(y) <= 2035]
            fiscal_year = years[0] if years else 2025
    elif doc_type == "PREVENTIVO":
        m_prev = _PREVENTIVO_YEAR_RE.search(title)
        if m_prev:
            fiscal_year = int(m_prev.group(1))
        else:
            years = [int(y) for y in _YEAR_RE.findall(title) if 2018 <= int(y) <= 2035]
            fiscal_year = years[0] if years else 2026
    else:
        years = [int(y) for y in _YEAR_RE.findall(title) if 2018 <= int(y) <= 2035]
        if years:
            fiscal_year = years[0]

    # 3. Estrazione MM e Canonical MM
    mm_match = _MM_RAW_RE.search(title)
    mm_number = f"MM {mm_match.group(1)}" if mm_match else None
    canonical = canonical_mm(mm_number, mode=numbering_mode, ref_year=fiscal_year) if mm_number else None

    # 4. Budget stage
    stage: BudgetStage = "PROPOSTA"
    if "approvat" in low or "risoluzione" in low or "decisione" in low:
        stage = "APPROVATO"
    elif "emendat" in low:
        stage = "EMENDATO"

    # 5. Dati personali (nLPD)
    has_pii = contains_personal_data(title)

    return DocumentClassification(
        doc_type=doc_type,
        fiscal_year=fiscal_year,
        mm_number=mm_number,
        canonical_mm=canonical,
        budget_stage=stage,
        confidence=Decimal("0.85"),
        classified_by="RULES",
        contains_personal_data=has_pii,
        has_text_layer=True,
    )


def inspect_and_classify_pdf(
    pdf_path: Path,
    title: str = "",
    url: str = "",
    ust_code: int = 5096,
    numbering_mode: NumberingMode = "SEQUENTIAL",
    max_pages_to_inspect: int = 3,
) -> DocumentClassification:
    """
    Ispeziona le prime pagine del PDF fisico con pdfplumber per determinare:
    - Presenza del text layer
    - Layout family (GECOTI_V3, CRYSTAL_REPORTS, GENERIC_GRID, SCAN_IMAGE)
    - Conferma o rettifica di doc_type, anno fiscale, MM number e nLPD (Pass 2).
    """
    initial = classify_text_metadata(
        title or pdf_path.stem,
        url=url,
        ust_code=ust_code,
        numbering_mode=numbering_mode,
    )

    if not pdf_path.exists() or pdf_path.stat().st_size == 0:
        return initial

    try:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            pages_to_read = min(page_count, max_pages_to_inspect)

            extracted_texts: list[str] = []
            for i in range(pages_to_read):
                t = pdf.pages[i].extract_text() or ""
                extracted_texts.append(t)

            combined_text = "\n".join(extracted_texts).strip()
            char_count = len(combined_text)

            # Rilevamento text layer
            has_text_layer = char_count >= 80

            if not has_text_layer:
                initial.detected_layout_family = "SCAN_IMAGE"
                initial.has_text_layer = False
                initial.page_count = page_count
                initial.confidence = Decimal("0.70")
                return initial

            low_pdf = combined_text.lower()

            # Rilevamento layout family
            layout: LayoutFamily = "GENERIC_GRID"
            if (
                "ge.co.ti" in low_pdf
                or "gecoti" in low_pdf
                or "cce gordola" in low_pdf
                or "centro comune elettronico" in low_pdf
            ):
                layout = "GECOTI_V3"
            elif "crystal reports" in low_pdf or "sap" in low_pdf or "rpt" in low_pdf:
                layout = "CRYSTAL_REPORTS"

            # Raffinamento DocType dal frontespizio ufficiale del PDF
            refined_type = initial.doc_type
            if "piano finanziario" in low_pdf:
                refined_type = "PIANO_FINANZIARIO"
            elif "consuntivo" in low_pdf or "conto consuntivo" in low_pdf or "conti comunali" in low_pdf:
                refined_type = "CONSUNTIVO"
            elif "preventivo" in low_pdf or "conto preventivo" in low_pdf:
                refined_type = "PREVENTIVO"
            elif "richiesta di credito" in low_pdf or "credito d'opera" in low_pdf:
                refined_type = "CREDITO_OPERA"

            # Raffinamento Anno Fiscale
            refined_year = initial.fiscal_year
            if refined_type == "CONSUNTIVO":
                m_cons = _CONSUNTIVO_YEAR_RE.search(combined_text)
                if m_cons:
                    refined_year = int(m_cons.group(1))
            elif refined_type == "PREVENTIVO":
                m_prev = _PREVENTIVO_YEAR_RE.search(combined_text)
                if m_prev:
                    refined_year = int(m_prev.group(1))

            # Raffinamento MM number
            refined_mm = initial.mm_number
            mm_match = _MM_RAW_RE.search(combined_text)
            if mm_match:
                refined_mm = f"MM {mm_match.group(1)}"

            # Canonical MM
            refined_canonical = (
                canonical_mm(refined_mm, mode=numbering_mode, ref_year=refined_year)
                if refined_mm
                else initial.canonical_mm
            )

            # Verifica privacy nLPD su tutte le pagine lette
            pdf_has_pii = initial.contains_personal_data or contains_personal_data(combined_text)

            # Calcolo confidenza
            confidence = Decimal("1.00") if refined_type == initial.doc_type else Decimal("0.90")

            return DocumentClassification(
                doc_type=refined_type,
                fiscal_year=refined_year,
                mm_number=refined_mm,
                canonical_mm=refined_canonical,
                budget_stage=initial.budget_stage,
                detected_layout_family=layout,
                confidence=confidence,
                classified_by="RULES",
                contains_personal_data=pdf_has_pii,
                has_text_layer=True,
                page_count=page_count,
            )

    except Exception:  # noqa: BLE001
        initial.confidence = Decimal("0.70")
        return initial


def classify_document(
    title: str,
    pdf_path: Path | None = None,
    url: str | None = None,
    ust_code: int = 5096,
    numbering_mode: NumberingMode = "SEQUENTIAL",
) -> DocumentClassification:
    """Funzione principale d'ingresso per la classificazione di un documento OFCL."""
    if pdf_path and pdf_path.exists():
        return inspect_and_classify_pdf(
            pdf_path=pdf_path,
            title=title,
            url=url or "",
            ust_code=ust_code,
            numbering_mode=numbering_mode,
        )
    return classify_text_metadata(
        title=title,
        url=url,
        ust_code=ust_code,
        numbering_mode=numbering_mode,
    )
