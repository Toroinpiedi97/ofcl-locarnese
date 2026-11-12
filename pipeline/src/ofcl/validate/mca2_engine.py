"""
Motore di Validazione e Quadratura Contabile MCA2 (V01-V12) e Segnalazioni (S01-S04).
Conformità: docs/spec/07-validation-engine.md e skills/mca2-validation-engine.

Tutti i calcoli operano rigorosamente con `Decimal` a precisione centesimale `0.01 CHF`.
Qualsiasi scostamento > 0.00 CHF su una regola BLOCKING impedisce la transizione a VALIDATED.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Literal

ZERO = Decimal("0.00")
TOL_ROW = Decimal("1.00")
TOL_PERCENT = Decimal("0.5")
TOL_PC = Decimal("50.00")


@dataclass(frozen=True)
class ValidationCheck:
    """Esito di un controllo di quadratura formale (V01..V12)."""

    rule_code: str
    severity: Literal["BLOCKING", "WARNING", "INFO"]
    passed: bool
    expected: Decimal
    actual: Decimal
    delta: Decimal
    message: str


@dataclass(frozen=True)
class FinancialSignal:
    """Segnale di contenuto contabile/politico (S01..S04)."""

    signal_code: Literal["S01", "S02", "S03", "S04"]
    title: str
    description: str
    severity: Literal["ALERT", "WARNING", "INFO"]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CreditRowInput:
    """Singola opera dell'Allegato f (Controllo Crediti d'Investimento)."""

    account_code: str
    description: str
    voted_credit: Decimal
    spent_prev: Decimal
    spent_year: Decimal
    spent_total_declared: Decimal
    remaining_declared: Decimal


@dataclass(frozen=True)
class ValidationContext:
    """Contesto contabile completo per l'esecuzione di V01..V12 e S01..S04."""

    # 1. Conto Economico a 3 stadi
    spese_operative: Decimal
    ricavi_operativi: Decimal
    risultato_operativo_dichiarato: Decimal

    spese_finanziarie_34: Decimal
    ricavi_finanziari_44: Decimal
    risultato_finanziario_dichiarato: Decimal
    risultato_ordinario_dichiarato: Decimal

    spese_straordinarie_38: Decimal = ZERO
    ricavi_straordinari_48: Decimal = ZERO
    risultato_straordinario_dichiarato: Decimal = ZERO
    risultato_totale_esercizio_dichiarato: Decimal = ZERO

    # 2. Imputazioni interne
    addebiti_interni_39: Decimal = ZERO
    accrediti_interni_49: Decimal = ZERO

    # 3. Conto degli Investimenti e Finanziamento
    uscite_investimenti_ba_5: Decimal = ZERO
    entrate_investimenti_ba_6: Decimal = ZERO
    onere_netto_investimenti_dichiarato: Decimal = ZERO
    autofinanziamento_dichiarato: Decimal = ZERO
    risultato_finanziamento_dichiarato: Decimal = ZERO

    # 4. Bilancio (Stato patrimoniale)
    totale_attivi: Decimal = ZERO
    totale_passivi: Decimal = ZERO
    beni_patrimoniali: Decimal = ZERO
    beni_amministrativi: Decimal = ZERO
    capitale_terzi: Decimal = ZERO
    capitale_proprio: Decimal = ZERO

    # 5. Allegato f (Crediti)
    credit_rows: list[CreditRowInput] = field(default_factory=list)
    totale_spese_lorde_crediti: Decimal = ZERO

    # 6. Indicatori SEL (reported vs computed)
    reported_indicators: dict[str, Decimal] = field(default_factory=dict)
    computed_indicators: dict[str, Decimal] = field(default_factory=dict)


