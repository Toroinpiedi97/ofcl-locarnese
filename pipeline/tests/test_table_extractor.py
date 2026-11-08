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
BRIONE_PDF = REPO_ROOT / "data" / "raw_pdfs" / "5096" / "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf"


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
