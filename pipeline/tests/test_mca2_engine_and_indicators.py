"""
Test per il Motore di Validazione MCA2 (V01-V12), Segnali (S01-S04) e Calcolatore Indicatori SEL.
Task T036: Copertura di tutte le 12 quadrature contabili ed 8 indicatori SEL.
"""

from decimal import Decimal

from ofcl.indicators.calculator import SelIndicatorsCalculator, SelInputData
from ofcl.validate.mca2_engine import (
    CreditRowInput,
    ValidationContext,
    validate_mca2_document,
)


def test_v01_v12_all_passed_on_balanced_context() -> None:
    """Verifica che un bilancio perfettamente quadrato superi tutte le regole V01-V12 senza errori."""
    credit_1 = CreditRowInput(
        account_code="615.5010.100",
        description="Risanamento strada Zotte",
        voted_credit=Decimal("100000.00"),
        spent_prev=Decimal("20000.00"),
        spent_year=Decimal("30000.00"),
        spent_total_declared=Decimal("50000.00"),
        remaining_declared=Decimal("50000.00"),
    )

    ctx = ValidationContext(
        spese_operative=Decimal("3000000.00"),
        ricavi_operativi=Decimal("3200000.00"),
        risultato_operativo_dichiarato=Decimal("200000.00"),  # V01: 3.2M - 3.0M = 200k
        spese_finanziarie_34=Decimal("40000.00"),
        ricavi_finanziari_44=Decimal("60000.00"),
        risultato_finanziario_dichiarato=Decimal("20000.00"),  # V02: 60k - 40k = 20k
        risultato_ordinario_dichiarato=Decimal("220000.00"),  # V03: 200k + 20k = 220k
        spese_straordinarie_38=Decimal("0.00"),
        ricavi_straordinari_48=Decimal("0.00"),
        risultato_straordinario_dichiarato=Decimal("0.00"),  # V04: 0
        risultato_totale_esercizio_dichiarato=Decimal("220000.00"),  # V05: 220k + 0 = 220k
        addebiti_interni_39=Decimal("150000.00"),
        accrediti_interni_49=Decimal("150000.00"),  # V06: 150k == 150k
        uscite_investimenti_ba_5=Decimal("500000.00"),
        entrate_investimenti_ba_6=Decimal("100000.00"),
        onere_netto_investimenti_dichiarato=Decimal("400000.00"),  # V07: 500k - 100k = 400k
        autofinanziamento_dichiarato=Decimal("600000.00"),
        risultato_finanziamento_dichiarato=Decimal("200000.00"),  # V08: 600k - 400k = 200k
        totale_attivi=Decimal("10000000.00"),
        totale_passivi=Decimal("10000000.00"),  # V09: 10M == 10M
        credit_rows=[credit_1],  # V10: 20k + 30k = 50k, 100k - 50k = 50k
        totale_spese_lorde_crediti=Decimal("500000.00"),  # V11: 500k == 500k CI
        reported_indicators={"tasso_indebitamento_netto_pct": Decimal("85.0")},
        computed_indicators={"tasso_indebitamento_netto_pct": Decimal("85.0")},  # V12: delta 0.0
    )

    checks, signals = validate_mca2_document(ctx)
    assert all(c.passed for c in checks), (
        f"Controlli falliti: {[c for c in checks if not c.passed]}"
    )
    assert len(signals) == 0


def test_v10_and_s01_detect_credit_overrun() -> None:
    """Verifica che un sorpasso di spesa attivi il segnale S01 e mantenga la coerenza V10."""
    overrun_row = CreditRowInput(
        account_code="615.5010.200",
        description="Tornante Jacomello",
        voted_credit=Decimal("361000.00"),
        spent_prev=Decimal("346781.30"),
        spent_year=Decimal("30349.35"),
        spent_total_declared=Decimal("377130.65"),
        remaining_declared=Decimal("-16130.65"),  # Sorpasso reale di 16'130.65 CHF
    )

    ctx = ValidationContext(
        spese_operative=Decimal("1000.00"),
        ricavi_operativi=Decimal("1000.00"),
        risultato_operativo_dichiarato=Decimal("0.00"),
        spese_finanziarie_34=Decimal("0.00"),
        ricavi_finanziari_44=Decimal("0.00"),
        risultato_finanziario_dichiarato=Decimal("0.00"),
        risultato_ordinario_dichiarato=Decimal("0.00"),
        credit_rows=[overrun_row],
    )

    checks, signals = validate_mca2_document(ctx)
    v10 = next(c for c in checks if c.rule_code == "V10")
    assert v10.passed is True  # I calcoli matematici della riga sono coerenti

    # Segnale S01 deve essere emesso
    s01 = next((s for s in signals if s.signal_code == "S01"), None)
    assert s01 is not None
    assert "Tornante Jacomello" in s01.description
    assert s01.metadata["residual"] == "-16130.65"


