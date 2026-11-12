"""
Suite di Regressione Golden Set MCA2 (Task T031 & Criterio L3).
Conformità: docs/spec/11-testing-qa-goldenset.md §L3.
Target: 100.0% accuracy (errore 0.00 CHF) su tutti i subtotali del Riassunto Generale.
"""

import json
from decimal import Decimal
from pathlib import Path

import pdfplumber
import pytest
import yaml

from ofcl.extract.pdf_inspector import inspect_pdf
from ofcl.extract.table_extractor import TableExtractor

GOLDEN_DIR = Path(__file__).resolve().parent
MANIFEST_PATH = GOLDEN_DIR / "manifest.yaml"
DATA_PDFS_DIR = GOLDEN_DIR.parent.parent.parent / "data" / "raw_pdfs"


def load_manifest() -> list[dict]:
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("golden_set", [])


def test_golden_manifest_contains_25_slots() -> None:
    """Verifica che il Golden Set contenga esattamente 25 documenti secondo specifica L3."""
    items = load_manifest()
    assert len(items) == 25

    # Conteggi per categoria secondo spec 11-testing §L3:
    # 13 Assolo, 3 WP, 2 Joomla, 2 Locarno, 2 Aziende, 2 OCR, 1 Credito Complesso
    assolo_items = [i for i in items if i["cms_archetype"] == "ASSOLO"]
    assert len(assolo_items) >= 13


def test_golden_brione_consuntivo_2025_exact_match() -> None:
    """
    Verifica L3: Errore 0.00 CHF (100.0% accuracy) sul Consuntivo 2025 di Brione s/Minusio (GS-01).
    """
    pdf_path = (
        DATA_PDFS_DIR
        / "5096"
        / "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf"
    )
    if not pdf_path.exists():
        pytest.skip(f"Golden PDF non presente localmente: {pdf_path}")

    expected_path = (
        GOLDEN_DIR
        / "expected"
        / "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.json"
    )
    with open(expected_path, encoding="utf-8") as f:
        expected = json.load(f)

    # 1. Ispezione PDF
    report = inspect_pdf(pdf_path)
    assert report.sha256 == expected["sha256"]
    assert report.layout_family == "GECOTI_V3"
    assert report.metadata.get("tax_multiplier_pct") == expected["tax_multiplier_pct"]

    extractor = TableExtractor(report.layout_family)
    with pdfplumber.open(pdf_path) as pdf:
        # 2. Riassunto Generale (Art. 22 lett. a RGFCC)
        rg_pages = report.sections.get("lett_a", [5, 6])
        rg_cells = extractor.extract_riassunto_generale(pdf, rg_pages)

        # Confronto 100% esatto a 0.00 CHF di errore su ogni subtotale
        exp_ce = expected["riassunto_generale"]["conto_economico"]
        for metric, exp_val in exp_ce.items():
            assert metric in rg_cells, f"Metrica mancante nel Riassunto: {metric}"
            extracted_val = rg_cells[metric].amount_chf
            assert extracted_val is not None
            expected_decimal = Decimal(exp_val)
            delta = abs(extracted_val - expected_decimal)
            assert delta == Decimal("0.00"), (
                f"Errore centesimale su {metric}: estratto {extracted_val} != atteso {expected_decimal}"
            )

        exp_ci = expected["riassunto_generale"]["conto_investimenti"]
        for metric, exp_val in exp_ci.items():
            assert metric in rg_cells, f"Metrica mancante nel Riassunto CI: {metric}"
            extracted_val = rg_cells[metric].amount_chf
            assert extracted_val is not None
            expected_decimal = Decimal(exp_val)
            delta = abs(extracted_val - expected_decimal)
            assert delta == Decimal("0.00"), (
                f"Errore centesimale su {metric}: estratto {extracted_val} != atteso {expected_decimal}"
            )

        exp_cf = expected["riassunto_generale"]["conto_finanziamento"]
        for metric, exp_val in exp_cf.items():
            assert metric in rg_cells, f"Metrica mancante nel Finanziamento: {metric}"
            extracted_val = rg_cells[metric].amount_chf
            assert extracted_val is not None
            expected_decimal = Decimal(exp_val)
            delta = abs(extracted_val - expected_decimal)
            assert delta == Decimal("0.00"), (
                f"Errore centesimale su {metric}: estratto {extracted_val} != atteso {expected_decimal}"
            )

        exp_bil = expected["riassunto_generale"]["bilancio"]
        for metric, exp_val in exp_bil.items():
            assert metric in rg_cells, f"Metrica mancante nel Bilancio: {metric}"
            extracted_val = rg_cells[metric].amount_chf
            assert extracted_val is not None
            expected_decimal = Decimal(exp_val)
            delta = abs(extracted_val - expected_decimal)
            assert delta == Decimal("0.00"), (
                f"Errore centesimale su {metric}: estratto {extracted_val} != atteso {expected_decimal}"
            )

        # 3. Indicatori SEL (Art. 22 lett. o RGFCC)
        sel_pages = report.sections.get("lett_o", [12, 13])
        sel_indicators = extractor.extract_indicatori_sel(pdf, sel_pages)
        for key, exp_val in expected["indicatori_sel"].items():
            assert key in sel_indicators, f"Indicatore SEL mancante: {key}"
            assert sel_indicators[key].amount_chf == Decimal(str(exp_val))

        # 4. Tabella Controllo Crediti (Art. 22 lett. f RGFCC)
        f_pages = report.sections.get("lett_f", [126, 127])
        credit_items, credit_totals = extractor.extract_controllo_crediti(pdf, f_pages)

        exp_cred = expected["controllo_crediti"]
        assert credit_totals["totale_investimenti_votati"].amount_chf == Decimal(
            exp_cred["totale_investimenti_votati"]
        )
        assert credit_totals["totale_crediti_consumati_01_01"].amount_chf == Decimal(
            exp_cred["totale_crediti_consumati_01_01"]
        )
        assert credit_totals["totale_spese_lorde_esercizio"].amount_chf == Decimal(
            exp_cred["totale_spese_lorde_esercizio"]
        )
        assert credit_totals["totale_crediti_consumati_31_12"].amount_chf == Decimal(
            exp_cred["totale_crediti_consumati_31_12"]
        )

        # Controllo sorpasso Jacomello
        jacomello_exp = exp_cred["tornante_jacomello"]
        jacomello_item = next(i for i in credit_items if i.account_code == jacomello_exp["conto"])
        assert jacomello_item.remaining_credit == Decimal(jacomello_exp["credito_residuo"])
        assert jacomello_item.has_overrun is True