def validate_mca2_document(
    ctx: ValidationContext,
) -> tuple[list[ValidationCheck], list[FinancialSignal]]:
    """Esegue tutte le 12 verifiche formali (V01..V12) e genera i segnali finanziari (S01..S04)."""
    checks: list[ValidationCheck] = []
    signals: list[FinancialSignal] = []

    # --- V01: Risultato Operativo (1° Stadio) ---
    exp_op = (ctx.ricavi_operativi - ctx.spese_operative).quantize(ZERO)
    act_op = ctx.risultato_operativo_dichiarato.quantize(ZERO)
    delta_op = act_op - exp_op
    checks.append(
        ValidationCheck(
            rule_code="V01",
            severity="BLOCKING",
            passed=(delta_op == ZERO),
            expected=exp_op,
            actual=act_op,
            delta=delta_op,
            message=f"V01 - Risultato Operativo: atteso {exp_op}, dichiarato {act_op} (delta {delta_op} CHF)",
        )
    )

    # --- V02: Risultato Finanziario (2° Stadio) ---
    exp_fin = (ctx.ricavi_finanziari_44 - ctx.spese_finanziarie_34).quantize(ZERO)
    act_fin = ctx.risultato_finanziario_dichiarato.quantize(ZERO)
    delta_fin = act_fin - exp_fin
    checks.append(
        ValidationCheck(
            rule_code="V02",
            severity="BLOCKING",
            passed=(delta_fin == ZERO),
            expected=exp_fin,
            actual=act_fin,
            delta=delta_fin,
            message=f"V02 - Risultato Finanziario: atteso {exp_fin}, dichiarato {act_fin} (delta {delta_fin} CHF)",
        )
    )

    # --- V03: Risultato Ordinario ---
    exp_ord = (act_op + act_fin).quantize(ZERO)
    act_ord = ctx.risultato_ordinario_dichiarato.quantize(ZERO)
    delta_ord = act_ord - exp_ord
    checks.append(
        ValidationCheck(
            rule_code="V03",
            severity="BLOCKING",
            passed=(delta_ord == ZERO),
            expected=exp_ord,
            actual=act_ord,
            delta=delta_ord,
            message=f"V03 - Risultato Ordinario: atteso {exp_ord}, dichiarato {act_ord} (delta {delta_ord} CHF)",
        )
    )

    # --- V04: Risultato Straordinario (3° Stadio) ---
    exp_str = (ctx.ricavi_straordinari_48 - ctx.spese_straordinarie_38).quantize(ZERO)
    act_str = ctx.risultato_straordinario_dichiarato.quantize(ZERO)
    delta_str = act_str - exp_str
    checks.append(
        ValidationCheck(
            rule_code="V04",
            severity="BLOCKING",
            passed=(delta_str == ZERO),
            expected=exp_str,
            actual=act_str,
            delta=delta_str,
            message=f"V04 - Risultato Straordinario: atteso {exp_str}, dichiarato {act_str} (delta {delta_str} CHF)",
        )
    )

    # --- V05: Risultato Totale d'Esercizio ---
    exp_tot = (act_ord + act_str).quantize(ZERO)
    act_tot = ctx.risultato_totale_esercizio_dichiarato.quantize(ZERO)
    delta_tot = act_tot - exp_tot
    checks.append(
        ValidationCheck(
            rule_code="V05",
            severity="BLOCKING",
            passed=(delta_tot == ZERO),
            expected=exp_tot,
            actual=act_tot,
            delta=delta_tot,
            message=f"V05 - Risultato Totale d'Esercizio: atteso {exp_tot}, dichiarato {act_tot} (delta {delta_tot} CHF)",
        )
    )

    # --- V06: Imputazioni Interne (Addebiti 39 == Accrediti 49) ---
    exp_int = ctx.addebiti_interni_39.quantize(ZERO)
    act_int = ctx.accrediti_interni_49.quantize(ZERO)
    delta_int = act_int - exp_int
    checks.append(
        ValidationCheck(
            rule_code="V06",
            severity="BLOCKING",
            passed=(delta_int == ZERO),
            expected=exp_int,
            actual=act_int,
            delta=delta_int,
            message=f"V06 - Imputazioni Interne (39 vs 49): atteso pareggio, delta {delta_int} CHF",
        )
    )

    # --- V07: Onere Netto Investimenti ---
    exp_inv = (ctx.uscite_investimenti_ba_5 - ctx.entrate_investimenti_ba_6).quantize(ZERO)
    act_inv = ctx.onere_netto_investimenti_dichiarato.quantize(ZERO)
    delta_inv = act_inv - exp_inv
    checks.append(
        ValidationCheck(
            rule_code="V07",
            severity="BLOCKING",
            passed=(delta_inv == ZERO),
            expected=exp_inv,
            actual=act_inv,
            delta=delta_inv,
            message=f"V07 - Onere Netto Investimenti: atteso {exp_inv}, dichiarato {act_inv} (delta {delta_inv} CHF)",
        )
    )

    # --- V08: Risultato di Finanziamento (Autofinanziamento - Onere Netto) ---
    exp_finanz = (ctx.autofinanziamento_dichiarato - act_inv).quantize(ZERO)
    act_finanz = ctx.risultato_finanziamento_dichiarato.quantize(ZERO)
    delta_finanz = act_finanz - exp_finanz
    checks.append(
        ValidationCheck(
            rule_code="V08",
            severity="BLOCKING",
            passed=(delta_finanz == ZERO),
            expected=exp_finanz,
            actual=act_finanz,
            delta=delta_finanz,
            message=f"V08 - Risultato di Finanziamento: atteso {exp_finanz}, dichiarato {act_finanz} (delta {delta_finanz} CHF)",
        )
    )

    # --- V09: Pareggio di Bilancio (Totale Attivi == Totale Passivi) ---
    exp_pass = ctx.totale_attivi.quantize(ZERO)
    act_pass = ctx.totale_passivi.quantize(ZERO)
    delta_bil = act_pass - exp_pass
    checks.append(
        ValidationCheck(
            rule_code="V09",
            severity="BLOCKING",
            passed=(delta_bil == ZERO),
            expected=exp_pass,
            actual=act_pass,
            delta=delta_bil,
            message=f"V09 - Pareggio Bilancio Attivi/Passivi: atteso {exp_pass}, effettivo {act_pass} (delta {delta_bil} CHF)",
        )
    )

    # --- V10: Controllo Crediti Allegato f (Riga per riga) ---
    all_rows_valid = True
    row_errors = 0
    for row in ctx.credit_rows:
        exp_spent_total = (row.spent_prev + row.spent_year).quantize(ZERO)
        d_spent = abs(row.spent_total_declared.quantize(ZERO) - exp_spent_total)

        if row.voted_credit == ZERO and row.remaining_declared == ZERO:
            # Spesa vincolata / delega senza credito formale votato dal CC
            d_res = ZERO
            if row.spent_year > ZERO:
                signals.append(
                    FinancialSignal(
                        signal_code="S02",
                        title="Spesa d'investimento senza credito CC formale",
                        description=f"L'opera '{row.description}' ({row.account_code}) registra uscite per {row.spent_year} CHF senza credito votato dal CC (delega esecutiva o spesa vincolata).",
                        severity="INFO",
                        metadata={
                            "account_code": row.account_code,
                            "spent_year": str(row.spent_year),
                        },
                    )
                )
        else:
            exp_residual = (row.voted_credit - exp_spent_total).quantize(ZERO)
            d_res = abs(row.remaining_declared.quantize(ZERO) - exp_residual)

        if d_spent > ZERO or d_res > ZERO:
            all_rows_valid = False
            row_errors += 1

        # Generazione Segnale S01: Sorpasso Credito
        if row.remaining_declared < ZERO:
            signals.append(
                FinancialSignal(
                    signal_code="S01",
                    title="Sorpasso di Credito d'Opera",
                    description=(
                        f"L'opera '{row.description}' ({row.account_code}) presenta un credito residuo negativo di "
                        f"{row.remaining_declared} CHF su {row.voted_credit} CHF votati."
                    ),
                    severity="ALERT",
                    metadata={
                        "account_code": row.account_code,
                        "description": row.description,
                        "voted_credit": str(row.voted_credit),
                        "spent_total": str(row.spent_total_declared),
                        "residual": str(row.remaining_declared),
                    },
                )
            )

    checks.append(
        ValidationCheck(
            rule_code="V10",
            severity="BLOCKING",
            passed=all_rows_valid,
            expected=ZERO,
            actual=Decimal(row_errors),
            delta=Decimal(row_errors),
            message=f"V10 - Controllo Crediti Allegato f: {len(ctx.credit_rows)} opere verificate, {row_errors} errori di quadratura riga",
        )
    )

    # --- V11: Coerenza Totale Investimenti Crediti vs Uscite Conto Investimenti ---
    if ctx.totale_spese_lorde_crediti > ZERO and ctx.uscite_investimenti_ba_5 > ZERO:
        delta_cred_ci = abs(
            ctx.totale_spese_lorde_crediti.quantize(ZERO)
            - ctx.uscite_investimenti_ba_5.quantize(ZERO)
        )
        checks.append(
            ValidationCheck(
                rule_code="V11",
                severity="WARNING",
                passed=(delta_cred_ci == ZERO),
                expected=ctx.uscite_investimenti_ba_5.quantize(ZERO),
                actual=ctx.totale_spese_lorde_crediti.quantize(ZERO),
                delta=delta_cred_ci,
                message=f"V11 - Coerenza Crediti vs Conto Investimenti: CI uscite {ctx.uscite_investimenti_ba_5}, All. f totale {ctx.totale_spese_lorde_crediti} (delta {delta_cred_ci} CHF)",
            )
        )

    # --- V12: Coerenza Indicatori SEL Reported vs Computed ---
    ind_coherent = True
    max_ind_delta = ZERO
    for code, rep_val in ctx.reported_indicators.items():
        if code in ctx.computed_indicators:
            comp_val = ctx.computed_indicators[code]
            tol = TOL_PC if "pro_capite" in code else TOL_PERCENT
            d_ind = abs(rep_val - comp_val)
            if d_ind > tol:
                ind_coherent = False
            max_ind_delta = max(max_ind_delta, d_ind)

    checks.append(
        ValidationCheck(
            rule_code="V12",
            severity="WARNING",
            passed=ind_coherent,
            expected=ZERO,
            actual=max_ind_delta,
            delta=max_ind_delta,
            message=f"V12 - Coerenza Indicatori SEL (Reported vs Computed): delta massimo {max_ind_delta}",
        )
    )

    # --- Segnali S03 & S04 su soglie critiche SEL ---
    debt_ratio = ctx.computed_indicators.get("tasso_indebitamento_netto_pct")
    if debt_ratio is not None and debt_ratio > Decimal("150.0"):
        signals.append(
            FinancialSignal(
                signal_code="S03",
                title="Tasso di Indebitamento Netto Eccessivo",
                description=f"Il tasso di indebitamento netto calcolato ({debt_ratio}%) supera la soglia critica cantonale SEL del 150%.",
                severity="WARNING",
                metadata={"debt_ratio": str(debt_ratio)},
            )
        )

    self_fin = ctx.computed_indicators.get("grado_autofinanziamento_pct")
    if self_fin is not None and self_fin < Decimal("80.0"):
        signals.append(
            FinancialSignal(
                signal_code="S04",
                title="Grado di Autofinanziamento Debole",
                description=f"Il grado di autofinanziamento ({self_fin}%) è inferiore alla soglia normale cantonale SEL dell'80%.",
                severity="WARNING",
                metadata={"self_fin": str(self_fin)},
            )
        )

    return checks, signals


