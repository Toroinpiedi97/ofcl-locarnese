"""
Parser deterministico per importi monetari svizzeri (CHF) in tabulati MCA2 / Ge.Co.Ti. Web.

Regole non negoziabili OFCL:
1. Precisione assoluta al centesimo (0.01 CHF, Decimal('0.01')).
2. Vietato qualsiasi arrotondamento commerciale a 0.05 CHF.
3. Distinzione rigorosa tra 0.00 CHF esplicito e dato non disponibile (None / 'n.d.').
4. Supporto per separatori migliaia ticinesi (' e ’), suffissi interi (.-- e .-),
   deduzioni contabili (./.) e parentesi negative.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

_NA_TOKENS = frozenset({"", "-", "--", "—", "n.d.", "n.d", "n.a.", "n.a", "null", "none"})
_ZERO_TOKENS = frozenset({"0", "0.0", "0.00", "0,00", "0.-", "0.--", "0'00", "0.00.-"})


def parse_chf(raw_value: str | None, *, empty_as_none: bool = True) -> Decimal | None:
    """
    Converte una stringa monetaria ticinese in `Decimal` esatto al centesimo (0.01 CHF).

    Restituisce `None` se la cella è vuota o 'n.d.' (quando `empty_as_none=True`),
    oppure `Decimal('0.00')` se rappresenta esplicitamente zero (o se `empty_as_none=False`).
    Solleva `ValueError` su stringhe malformate non numeriche.
    """
    if raw_value is None:
        return None if empty_as_none else Decimal("0.00")

    cleaned = raw_value.strip()
    # Rimuove eventuale prefisso/suffisso valuta CHF / fr.
    cleaned = re.sub(r"^(?:CHF|Fr\.|fr\.)\s*", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"\s*(?:CHF|Fr\.|fr\.)$", "", cleaned, flags=re.IGNORECASE).strip()

    if cleaned.lower() in _NA_TOKENS:
        return None if empty_as_none else Decimal("0.00")

    if cleaned.lower() in _ZERO_TOKENS:
        return Decimal("0.00")

    is_negative = False

    # Deduzione contabile ticinese ./. (es. "./. 1'530'900.00" o "./.15'000.--")
    if cleaned.startswith("./."):
        is_negative = True
        cleaned = cleaned[3:].strip()
    elif cleaned.startswith("(") and cleaned.endswith(")"):
        is_negative = True
        cleaned = cleaned[1:-1].strip()

    if cleaned.startswith("-"):
        is_negative = True
        cleaned = cleaned[1:].strip()
    elif cleaned.startswith("+"):
        cleaned = cleaned[1:].strip()

    if cleaned.lower() in _ZERO_TOKENS:
        return Decimal("0.00")

    # Sostituzione suffissi interi ticinesi .-- / .- / ,-- / ,-
    cleaned = re.sub(r"[.,](?:--|–|-)$", ".00", cleaned)

    # Rimozione separatori delle migliaia (' ASCII, ’ tipografico, spazio, thin space)
    cleaned = (
        cleaned.replace("'", "")
        .replace("’", "")
        .replace("‘", "")
        .replace("\u00a0", "")
        .replace("\u202f", "")
        .replace(" ", "")
    )

    # Se usa la virgola come separatore decimale (es. nel testo dei Messaggi Municipali: 322'862,32)
    if "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")

    try:
        val = Decimal(cleaned)
    except InvalidOperation as exc:
        raise ValueError(f"Impossibile convertire in importo CHF valido: {raw_value!r}") from exc

    # Verifica che non abbia più di 2 cifre decimali (al centesimo esatto 0.01 CHF)
    quantized = val.quantize(Decimal("0.01"))
    if quantized != val:
        raise ValueError(
            f"Importo con più di 2 decimali non ammesso in contabilità MCA2: {raw_value!r}"
        )

    if quantized == Decimal("0.00"):
        return Decimal("0.00")

    return -quantized if is_negative else quantized


def format_chf_swiss(amount: Decimal | None) -> str:
    """Formatta un Decimal in formato svizzero ufficiale con apostrofo (es. 15'432'147.41)."""
    if amount is None:
        return "n.d."
    q = amount.quantize(Decimal("0.01"))
    sign = "-" if q < 0 else ""
    abs_q = abs(q)
    int_part, dec_part = f"{abs_q:.2f}".split(".")
    # Raggruppa a blocchi di 3 con apostrofo
    rev = int_part[::-1]
    grouped = "'".join(rev[i : i + 3] for i in range(0, len(rev), 3))[::-1]
    return f"{sign}{grouped}.{dec_part}"
