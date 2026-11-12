"""
Test per TableExtractor (Task T033 & T034).
Verifica:
1. Estrazione del Riassunto Generale con precisione a 0.01 CHF e tracciamento page + bbox.
2. Estrazione degli 8 indicatori finanziari SEL ufficiali.
3. Estrazione delle singole opere di credito (Allegato f), calcolo sorpasso e totali.
"""

from decimal import Decimal
from pathlib import Path

import pdfplumber
import pytest

from ofcl.extract.table_extractor import TableExtractor

REPO_ROOT = Path(__file__).resolve().parents[2]
BRIONE_PDF = (
    REPO_ROOT
    / "data"
    / "raw_pdfs"
    / "5096"
    / "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf"
)


@pytest.mark.skipif(not BRIONE_PDF.exists(), reason="PDF reale Brione non presente localmente")
def test_extract_riassunto_generale_brione_2025() -> None:
    extractor = TableExtractor("GECOTI_V3")
    with pdfplumber.open(BRIONE_PDF) as pdf:
        cells = extractor.extract_riassunto_generale(pdf, [5, 6])

    # 1. Spese e Ricavi Operativi
    assert cells["spese_operative"].amount_chf == Decimal("3057410.26")
    assert cells["spese_operative"].page == 5
    assert len(cells["spese_operative"].bbox) == 4

    assert cells["ricavi_operativi"].amount_chf == Decimal("2991727.57")
    assert cells["risultato_operativo"].amount_chf == Decimal("-65682.69")

    # 2. Risultato Ordinario ed Esercizio
    assert cells["risultato_ordinario"].amount_chf == Decimal("163418.01")
    assert cells["risultato_totale_esercizio"].amount_chf == Decimal("163418.01")

    # 3. Investimenti e Finanziamento
    assert cells["uscite_investimenti"].amount_chf == Decimal("823840.43")
    assert cells["entrate_investimenti"].amount_chf == Decimal("22344.65")
    assert cells["onere_netto_investimenti"].amount_chf == Decimal("801495.78")
    assert cells["autofinanziamento"].amount_chf == Decimal("437731.39")
    assert cells["risultato_globale"].amount_chf == Decimal("-363764.39")

    # 4. Bilancio (Stato patrimoniale)
    assert cells["beni_patrimoniali"].amount_chf == Decimal("3189910.20")
    assert cells["beni_amministrativi"].amount_chf == Decimal("6532296.64")
    assert cells["totale_attivi"].amount_chf == Decimal("9722206.84")
    assert cells["capitale_terzi"].amount_chf == Decimal("8312008.43")
    assert cells["capitale_proprio"].amount_chf == Decimal("1410198.41")
    assert cells["eccedenza_bilancio_299"].amount_chf == Decimal("1417911.25")
    assert cells["totale_passivi"].amount_chf == Decimal("9722206.84")


@pytest.mark.skipif(not BRIONE_PDF.exists(), reason="PDF reale Brione non presente localmente")
def test_extract_indicatori_sel_brione_2025() -> None:
    extractor = TableExtractor("GECOTI_V3")
    with pdfplumber.open(BRIONE_PDF) as pdf:
        indicators = extractor.extract_indicatori_sel(pdf, [12, 13])

    assert len(indicators) == 8
    assert indicators["tasso_indebitamento_netto_pct"].amount_chf == Decimal("228.50")
    assert indicators["grado_autofinanziamento_pct"].amount_chf == Decimal("54.60")
    assert indicators["quota_spese_interessi_pct"].amount_chf == Decimal("-2.60")
    assert indicators["debito_netto_pro_capite_chf"].amount_chf == Decimal("11775.00")
    assert indicators["quota_investimenti_pct"].amount_chf == Decimal("23.00")
    assert indicators["quota_capitale_proprio_pct"].amount_chf == Decimal("14.50")
    assert indicators["quota_indebitamento_lordo_pct"].amount_chf == Decimal("246.80")
    assert indicators["quota_oneri_finanziari_pct"].amount_chf == Decimal("4.80")