# Alias e wrapper per retrocompatibilità
@dataclass(frozen=True)
class RiassuntoGeneraleInput:
    """Valori del Riassunto Generale (Allegato a - Art. 22 cpv. 1 lett. a RGFCC)."""

    spese_operative: Decimal
    ricavi_operativi: Decimal
    risultato_operativo_dichiarato: Decimal
    spese_finanziarie_34: Decimal
    ricavi_finanziari_44: Decimal
    risultato_finanziario_dichiarato: Decimal
    risultato_ordinario_dichiarato: Decimal
    spese_straordinarie_38: Decimal = ZERO
    ricavi_straordinari_48: Decimal = ZERO
    risultato_straordinario_dichiarato: Decimal = ZERO
    risultato_totale_esercizio_dichiarato: Decimal = ZERO
    addebiti_interni_39: Decimal = ZERO
    accrediti_interni_49: Decimal = ZERO
    uscite_investimenti_ba_5: Decimal = ZERO
    entrate_investimenti_ba_6: Decimal = ZERO
    onere_netto_investimenti_dichiarato: Decimal = ZERO


def validate_riassunto_generale(data: RiassuntoGeneraleInput) -> list[ValidationCheck]:
    """Helper di retrocompatibilità per verificare i primi 7 stadi del Riassunto Generale."""
    ctx = ValidationContext(
        spese_operative=data.spese_operative,
        ricavi_operativi=data.ricavi_operativi,
        risultato_operativo_dichiarato=data.risultato_operativo_dichiarato,
        spese_finanziarie_34=data.spese_finanziarie_34,
        ricavi_finanziari_44=data.ricavi_finanziari_44,
        risultato_finanziario_dichiarato=data.risultato_finanziario_dichiarato,
        risultato_ordinario_dichiarato=data.risultato_ordinario_dichiarato,
        spese_straordinarie_38=data.spese_straordinarie_38,
        ricavi_straordinari_48=data.ricavi_straordinari_48,
        risultato_straordinario_dichiarato=data.risultato_straordinario_dichiarato,
        risultato_totale_esercizio_dichiarato=data.risultato_totale_esercizio_dichiarato,
        addebiti_interni_39=data.addebiti_interni_39,
        accrediti_interni_49=data.accrediti_interni_49,
        uscite_investimenti_ba_5=data.uscite_investimenti_ba_5,
        entrate_investimenti_ba_6=data.entrate_investimenti_ba_6,
        onere_netto_investimenti_dichiarato=data.onere_netto_investimenti_dichiarato,
    )
    checks, _ = validate_mca2_document(ctx)
    return [c for c in checks if c.rule_code in ("V01", "V02", "V03", "V04", "V05", "V06", "V07")]
