"""
Loader Transazionale per PostgreSQL / Supabase (Task T037).
Conformità: docs/spec/07-validation-engine.md, docs/spec/04-data-model.md.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

from ofcl.extract.table_extractor import CreditWorkItem, ExtractedCell, LedgerRowItem
from ofcl.seed_ref import FORBIDDEN_CORFIN_REF, enforce_corfin_guardrail

NIL_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")


def _validate_uuid(val: Any, field_name: str) -> str:
    """Valida che val sia un UUID valido e non nullo. Restituisce la stringa canonica dell'UUID."""
    if not val or not str(val).strip():
        raise ValueError(f"Campo '{field_name}' obbligatorio: stringa vuota o None non permessa")
    clean_str = str(val).strip()
    try:
        parsed = uuid.UUID(clean_str)
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError(f"Campo '{field_name}' non è un UUID valido: {clean_str!r}") from exc
    if parsed == NIL_UUID:
        raise ValueError(f"Campo '{field_name}' non può essere un UUID nullo ({NIL_UUID})")
    return str(parsed)


class PostgresLoader:
    """Carica i dati estratti e validati nelle tabelle core.* e audit.*."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.environ.get("DATABASE_URL")
        self._assert_write_allowed()

    def _assert_write_allowed(self) -> None:
        """Verifica i guardrail ambientali e di stringa di connessione (C-01 Corfin isolation)."""
        enforce_corfin_guardrail()
        if self.database_url and FORBIDDEN_CORFIN_REF in self.database_url:
            raise RuntimeError(
                "[CRITICAL C-01 VIOLATION] Rilevato riferimento a Corfin in database_url. "
                "Operazione bloccata."
            )

    def save_ledger_cells(
        self,
        version_id: str | None = None,
        entity_id: str = "",
        cells: dict[str, ExtractedCell] | None = None,
        statement_year: int = 2025,
        status: str = "NEEDS_REVIEW",
        document_version_id: str | None = None,
    ) -> int:
        """
        Salva i valori contabili estratti in core.ledger_value con geometria e provenance.
        Allineato alla migrazione 0002 (version_id, side 'SPESA', bbox numeric[], mandatory columns).
        Ritorna il numero di righe inserite.
        """
        self._assert_write_allowed()
        actual_version_id = _validate_uuid(version_id or document_version_id, "version_id")
        clean_entity_id = _validate_uuid(entity_id, "entity_id")
        cells = cells or {}

        if not self.database_url:
            return len(cells)

        try:
            import psycopg
        except ImportError:
            return len(cells)

        query = """
        INSERT INTO core.ledger_value (
            version_id, entity_id, statement, view_kind,
            account_code, label_raw, column_role, ref_year,
            value_kind, side, amount_chf, amount_raw,
            page, bbox, method, parser_version
        )
        VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s
        )
        ON CONFLICT DO NOTHING
        """

        count = 0
        with psycopg.connect(self.database_url) as conn, conn.transaction(), conn.cursor() as cur:
            for metric_key, cell in cells.items():
                statement = "CE"
                side = "SALDO"

                if "investimenti" in metric_key:
                    statement = "CI"

                if "uscite" in metric_key or "spese" in metric_key:
                    side = "SPESA"
                elif "entrate" in metric_key or "ricavi" in metric_key:
                    side = "RICAVO"
                elif "attivi" in metric_key or "patrimoniali" in metric_key:
                    statement = "BIL"
                    side = "ATTIVO"
                elif "passivi" in metric_key or "terzi" in metric_key or "proprio" in metric_key:
                    statement = "BIL"
                    side = "PASSIVO"

                bbox_list = [float(round(c, 2)) for c in cell.bbox] if cell.bbox else None
                cur.execute(
                    query,
                    (
                        actual_version_id,
                        clean_entity_id,
                        statement,
                        "RIASSUNTO",
                        metric_key,
                        cell.raw_text or metric_key,
                        "CURRENT",
                        statement_year,
                        "ACTUAL",
                        side,
                        cell.amount_chf,
                        cell.raw_text,
                        cell.page,
                        bbox_list,
                        "DETERMINISTIC",
                        "gecoti_v3",
                    ),
                )
                count += 1

        return count

    def save_ledger_items(
        self,
        version_id: str | None = None,
        entity_id: str = "",
        items: list[LedgerRowItem] | None = None,
        base_fiscal_year: int = 2025,
        parser_version: str = "gecoti_v3",
        replace_existing: bool = True,
    ) -> int:
        """
        Salva righe analitiche (RIASSUNTO multi-colonna, NATURA lett_c, FUNZIONE lett_d) in core.ledger_value.
        Esegue sostituzione idempotente per version_id nella stessa transazione.
        """
        self._assert_write_allowed()
        actual_version_id = _validate_uuid(version_id, "version_id")
        clean_entity_id = _validate_uuid(entity_id, "entity_id")
        items = items or []

        if not self.database_url:
            return len(items)

        try:
            import psycopg
        except ImportError:
            return len(items)

        insert_sql = """
        INSERT INTO core.ledger_value (
            version_id, entity_id, statement, view_kind,
            function_code, account_code, detail_code, label_raw,
            column_role, ref_year, value_kind, side,
            amount_chf, amount_raw, page, bbox, method, parser_version
        )
        VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        """

        count = 0
        with psycopg.connect(self.database_url) as conn, conn.transaction(), conn.cursor() as cur:
            if replace_existing:
                cur.execute(
                    "DELETE FROM core.ledger_value WHERE version_id = %s",
                    (actual_version_id,),
                )
            for item in items:
                ref_year = (
                    base_fiscal_year - 1
                    if item.column_role == "PRIOR_ACTUAL"
                    else base_fiscal_year
                )
                bbox_list = [float(round(c, 2)) for c in item.bbox] if item.bbox else None
                cur.execute(
                    insert_sql,
                    (
                        actual_version_id,
                        clean_entity_id,
                        item.statement,
                        item.view_kind,
                        item.function_code,
                        item.account_code,
                        None,
                        item.label_raw,
                        item.column_role,
                        ref_year,
                        item.value_kind,
                        item.side,
                        item.amount_chf,
                        item.amount_raw,
                        item.page,
                        bbox_list,
                        "DETERMINISTIC",
                        parser_version,
                    ),
                )
                count += 1

        return count

    def save_credits_snapshot(
        self,
        version_id: str | None = None,
        ust_code: int = 0,
        year: int = 2025,
        items: list[CreditWorkItem] | None = None,
        entity_id: str | None = None,
        document_version_id: str | None = None,
    ) -> int:
        """
        Salva le righe dell'Allegato f in core.credit_snapshot.
        Allineato alla migrazione 0002 (version_id, credit_id, fiscal_year, used_at_0101, spent_year, spent_total, amount_voted, residual, page, method).
        Overrun è calcolato automaticamente dal DB (residual < 0).
        """
        self._assert_write_allowed()
        actual_version_id = _validate_uuid(version_id or document_version_id, "version_id")
        clean_entity_id = _validate_uuid(entity_id, "entity_id") if entity_id is not None else None
        items = items or []

        if not self.database_url:
            return len(items)

        try:
            import psycopg
        except ImportError:
            return len(items)

        count = 0
        with psycopg.connect(self.database_url) as conn, conn.transaction(), conn.cursor() as cur:
            for it in items:
                # 1. Recupera o crea anagrafica credito in core.investment_credit
                cur.execute(
                    """
                    SELECT id FROM core.investment_credit
                    WHERE ust_code = %s AND account_full = %s
                    LIMIT 1
                    """,
                    (ust_code, it.account_code),
                )
                row = cur.fetchone()
                if row:
                    credit_id = row[0]
                else:
                    cur.execute(
                        """
                        INSERT INTO core.investment_credit (
                            ust_code, entity_id, account_full, mm_number, title, amount_voted
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            ust_code,
                            clean_entity_id,
                            it.account_code,
                            it.mm_no or None,
                            it.description or "Credito d'opera",
                            it.voted_credit,
                        ),
                    )
                    inserted = cur.fetchone()
                    credit_id = inserted[0] if inserted else None

                if not credit_id:
                    continue

                # 2. Inserimento snapshot credito
                cur.execute(
                    """
                    INSERT INTO core.credit_snapshot (
                        version_id, credit_id, fiscal_year, used_at_0101,
                        spent_year, spent_total, amount_voted, residual,
                        page, method
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (version_id, credit_id) DO UPDATE SET
                        used_at_0101 = EXCLUDED.used_at_0101,
                        spent_year = EXCLUDED.spent_year,
                        spent_total = EXCLUDED.spent_total,
                        amount_voted = EXCLUDED.amount_voted,
                        residual = EXCLUDED.residual,
                        page = EXCLUDED.page,
                        method = EXCLUDED.method
                    """,
                    (
                        actual_version_id,
                        credit_id,
                        year,
                        it.spent_prev,
                        it.spent_year,
                        it.spent_total,
                        it.voted_credit,
                        it.remaining_credit,
                        it.page,
                        "DETERMINISTIC",
                    ),
                )
                count += 1

        return count

    def save_social_drafts(self, drafts: list[Any] | None = None) -> int:
        """
        Salva le bozze social generate in core.social_post_draft.
        Usa ON CONFLICT (dedup_key) DO NOTHING per preservare eventuali revisioni umane esistenti.
        """
        self._assert_write_allowed()
        drafts = drafts or []
        if not drafts:
            return 0
        if not self.database_url:
            return len(drafts)

        try:
            import json

            import psycopg
        except ImportError:
            return len(drafts)

        sql = """
        INSERT INTO core.social_post_draft (
            signal_code, dedup_key, ust_code, ref_year, title,
            question_for_municipality, verified_payload, slides_json,
            caption_draft, hashtags, source_urls, generation_mode, status
        )
        VALUES (
            %s, %s, %s, %s, %s,
            %s, %s::jsonb, %s::jsonb,
            %s, %s, %s, %s, 'DRAFT'
        )
        ON CONFLICT (dedup_key) DO NOTHING
        """

        inserted = 0
        with psycopg.connect(self.database_url) as conn, conn.transaction(), conn.cursor() as cur:
            for d in drafts:
                payload = d.to_dict() if hasattr(d, "to_dict") else dict(d)
                cur.execute(
                    sql,
                    (
                        payload["signal_code"],
                        payload["dedup_key"],
                        payload.get("ust_code"),
                        int(payload["ref_year"]),
                        payload["title"],
                        payload["question_for_municipality"],
                        json.dumps(payload["verified_payload"], ensure_ascii=False),
                        json.dumps(payload["slides_json"], ensure_ascii=False),
                        payload["caption_draft"],
                        payload.get("hashtags", []),
                        payload["source_urls"],
                        payload.get("generation_mode", "DETERMINISTIC"),
                    ),
                )
                inserted += cur.rowcount

        return inserted
