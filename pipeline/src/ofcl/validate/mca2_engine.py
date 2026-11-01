"""
Motore di Validazione e Quadratura Contabile MCA2 (V01-V12) e Calcolo degli 8 Indicatori SEL.

Tutti i calcoli operano rigorosamente con `Decimal` a precisione centesimale `0.01 CHF`.
Qualsiasi scostamento > 0.00 CHF su una regola BLOCKING impedisce la pubblicazione automatica.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

ZERO = Decimal("0.00")


@dataclass(frozen=True)
class ValidationCheck:
    rule_code: str
    severity: Literal["BLOCKING", "WARNING", "INFO"]
    passed: bool
    expected: Decimal
    actual: Decimal
    delta: Decimal
    message: str


@dataclass(frozen=True)
class RiassuntoGeneraleInput:
    """Valori del Riassunto Generale (Allegato a - Art. 22 cpv. 1 lett. a RGFCC)."""

    # Stadio 1: Risultato Operativo (senza imputazioni interne 39/49)
    spese_operative: Decimal  # 30+31+33+35+36+37
    ricavi_operativi: Decimal  # 40+41+42+43+45+46
    risultato_operativo_dichiarato: Decimal  # Ricavi operativi - Spese operative (positivo = avanzo)

    # Stadio 2: Risultato Finanziario e Risultato Ordinario
    spese_finanziarie_34: Decimal
    ricavi_finanziari_44: Decimal
    risultato_finanziario_dichiarato: Decimal  # Ricavi 44 - Spese 34
    risultato_ordinario_dichiarato: Decimal  # Risultato operativo + Risultato finanziario

    # Stadio 3: Risultato Straordinario e Risultato Totale d'Esercizio
    spese_straordinarie_38: Decimal = ZERO
    ricavi_straordinari_48: Decimal = ZERO
    risultato_straordinario_dichiarato: Decimal = ZERO
    risultato_totale_esercizio_dichiarato: Decimal = ZERO

    # Imputazioni interne (verifica V06: 39 == 49)
    addebiti_interni_39: Decimal = ZERO
    accrediti_interni_49: Decimal = ZERO

    # Conto degli Investimenti (verifica V07)
    uscite_investimenti_ba_5: Decimal = ZERO
    entrate_investimenti_ba_6: Decimal = ZERO
    onere_netto_investimenti_dichiarato: Decimal = ZERO


def validate_riassunto_generale(data: RiassuntoGeneraleInput) -> list[ValidationCheck]:
    """Esegue i controlli di quadratura bloccanti V01..V07 sul Riassunto Generale MCA2."""
    checks: list[ValidationCheck] = []

    # V01: Risultato Operativo = Ricavi Operativi - Spese Operative
    exp_op = (data.ricavi_operativi - data.spese_operative).quantize(ZERO)
    act_op = data.risultato_operativo_dichiarato.quantize(ZERO)
    delta_op = act_op - exp_op
    checks.append(
        ValidationCheck(
            rule_code="V01",
            severity="BLOCKING",
            passed=(delta_op == ZERO),
            expected=exp_op,
            actual=act_op,
            delta=delta_op,
            message=f"Quadratura 1° Stadio (Risultato Operativo): atteso {exp_op}, dichiarato {act_op} (delta {delta_op} CHF)",
        )
    )

    # V02: Risultato Finanziario = Ricavi Finanziari (44) - Spese Finanziarie (34)
    exp_fin = (data.ricavi_finanziari_44 - data.spese_finanziarie_34).quantize(ZERO)
    act_fin = data.risultato_finanziario_dichiarato.quantize(ZERO)
    delta_fin = act_fin - exp_fin
    checks.append(
        ValidationCheck(
            rule_code="V02",
            severity="BLOCKING",
            passed=(delta_fin == ZERO),
            expected=exp_fin,
            actual=act_fin,
            delta=delta_fin,
            message=f"Quadratura 2° Stadio (Risultato Finanziario): atteso {exp_fin}, dichiarato {act_fin} (delta {delta_fin} CHF)",
        )
    )

    # V03: Risultato Ordinario = Risultato Operativo + Risultato Finanziario
    exp_ord = (act_op + act_fin).quantize(ZERO)
    act_ord = data.risultato_ordinario_dichiarato.quantize(ZERO)
    delta_ord = act_ord - exp_ord
    checks.append(
        ValidationCheck(
            rule_code="V03",
            severity="BLOCKING",
            passed=(delta_ord == ZERO),
            expected=exp_ord,
            actual=act_ord,
            delta=delta_ord,
            message=f"Quadratura Risultato Ordinario: atteso {exp_ord}, dichiarato {act_ord} (delta {delta_ord} CHF)",
        )
    )

    # V04: Risultato Straordinario = Ricavi Straordinari (48) - Spese Straordinarie (38)
    exp_str = (data.ricavi_straordinari_48 - data.spese_straordinarie_38).quantize(ZERO)
    act_str = data.risultato_straordinario_dichiarato.quantize(ZERO)
    delta_str = act_str - exp_str
    checks.append(
        ValidationCheck(
            rule_code="V04",
            severity="BLOCKING",
            passed=(delta_str == ZERO),
            expected=exp_str,
            actual=act_str,
            delta=delta_str,
            message=f"Quadratura 3° Stadio (Risultato Straordinario): atteso {exp_str}, dichiarato {act_str} (delta {delta_str} CHF)",
        )
    )

    # V05: Risultato Totale d'Esercizio = Risultato Ordinario + Risultato Straordinario
    exp_tot = (act_ord + act_str).quantize(ZERO)
    act_tot = data.risultato_totale_esercizio_dichiarato.quantize(ZERO)
    delta_tot = act_tot - exp_tot
    checks.append(
        ValidationCheck(
            rule_code="V05",
            severity="BLOCKING",
            passed=(delta_tot == ZERO),
            expected=exp_tot,
            actual=act_tot,
            delta=delta_tot,
            message=f"Quadratura Risultato Totale d'Esercizio: atteso {exp_tot}, dichiarato {act_tot} (delta {delta_tot} CHF)",
        )
    )

    # V06: Pareggio Imputazioni Interne (Addebiti 39 == Accrediti 49)
    exp_int = data.addebiti_interni_39.quantize(ZERO)
    act_int = data.accrediti_interni_49.quantize(ZERO)
    delta_int = act_int - exp_int
    checks.append(
        ValidationCheck(
            rule_code="V06",
            severity="BLOCKING",
            passed=(delta_int == ZERO),
            expected=exp_int,
            actual=act_int,
            delta=delta_int,
            message=f"Pareggio Imputazioni Interne (39 vs 49): addebiti {exp_int}, accrediti {act_int} (delta {delta_int} CHF)",
        )
    )

    # V07: Onere Netto per Investimenti = Uscite Investimenti (5) - Entrate Investimenti (6)
    exp_inv = (data.uscite_investimenti_ba_5 - data.entrate_investimenti_ba_6).quantize(ZERO)
    act_inv = data.onere_netto_investimenti_dichiarato.quantize(ZERO)
    delta_inv = act_inv - exp_inv
    checks.append(
        ValidationCheck(
            rule_code="V07",
            severity="BLOCKING",
            passed=(delta_inv == ZERO),
            expected=exp_inv,
            actual=act_inv,
            delta=delta_inv,
            message=f"Quadratura Conto Investimenti (Onere Netto): atteso {exp_inv}, dichiarato {act_inv} (delta {delta_inv} CHF)",
        )
    )

    return checks
