"""
Suite di test per il Classificatore di Documenti e la Normalizzazione MCA2 (Task T030).
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from ofcl.classify.classifier import (
    canonical_mm,
    classify_document,
    classify_text_metadata,
    inspect_and_classify_pdf,
)


def test_canonical_mm_yearly_reset() -> None:
    """Verifica normalizzazione MM per Comuni con numerazione annuale (YEARLY_RESET)."""
    assert canonical_mm("MM no. 06-2023", mode="YEARLY_RESET") == "2023/006"
    assert canonical_mm("MM 08/2026", mode="YEARLY_RESET") == "2026/008"
    assert canonical_mm("MM 2026-07", mode="YEARLY_RESET") == "2026/007"
    assert canonical_mm("MM 4/2023", mode="YEARLY_RESET") == "2023/004"
    assert canonical_mm("MM 05", mode="YEARLY_RESET", ref_year=2026) == "2026/005"
    assert canonical_mm(None, mode="YEARLY_RESET") is None


def test_canonical_mm_sequential() -> None:
    """Verifica normalizzazione MM per Comuni con numerazione progressiva continua (SEQUENTIAL)."""
    assert canonical_mm("MM 1575", mode="SEQUENTIAL") == "SEQ/1575"
    assert canonical_mm("MM 562", mode="SEQUENTIAL") == "SEQ/562"
    assert canonical_mm("MM 294", mode="SEQUENTIAL") == "SEQ/294"
    assert canonical_mm("MM 1506", mode="SEQUENTIAL") == "SEQ/1506"
    assert canonical_mm("MM 470", mode="SEQUENTIAL") == "SEQ/470"
    assert canonical_mm("MM 562/2026", mode="SEQUENTIAL") == "SEQ/562"
    assert canonical_mm(None, mode="SEQUENTIAL") is None


def test_classify_text_metadata_consuntivo() -> None:
    """Verifica classificazione di un consuntivo con sfasamento anno rispetto al MM."""
    res = classify_text_metadata(
        "MM 08/2026 - Conti del Comune 2025",
        numbering_mode="YEARLY_RESET",
    )
    assert res.doc_type == "CONSUNTIVO"
    assert res.fiscal_year == 2025  # Anno del consuntivo, non del MM
    assert res.mm_number == "MM 08/2026"
    assert res.canonical_mm == "2026/008"
    assert res.budget_stage == "PROPOSTA"
    assert res.contains_personal_data is False


def test_classify_text_metadata_preventivo_approvato() -> None:
    """Verifica classificazione preventivo e stage APPROVATO."""
    res = classify_text_metadata(
        "Preventivo Comune 2026 - conti approvati CC 22.12.2025",
        numbering_mode="SEQUENTIAL",
    )
    assert res.doc_type == "PREVENTIVO"
    assert res.fiscal_year == 2026
    assert res.budget_stage == "APPROVATO"
    assert res.contains_personal_data is False


def test_classify_text_metadata_credito_opera() -> None:
    """Verifica classificazione richiesta di credito d'investimento."""
    res = classify_text_metadata(
        "MM 563 - Richiesta di un credito suppletorio per Casa Erina",
        numbering_mode="SEQUENTIAL",
    )
    assert res.doc_type == "CREDITO_OPERA"
    assert res.mm_number == "MM 563"
    assert res.canonical_mm == "SEQ/563"


def test_classify_text_metadata_nlpd_exclusion() -> None:
    """Verifica intercettazione automatica dei dati personali nel titolo."""
    res = classify_text_metadata("Domanda di naturalizzazione della famiglia Rossi")
    assert res.contains_personal_data is True


def test_inspect_and_classify_pdf_real_brione_consuntivo() -> None:
    """Verifica ispezione reale con pdfplumber sul consuntivo 2025 di Brione sopra Minusio."""
    repo_root = Path(__file__).resolve().parents[2]
    pdf_path = (
        repo_root
        / "data"
        / "raw_pdfs"
        / "5096"
        / "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf"
    )

    if not pdf_path.exists():
        return

    res = inspect_and_classify_pdf(
        pdf_path=pdf_path,
        title="MM 562 - Consuntivo comunale 2025",
        ust_code=5096,
        numbering_mode="SEQUENTIAL",
    )

    assert res.doc_type == "CONSUNTIVO"
    assert res.fiscal_year == 2025
    assert res.mm_number == "MM 562"
    assert res.canonical_mm == "SEQ/562"
    assert res.has_text_layer is True
    assert res.page_count == 152
    assert res.confidence == Decimal("1.00")
    assert res.contains_personal_data is False


def test_classify_document_dispatcher() -> None:
    """Verifica che classify_document funga da dispatcher trasparente."""
    res = classify_document(
        title="MM 294 - Preventivo comunale 2026",
        ust_code=5098,
        numbering_mode="SEQUENTIAL",
    )
    assert res.doc_type == "PREVENTIVO"
    assert res.fiscal_year == 2026
    assert res.canonical_mm == "SEQ/294"
