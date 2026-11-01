"""
Loader Transazionale per PostgreSQL / Supabase (Task T037).
Conformità: docs/spec/07-validation-engine.md, docs/spec/04-data-model.md.
"""

from __future__ import annotations

import os

from ofcl.extract.table_extractor import CreditWorkItem, ExtractedCell


class PostgresLoader:
    """Carica i dati estratti e validati nelle tabelle core.* e audit.*."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.environ.get("DATABASE_URL")

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
        actual_version_id = version_id or document_version_id or ""
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
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cur:
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
                            entity_id,
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
            conn.commit()

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
        actual_version_id = version_id or document_version_id or ""
        items = items or []

        if not self.database_url:
            return len(items)

        try:
            import psycopg
        except ImportError:
            return len(items)

        count = 0
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cur:
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
                                entity_id,
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
            conn.commit()

        return count
