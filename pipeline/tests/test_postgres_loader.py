"""
Test di sicurezza per PostgresLoader (Fase 3).
Verifica:
1. Guardrail C-01 (blocco immediato se puntato a Corfin).
2. Rigido rifiuto di stringhe vuote, valori non-UUID e UUID nulli.
"""

import uuid
from decimal import Decimal

import pytest

from ofcl.extract.table_extractor import ExtractedCell
from ofcl.load.postgres_loader import PostgresLoader, _validate_uuid
from ofcl.seed_ref import FORBIDDEN_CORFIN_REF


def test_validate_uuid_success() -> None:
    valid_str = "12345678-1234-5678-1234-567812345678"
    assert _validate_uuid(valid_str, "test_field") == valid_str


def test_validate_uuid_rejects_nil_uuid() -> None:
    nil_str = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(ValueError, match="non può essere un UUID nullo"):
        _validate_uuid(nil_str, "version_id")


def test_validate_uuid_rejects_empty_and_invalid() -> None:
    with pytest.raises(ValueError, match="obbligatorio"):
        _validate_uuid("", "version_id")

    with pytest.raises(ValueError, match="non è un UUID valido"):
        _validate_uuid("invalid-uuid-string", "entity_id")


def test_postgres_loader_corfin_guardrail_in_url() -> None:
    bad_url = f"postgresql://postgres:secret@db.{FORBIDDEN_CORFIN_REF}.supabase.co:5432/postgres"
    with pytest.raises(RuntimeError, match="CRITICAL C-01 VIOLATION"):
        PostgresLoader(bad_url)


def test_postgres_loader_corfin_guardrail_in_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "DATABASE_URL", f"postgresql://db.{FORBIDDEN_CORFIN_REF}.supabase.co:5432/postgres"
    )
    with pytest.raises(RuntimeError, match="CRITICAL C-01 VIOLATION"):
        PostgresLoader()


def test_postgres_loader_rejects_dummy_zero_uuids() -> None:
    loader = PostgresLoader()  # database_url is None
    dummy_uuid = "00000000-0000-0000-0000-000000000000"
    cells = {
        "spese": ExtractedCell(
            "spese", "consuntivo_t", 1, (0.0, 0.0, 0.0, 0.0), "100.00", Decimal("100.00")
        )
    }
    with pytest.raises(ValueError, match="non può essere un UUID nullo"):
        loader.save_ledger_cells(version_id=dummy_uuid, entity_id=str(uuid.uuid4()), cells=cells)

    with pytest.raises(ValueError, match="non può essere un UUID nullo"):
        loader.save_ledger_cells(version_id=str(uuid.uuid4()), entity_id=dummy_uuid, cells=cells)


def test_postgres_loader_dry_run_success() -> None:
    loader = PostgresLoader()  # database_url is None
    valid_vid = str(uuid.uuid4())
    valid_eid = str(uuid.uuid4())
    cells = {
        "spese": ExtractedCell(
            "spese", "consuntivo_t", 1, (0.0, 0.0, 0.0, 0.0), "100.00", Decimal("100.00")
        )
    }
    saved = loader.save_ledger_cells(version_id=valid_vid, entity_id=valid_eid, cells=cells)
    assert saved == 1