@pytest.mark.skipif(not BRIONE_PDF.exists(), reason="PDF reale Brione non presente localmente")
def test_extract_controllo_crediti_brione_2025() -> None:
    extractor = TableExtractor("GECOTI_V3")
    with pdfplumber.open(BRIONE_PDF) as pdf:
        items, totals = extractor.extract_controllo_crediti(pdf, [126, 127])

    assert len(items) >= 15
    # Verifica sorpasso reale sul tornante Jacomello
    jacomello = next(i for i in items if i.account_code == "615.5010.200")
    assert jacomello.description == "Messa in sicurezza tornante Jacomello"
    assert jacomello.voted_credit == Decimal("361000.00")
    assert jacomello.spent_prev == Decimal("346781.30")
    assert jacomello.spent_year == Decimal("30349.35")
    assert jacomello.spent_total == Decimal("377130.65")
    assert jacomello.remaining_credit == Decimal("-16130.65")
    assert jacomello.has_overrun is True

    # Verifica totali
    assert totals["totale_investimenti_votati"].amount_chf == Decimal("6919889.75")
    assert totals["totale_crediti_consumati_01_01"].amount_chf == Decimal("3168583.15")
    assert totals["totale_spese_lorde_esercizio"].amount_chf == Decimal("823840.43")
    assert totals["totale_crediti_consumati_31_12"].amount_chf == Decimal("3992423.58")


def test_layout_loader_gecoti_v3() -> None:
    from ofcl.extract.layout_loader import load_and_validate_layout

    layout_dir = REPO_ROOT / "registry" / "layouts" / "gecoti_v3"
    cfg = load_and_validate_layout(layout_dir)
    assert cfg.layout_family == "GECOTI_V3"
    assert len(cfg.rg_config.columns) == 3
    assert cfg.sel_config.min_x < cfg.sel_config.max_x
    assert len(cfg.sel_config.indicator_order) == 8
    assert "totale_investimenti_votati" in cfg.cc_config.summary_rows_re


def test_layout_loader_missing_dir(tmp_path: Path) -> None:
    from ofcl.extract.layout_loader import LayoutConfigError, load_and_validate_layout

    with pytest.raises(LayoutConfigError, match="Directory layout non trovata"):
        load_and_validate_layout(tmp_path / "nonexistent")


def test_layout_loader_min_max_violation(tmp_path: Path) -> None:
    import yaml

    from ofcl.extract.layout_loader import LayoutConfigError, load_and_validate_layout

    # Crea un layout dir fittizio con min_x >= max_x
    bad_dir = tmp_path / "bad_layout"
    bad_dir.mkdir()
    rg_data = {
        "layout_family": "BAD",
        "section": "lett_a",
        "title_pattern": "test",
        "columns": [{"id": "col1", "name": "Col 1", "min_x": 500.0, "max_x": 400.0}],
        "rows": {"spese": "spese"},
    }
    (bad_dir / "riassunto_generale.yaml").write_text(yaml.safe_dump(rg_data), encoding="utf-8")
    with pytest.raises(LayoutConfigError, match="Invariante min_x < max_x violato"):
        load_and_validate_layout(bad_dir)


def test_table_extractor_synthetic_mock() -> None:
    extractor = TableExtractor("GECOTI_V3")

    class MockPage:
        def extract_words(self) -> list[dict[str, object]]:
            # Riga "spese operative" con importo a x0=300
            return [
                {"text": "Spese", "top": 150.0, "bottom": 160.0, "x0": 50.0, "x1": 90.0},
                {"text": "operative", "top": 150.0, "bottom": 160.0, "x0": 95.0, "x1": 150.0},
                {
                    "text": "1'234'567.80",
                    "top": 150.0,
                    "bottom": 160.0,
                    "x0": 300.0,
                    "x1": 380.0,
                },
            ]

        def extract_tables(self) -> list[list[list[str]]]:
            return [
                [
                    [
                        "01.01.2024",
                        "MM 12",
                        "615.5010.200",
                        "Rifacimento strada",
                        "100'000.00",
                        "20'000.00",
                        "30'000.00",
                        "50'000.00",
                        "50'000.00",
                        "Opera regolare",
                    ]
                ]
            ]

    class MockPDF:
        def __init__(self) -> None:
            self.pages = [MockPage()]

    pdf = MockPDF()
    # 1. Riassunto Generale
    rg_cells = extractor.extract_riassunto_generale(pdf, [1])  # type: ignore[arg-type]
    assert "spese_operative" in rg_cells
    assert rg_cells["spese_operative"].amount_chf == Decimal("1234567.80")

    # 2. Controllo Crediti
    cred_items, _ = extractor.extract_controllo_crediti(pdf, [1])  # type: ignore[arg-type]
    assert len(cred_items) == 1
    assert cred_items[0].account_code == "615.5010.200"
    assert cred_items[0].voted_credit == Decimal("100000.00")
    assert cred_items[0].remaining_credit == Decimal("50000.00")
    assert cred_items[0].has_overrun is False
