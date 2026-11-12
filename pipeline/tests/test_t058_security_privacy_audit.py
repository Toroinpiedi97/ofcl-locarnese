"""Test di verifica per T058: Security & Privacy Audit Finale.

In conformità a:
- docs/spec/03-architettura.md §6 (Sicurezza & Isolamento)
- docs/spec/04-data-model.md §5 (RLS su tutte le tabelle)
- docs/spec/12-legal-compliance.md (nLPD / LPDP, assenza PII)
- AGENTS.md (Guardrail C-01 Corfin, Presidio MCA2)
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_t058_rls_on_all_application_tables() -> None:
    """Verifica che tutte le tabelle create nelle migrazioni abbiano RLS abilitata."""
    migrations_dir = REPO_ROOT / "supabase" / "migrations"
    all_sql = "\n".join(f.read_text(encoding="utf-8") for f in sorted(migrations_dir.glob("*.sql")))

    # Tabelle attese identificate
    expected_tables = [
        "raw.source",
        "raw.pipeline_run",
        "raw.document",
        "raw.document_version",
        "core.classification",
        "core.ledger_value",
        "core.indicator_value",
        "core.credit_snapshot",
        "core.asset_snapshot",
        "core.validation_result",
        "audit.curator_action",
        "ref.civic_benefit_def",
        "ref.municipal_civic_item",
        "audit.feedback_ticket",
    ]

    for table in expected_tables:
        pattern = rf"alter\s+table\s+{re.escape(table)}\s+enable\s+row\s+level\s+security"
        match = re.search(pattern, all_sql, re.IGNORECASE)
        assert match is not None, f"RLS non esplicitamente abilitata su tabella: {table}"


def test_t058_feedback_ticket_rls_policy() -> None:
    """Verifica che audit.feedback_ticket abbia la policy riservata al curatore autenticato."""
    migration_file = (
        REPO_ROOT
        / "supabase"
        / "migrations"
        / "20261101000004_civic_deepdive_feedback_and_full_rls.sql"
    )
    sql = migration_file.read_text(encoding="utf-8")

    assert "alter table audit.feedback_ticket enable row level security" in sql.lower()
    assert "curator_all_feedback_ticket on audit.feedback_ticket" in sql
    # Nessun grant di SELECT/INSERT ad anon su audit.feedback_ticket
    assert "grant select on audit.feedback_ticket to anon" not in sql.lower()
    assert "grant insert on audit.feedback_ticket to anon" not in sql.lower()


def test_t058_guardrail_c01_zero_corfin_references() -> None:
    """Verifica che nessun file di configurazione o variabile d'ambiente punti a Corfin."""
    corfin_domain = "vrqnbdcsavgpdgijpiic.supabase.co"
    corfin_id = "vrqnbdcsavgpdgijpiic"

    import os

    for var in ["DATABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "POSTGRES_URL"]:
        val = os.environ.get(var, "")
        assert corfin_domain not in val and corfin_id not in val, f"Variabile {var} punta a Corfin!"

    # Verifica file di configurazione
    config_files = [
        REPO_ROOT / ".env.example",
        REPO_ROOT / "web" / "src" / "lib" / "supabase" / "client.ts",
        REPO_ROOT / "web" / "src" / "lib" / "supabase" / "server.ts",
    ]
    for cfg in config_files:
        if cfg.exists():
            for line in cfg.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("#") or not line:
                    continue
                assert corfin_domain not in line and corfin_id not in line, (
                    f"{cfg} assegna valori collegati a Corfin: {line}"
                )


def test_t058_zero_pii_in_documents_catalog() -> None:
    """Verifica che il catalogo documenti statico non esponga atti con dati personali."""
    doc_file = REPO_ROOT / "web" / "src" / "data" / "documents.ts"
    text = doc_file.read_text(encoding="utf-8")

    # In documents.ts tutti i documenti devono avere has_personal_data: false
    assert "has_personal_data: true" not in text
    assert text.count("has_personal_data: false") >= 39
