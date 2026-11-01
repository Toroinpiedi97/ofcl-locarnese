"""
Calcolatore Ufficiale degli 8 Indicatori Finanziari SEL (Canton Ticino - RGFCC art. 22 lett. o).
Conformità: docs/spec/07-validation-engine.md §3 e skills/mca2-validation-engine §2.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

EvaluationBand = Literal[
    "OTTIMO",
    "BUONO",
    "NORMALE",
    "ACCETTABILE",
    "SUFFICIENTE",
    "MEDIO",
    "DEBOLE",
    "ECCESSIVO",
    "CRITICO",
    "ALTO",
    "ELEVATO",
    "MOLTO_ELEVATO",
    "RIDOTTO",
    "BASSO",
    "N_A",
]


@dataclass(frozen=True)
class IndicatorResult:
    """Risultato calcolato di un singolo indicatore SEL."""

    code: str
    name: str
    unit: str
    value: Decimal | None
    band: EvaluationBand
    reported_value: Decimal | None = None
    delta_reported: Decimal | None = None


@dataclass(frozen=True)
class SelInputData:
    """Input finanziari aggregati per il calcolo degli indicatori SEL."""

    capitale_terzi: Decimal  # Passivi gruppo 20..28
    beni_patrimoniali: Decimal  # Attivi gruppo 10
    popolazione_residente: int
    gettito_fiscale_base: Decimal  # Gettito imposta cantonale base 100%
    autofinanziamento: Decimal  # Da prospetto di finanziamento
    investimenti_netti_ba: Decimal  # Onere netto investimenti beni amministrativi
    spese_interessi_340: Decimal
    ricavi_interessi_440: Decimal
    ricavi_correnti: Decimal  # Ricavi operativi al netto di partite straordinarie
    investimenti_lordi_ba: Decimal  # Uscite per investimenti beni amministrativi
    uscite_consolidate: Decimal  # Spese correnti + uscite investimenti
    capitale_proprio: Decimal  # Gruppo 29
    totale_passivi: Decimal  # Totale bilancio passivi
    debito_lordo: Decimal  # Gruppo 20 (capitale di terzi corrente e a lungo termine)
    oneri_finanziari: Decimal  # Interessi netti + ammortamenti ordinari BA


class SelIndicatorsCalculator:
    """Calcola gli 8 indicatori finanziari SEL con relative scale di valutazione cantonali."""

    @staticmethod
    def calculate_all(data: SelInputData, reported: dict[str, Decimal] | None = None) -> dict[str, IndicatorResult]:
        reported = reported or {}
        results: dict[str, IndicatorResult] = {}

        # Debito pubblico netto = Capitale di terzi - Beni patrimoniali
        debito_netto = data.capitale_terzi - data.beni_patrimoniali

        # 1. NET_DEBT_RATIO: Tasso di indebitamento netto (%)
        # Formula: (Debito netto / Gettito imposta base) * 100
        val_debt_ratio: Decimal | None = None
        band_debt_ratio: EvaluationBand = "N_A"
        if data.gettito_fiscale_base > Decimal("0.00"):
            val_debt_ratio = ((debito_netto / data.gettito_fiscale_base) * Decimal(100)).quantize(Decimal("0.1"))
            if val_debt_ratio < Decimal("100.0"):
                band_debt_ratio = "BUONO"
            elif val_debt_ratio <= Decimal("150.0"):
                band_debt_ratio = "ACCETTABILE"
            else:
                band_debt_ratio = "ECCESSIVO"

        rep_1 = reported.get("tasso_indebitamento_netto_pct")
        delta_1 = (val_debt_ratio - rep_1).quantize(Decimal("0.1")) if val_debt_ratio is not None and rep_1 is not None else None
        results["NET_DEBT_RATIO"] = IndicatorResult(
            code="NET_DEBT_RATIO",
            name="Tasso di indebitamento netto",
            unit="%",
            value=val_debt_ratio,
            band=band_debt_ratio,
            reported_value=rep_1,
            delta_reported=delta_1,
        )

        # 2. SELF_FIN_DEGREE: Grado di autofinanziamento (%)
        # Formula: (Autofinanziamento / Investimenti netti BA) * 100
        val_self_fin: Decimal | None = None
        band_self_fin: EvaluationBand = "N_A"
        if data.investimenti_netti_ba > Decimal("0.00"):
            val_self_fin = ((data.autofinanziamento / data.investimenti_netti_ba) * Decimal(100)).quantize(Decimal("0.1"))
            if val_self_fin > Decimal("100.0"):
                band_self_fin = "BUONO"
            elif val_self_fin >= Decimal("80.0"):
                band_self_fin = "NORMALE"
            else:
                band_self_fin = "DEBOLE"

        rep_2 = reported.get("grado_autofinanziamento_pct")
        delta_2 = (val_self_fin - rep_2).quantize(Decimal("0.1")) if val_self_fin is not None and rep_2 is not None else None
        results["SELF_FIN_DEGREE"] = IndicatorResult(
            code="SELF_FIN_DEGREE",
            name="Grado di autofinanziamento",
            unit="%",
            value=val_self_fin,
            band=band_self_fin,
            reported_value=rep_2,
            delta_reported=delta_2,
        )

        # 3. INTEREST_SHARE: Quota spese per interessi (%)
        # Formula: ((Spese interessi 340 - Ricavi interessi 440) / Ricavi correnti) * 100
        val_interest: Decimal | None = None
        band_interest: EvaluationBand = "N_A"
        if data.ricavi_correnti > Decimal("0.00"):
            interessi_netti = data.spese_interessi_340 - data.ricavi_interessi_440
            val_interest = ((interessi_netti / data.ricavi_correnti) * Decimal(100)).quantize(Decimal("0.1"))
            if val_interest <= Decimal("4.0"):
                band_interest = "BUONO"
            elif val_interest <= Decimal("9.0"):
                band_interest = "SUFFICIENTE"
            else:
                band_interest = "ECCESSIVO"

        rep_3 = reported.get("quota_spese_interessi_pct")
        delta_3 = (val_interest - rep_3).quantize(Decimal("0.1")) if val_interest is not None and rep_3 is not None else None
        results["INTEREST_SHARE"] = IndicatorResult(
            code="INTEREST_SHARE",
            name="Quota spese per interessi",
            unit="%",
            value=val_interest,
            band=band_interest,
            reported_value=rep_3,
            delta_reported=delta_3,
        )

        # 4. NET_DEBT_PC: Debito pubblico netto pro capite (CHF/ab)
        # Formula: Debito pubblico netto / Popolazione residente permanente
        val_debt_pc: Decimal | None = None
        band_debt_pc: EvaluationBand = "N_A"
        if data.popolazione_residente > 0:
            val_debt_pc = (debito_netto / Decimal(data.popolazione_residente)).quantize(Decimal("1.00"))
            if val_debt_pc < Decimal("1000.00"):
                band_debt_pc = "BASSO"
            elif val_debt_pc <= Decimal("3000.00"):
                band_debt_pc = "MEDIO"
            elif val_debt_pc <= Decimal("5000.00"):
                band_debt_pc = "ELEVATO"
            else:
                band_debt_pc = "ECCESSIVO"

        rep_4 = reported.get("debito_netto_pro_capite_chf")
        delta_4 = (val_debt_pc - rep_4).quantize(Decimal("1.00")) if val_debt_pc is not None and rep_4 is not None else None
        results["NET_DEBT_PC"] = IndicatorResult(
            code="NET_DEBT_PC",
            name="Debito pubblico netto pro capite",
            unit="CHF/ab",
            value=val_debt_pc,
            band=band_debt_pc,
            reported_value=rep_4,
            delta_reported=delta_4,
        )

        # 5. INVEST_SHARE: Quota degli investimenti (%)
        # Formula: (Investimenti lordi BA / Uscite totali consolidate) * 100
        val_invest: Decimal | None = None
        band_invest: EvaluationBand = "N_A"
        if data.uscite_consolidate > Decimal("0.00"):
            val_invest = ((data.investimenti_lordi_ba / data.uscite_consolidate) * Decimal(100)).quantize(Decimal("0.1"))
            if val_invest > Decimal("30.0"):
                band_invest = "MOLTO_ELEVATO"
            elif val_invest >= Decimal("20.0"):
                band_invest = "ELEVATO"
            elif val_invest >= Decimal("10.0"):
                band_invest = "MEDIO"
            else:
                band_invest = "RIDOTTO"

        rep_5 = reported.get("quota_investimenti_pct")
        delta_5 = (val_invest - rep_5).quantize(Decimal("0.1")) if val_invest is not None and rep_5 is not None else None
        results["INVEST_SHARE"] = IndicatorResult(
            code="INVEST_SHARE",
            name="Quota degli investimenti",
            unit="%",
            value=val_invest,
            band=band_invest,
            reported_value=rep_5,
            delta_reported=delta_5,
        )

        # 6. EQUITY_SHARE: Quota di capitale proprio (%)
        # Formula: (Capitale proprio / Totale passivi) * 100
        val_equity: Decimal | None = None
        band_equity: EvaluationBand = "N_A"
        if data.totale_passivi > Decimal("0.00"):
            val_equity = ((data.capitale_proprio / data.totale_passivi) * Decimal(100)).quantize(Decimal("0.1"))
            if val_equity > Decimal("40.0"):
                band_equity = "ECCESSIVO"
            elif val_equity >= Decimal("20.0"):
                band_equity = "BUONO"
            elif val_equity >= Decimal("10.0"):
                band_equity = "MEDIO"
            else:
                band_equity = "DEBOLE"

        rep_6 = reported.get("quota_capitale_proprio_pct")
        delta_6 = (val_equity - rep_6).quantize(Decimal("0.1")) if val_equity is not None and rep_6 is not None else None
        results["EQUITY_SHARE"] = IndicatorResult(
            code="EQUITY_SHARE",
            name="Quota di capitale proprio",
            unit="%",
            value=val_equity,
            band=band_equity,
            reported_value=rep_6,
            delta_reported=delta_6,
        )

        # 7. DEBT_SHARE: Quota di indebitamento lordo (%)
        # Formula: (Debito lordo / Ricavi correnti) * 100
        val_debt_share: Decimal | None = None
        band_debt_share: EvaluationBand = "N_A"
        if data.ricavi_correnti > Decimal("0.00"):
            val_debt_share = ((data.debito_lordo / data.ricavi_correnti) * Decimal(100)).quantize(Decimal("0.1"))
            if val_debt_share < Decimal("50.0"):
                band_debt_share = "OTTIMO"
            elif val_debt_share <= Decimal("100.0"):
                band_debt_share = "BUONO"
            elif val_debt_share <= Decimal("150.0"):
                band_debt_share = "MEDIO"
            elif val_debt_share <= Decimal("200.0"):
                band_debt_share = "DEBOLE"
            else:
                band_debt_share = "CRITICO"

        rep_7 = reported.get("quota_indebitamento_lordo_pct")
        delta_7 = (val_debt_share - rep_7).quantize(Decimal("0.1")) if val_debt_share is not None and rep_7 is not None else None
        results["DEBT_SHARE"] = IndicatorResult(
            code="DEBT_SHARE",
            name="Quota di indebitamento lordo",
            unit="%",
            value=val_debt_share,
            band=band_debt_share,
            reported_value=rep_7,
            delta_reported=delta_7,
        )

        # 8. DEBT_SERVICE_SHARE: Quota degli oneri finanziari (%)
        # Formula: (Oneri finanziari / Ricavi correnti) * 100
        val_service: Decimal | None = None
        band_service: EvaluationBand = "N_A"
        if data.ricavi_correnti > Decimal("0.00"):
            val_service = ((data.oneri_finanziari / data.ricavi_correnti) * Decimal(100)).quantize(Decimal("0.1"))
            if val_service < Decimal("5.0"):
                band_service = "DEBOLE"
            elif val_service <= Decimal("15.0"):
                band_service = "NORMALE"  # Sopportabile
            else:
                band_service = "ALTO"

        rep_8 = reported.get("quota_oneri_finanziari_pct")
        delta_8 = (val_service - rep_8).quantize(Decimal("0.1")) if val_service is not None and rep_8 is not None else None
        results["DEBT_SERVICE_SHARE"] = IndicatorResult(
            code="DEBT_SERVICE_SHARE",
            name="Quota degli oneri finanziari",
            unit="%",
            value=val_service,
            band=band_service,
            reported_value=rep_8,
            delta_reported=delta_8,
        )

        return results