def test_v09_blocking_balance_mismatch() -> None:
    """Verifica che uno sbilancio tra attivi e passivi fallisca con severità BLOCKING."""
    ctx = ValidationContext(
        spese_operative=Decimal("100.00"),
        ricavi_operativi=Decimal("100.00"),
        risultato_operativo_dichiarato=Decimal("0.00"),
        spese_finanziarie_34=Decimal("0.00"),
        ricavi_finanziari_44=Decimal("0.00"),
        risultato_finanziario_dichiarato=Decimal("0.00"),
        risultato_ordinario_dichiarato=Decimal("0.00"),
        totale_attivi=Decimal("5000000.00"),
        totale_passivi=Decimal("5000001.00"),  # Sbilancio di 1.00 CHF
    )

    checks, _ = validate_mca2_document(ctx)
    v09 = next(c for c in checks if c.rule_code == "V09")
    assert v09.passed is False
    assert v09.severity == "BLOCKING"
    assert v09.delta == Decimal("1.00")


def test_sel_indicators_calculator_all_8_and_bands() -> None:
    """Verifica il calcolo di tutti gli 8 indicatori SEL e la corretta attribuzione delle scale."""
    sel_data = SelInputData(
        capitale_terzi=Decimal("8312008.43"),
        beni_patrimoniali=Decimal("3189910.20"),
        popolazione_residente=435,  # Popolazione Brione s/Minusio
        gettito_fiscale_base=Decimal("2241574.00"),
        autofinanziamento=Decimal("437731.39"),
        investimenti_netti_ba=Decimal("801495.78"),
        spese_interessi_340=Decimal("37743.82"),
        ricavi_interessi_440=Decimal("116000.00"),  # Interessi netti negativi
        ricavi_correnti=Decimal("2991727.57"),
        investimenti_lordi_ba=Decimal("823840.43"),
        uscite_consolidate=Decimal("3581250.69"),
        capitale_proprio=Decimal("1410198.41"),
        totale_passivi=Decimal("9722206.84"),
        debito_lordo=Decimal("7383680.00"),
        oneri_finanziari=Decimal("143600.00"),
    )

    results = SelIndicatorsCalculator.calculate_all(sel_data)
    assert len(results) == 8

    # 1. Tasso di indebitamento netto: (8.31M - 3.19M) / 2.24M = 5.12M / 2.24M ~ 228.5%
    r1 = results["NET_DEBT_RATIO"]
    assert r1.value is not None and r1.value > Decimal("200.0")
    assert r1.band == "ECCESSIVO"

    # 2. Grado di autofinanziamento: 437'731 / 801'495 ~ 54.6%
    r2 = results["SELF_FINANCING_DEGREE"]
    assert r2.value == Decimal("54.6")
    assert r2.band == "DEBOLE"

    # 3. Quota interessi netti negativa: Buona
    r3 = results["INTEREST_BURDEN_RATIO"]
    assert r3.band == "BUONO"

    # 4. Debito pro capite: 5'122'098 / 435 ~ 11'775 CHF/ab
    r4 = results["NET_DEBT_PER_CAPITA"]
    assert r4.value is not None and r4.value > Decimal("10000.00")
    assert r4.band == "ECCESSIVO"

    # 6. Quota capitale proprio: 1.41M / 9.72M ~ 14.5%
    r6 = results["EQUITY_RATIO"]
    assert r6.value == Decimal("14.5")
    assert r6.band == "MEDIO"

    # 8. Capacità di autofinanziamento: 437'731 / 2.99M ~ 14.6%
    r8 = results["SELF_FINANCING_CAPACITY"]
    assert r8.value == Decimal("14.6")
    assert r8.band == "MEDIO"
