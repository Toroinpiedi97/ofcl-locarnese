"""
Suite di test unitari e property-based (Hypothesis) per OFCL Fase 1:
- Guardrail Anti-Corfin (C-01)
- Seed anagrafica 19 Comuni (`seed_ref.py` e `registry/comuni.yaml`)
- Parser monetario ticinese al centesimo `0.01 CHF` (`chf_parser.py`)
- Motore di quadratura contabile MCA2 (`mca2_engine.py`, regole V01-V07)
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from ofcl.extract.chf_parser import format_chf_swiss, parse_chf
from ofcl.seed_ref import (
    ACCOUNTS_MCA2,
    FUNCTIONS_MCA2,
    INDICATORS_DEF,
    POPULATION_STATPOP_2019_2026,
    TAX_MULTIPLIERS_2019_2026,
    enforce_corfin_guardrail,
    generate_seed_sql,
    load_municipalities,
)
from ofcl.validate.mca2_engine import RiassuntoGeneraleInput, validate_riassunto_generale


def test_corfin_guardrail_blocks_forbidden_url(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifica che il guardrail C-01 blocchi qualsiasi variabile contenente l'ID Corfin."""
    monkeypatch.setenv("SUPABASE_URL", "https://vrqnbdcsavgpdgijpiic.supabase.co")
    with pytest.raises(RuntimeError, match="C-01 VIOLATION"):
        enforce_corfin_guardrail()


def test_load_19_municipalities_and_seed_sql() -> None:
    """Verifica che `registry/comuni.yaml` contenga esattamente i 19 Comuni del Locarnese."""
    repo_root = Path(__file__).resolve().parents[2]
    yaml_path = repo_root / "registry" / "comuni.yaml"
    municipalities = load_municipalities(yaml_path)

    assert len(municipalities) == 19
    ust_codes = {m.ust_code for m in municipalities}
    assert 5091 in ust_codes  # Ascona
    assert 5113 in ust_codes  # Locarno
    assert 5115 in ust_codes  # Losone
    assert 5399 in ust_codes  # Verzasca

    # Verifica che Locarno abbia il flag disallow_all (C-02)
    locarno = next(m for m in municipalities if m.ust_code == 5113)
    assert locarno.robots.disallow_all is True

    # Verifica moltiplicatori differenziati PF/PG 2026
    assert TAX_MULTIPLIERS_2019_2026[5113][2026] == (Decimal("90.00"), Decimal("97.00"))
    assert TAX_MULTIPLIERS_2019_2026[5398][2026] == (Decimal("85.00"), Decimal("100.00"))
    assert TAX_MULTIPLIERS_2019_2026[5397][2026] == (Decimal("95.00"), Decimal("120.00"))

    # Verifica presenza degli 8 indicatori ufficiali SEL e dei 10 dicasteri MCA2
    assert len(INDICATORS_DEF) == 8
    top_functions = [f for f in FUNCTIONS_MCA2 if f[1] == 1]
    assert len(top_functions) == 10
    assert len(ACCOUNTS_MCA2) >= 80

    sql = generate_seed_sql(municipalities)
    assert "INSERT INTO ref.municipality" in sql
    assert "ON CONFLICT (ust_code) DO UPDATE" in sql
    assert "INSERT INTO ref.population" in sql
    assert "INSERT INTO ref.civic_benefit_def" in sql
    assert "INSERT INTO ref.municipal_civic_item" in sql


def test_statpop_population_19_comuni_coverage() -> None:
    """Verifica che la popolazione permanente STATPOP copra tutti i 19 Comuni per gli anni 2019-2026."""
    assert len(POPULATION_STATPOP_2019_2026) == 19
    for years_map in POPULATION_STATPOP_2019_2026.values():
        assert len(years_map) == 8  # 2019..2026
        for year in range(2019, 2027):
            assert year in years_map
            assert years_map[year] > 0

    # Sanity check su comuni chiave
    assert POPULATION_STATPOP_2019_2026[5113][2025] == 16463  # Locarno
    assert POPULATION_STATPOP_2019_2026[5091][2025] == 5290   # Ascona
    assert POPULATION_STATPOP_2019_2026[5115][2025] == 6780   # Losone


def test_parse_chf_exact_formats() -> None:
    """Verifica i formati monetari ticinesi nei tabulati Ge.Co.Ti. Web e nei Messaggi Municipali."""
    assert parse_chf("15'432'147.41") == Decimal("15432147.41")
    assert parse_chf("15’432’147.41") == Decimal("15432147.41")
    assert parse_chf("1'480'000.--") == Decimal("1480000.00")
    assert parse_chf("70'000.-") == Decimal("70000.00")
    assert parse_chf("./. 1'530'900.00") == Decimal("-1530900.00")
    assert parse_chf("(301'480.00)") == Decimal("-301480.00")
    assert parse_chf("+322'862,32") == Decimal("322862.32")

    # Distinzione rigorosa tra 0.00 CHF e dato mancante (n.d.)
    assert parse_chf("0.00") == Decimal("0.00")
    assert parse_chf("0.--") == Decimal("0.00")
    assert parse_chf("n.d.") is None
    assert parse_chf("-") is None
    assert parse_chf("") is None
    assert parse_chf("n.d.", empty_as_none=False) == Decimal("0.00")

    # Rifiuto di più di 2 cifre decimali
    with pytest.raises(ValueError, match="più di 2 decimali"):
        parse_chf("123.456")


@given(
    cents=st.integers(min_value=-999_999_999_99, max_value=999_999_999_99),
)
def test_property_roundtrip_chf_formatting(cents: int) -> None:
    """Property-based test (Hypothesis): roundtrip perfetto a 0.01 CHF senza perdita di precisione."""
    val = (Decimal(cents) / Decimal(100)).quantize(Decimal("0.01"))
    formatted = format_chf_swiss(val)
    parsed = parse_chf(formatted)
    assert parsed == val


def test_mca2_validation_engine_detects_1_cent_error() -> None:
    """Verifica che il motore V01-V07 intercetti anche 0.01 CHF di squadratura."""
    valid_input = RiassuntoGeneraleInput(
        spese_operative=Decimal("1000000.00"),
        ricavi_operativi=Decimal("1250000.55"),
        risultato_operativo_dichiarato=Decimal("250000.55"),
        spese_finanziarie_34=Decimal("50000.00"),
        ricavi_finanziari_44=Decimal("10000.00"),
        risultato_finanziario_dichiarato=Decimal("-40000.00"),
        risultato_ordinario_dichiarato=Decimal("210000.55"),
        risultato_totale_esercizio_dichiarato=Decimal("210000.55"),
        addebiti_interni_39=Decimal("85000.20"),
        accrediti_interni_49=Decimal("85000.20"),
        uscite_investimenti_ba_5=Decimal("500000.00"),
        entrate_investimenti_ba_6=Decimal("120000.00"),
        onere_netto_investimenti_dichiarato=Decimal("380000.00"),
    )
    checks_ok = validate_riassunto_generale(valid_input)
    assert all(c.passed for c in checks_ok)

    # Introduciamo uno sbilancio di 1 solo centesimo (0.01 CHF) sulle imputazioni interne (V06)
    broken_input = RiassuntoGeneraleInput(
        **{
            **valid_input.__dict__,
            "accrediti_interni_49": Decimal("85000.21"),
        }
    )
    checks_fail = validate_riassunto_generale(broken_input)
    v06 = next(c for c in checks_fail if c.rule_code == "V06")
    assert v06.passed is False
    assert v06.delta == Decimal("0.01")
