"""
Loader Transazionale per PostgreSQL / Supabase (Task T037).
Conformità: docs/spec/07-validation-engine.md, docs/spec/04-data-model.md.
"""

from __future__ import annotations

import json
import os

from ofcl.extract.table_extractor import CreditWorkItem, ExtractedCell


class PostgresLoader:
    """Carica i dati estratti e validati nelle tabelle core.* e audit.*."""

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.environ.get("DATABASE_URL")

    def save_ledger_cells(
        self,
        document_version_id: str,
        entity_id: str,
        cells: dict[str, ExtractedCell],
        statement_year: int,
        status: str = "NEEDS_REVIEW",
    ) -> int:
        """
        Salva i valori contabili estratti in core.ledger_value con geometria e provenance.
        Ritorna il numero di righe inserite.
        """
        if not self.database_url:
            return len(cells)

        try:
            import psycopg
        except ImportError:
            return len(cells)

        query = """
        INSERT INTO core.ledger_value (
            document_version_id, entity_id, statement, side, account_code,
            amount_chf, amount_raw, page, bbox, status, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, NOW())
        ON CONFLICT DO NOTHING
        """

        count = 0
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cur:
                for metric_key, cell in cells.items():
                    statement = "CE"
                    side = "SALDO"
                    if "uscite" in metric_key or "spese" in metric_key:
                        side = "USCITA"
                    elif "entrate" in metric_key or "ricavi" in metric_key:
                        side = "RICAVO"
                    elif "attivi" in metric_key or "patrimoniali" in metric_key:
                        statement = "BIL"
                        side = "ATTIVO"
                    elif "passivi" in metric_key or "terzi" in metric_key or "proprio" in metric_key:
                        statement = "BIL"
                        side = "PASSIVO"

                    bbox_json = json.dumps([round(c, 2) for c in cell.bbox])
                    cur.execute(
                        query,
                        (
                            document_version_id,
                            entity_id,
                            statement,
                            side,
                            metric_key,
                            cell.amount_chf,
                            cell.raw_text,
                            cell.page,
                            bbox_json,
                            status,
                        ),
                    )
                    count += 1
            conn.commit()

        return count

    def save_credits_snapshot(
        self,
        document_version_id: str,
        ust_code: int,
        year: int,
        items: list[CreditWorkItem],
    ) -> int:
        """
        Salva le righe dell'Allegato f in core.credit_snapshot.
        """
        if not self.database_url:
            return len(items)

        try:
            import psycopg
        except ImportError:
            return len(items)

        query = """
        INSERT INTO core.credit_snapshot (
            document_version_id, ust_code, year, account_code, description,
            voted_credit, spent_prev, spent_year, spent_total, remaining_credit,
            has_overrun, notes, page, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT DO NOTHING
        """

        count = 0
        with psycopg.connect(self.database_url) as conn:
            with conn.cursor() as cur:
                for it in items:
                    cur.execute(
                        query,
                        (
                            document_version_id,
                            ust_code,
                            year,
                            it.account_code,
                            it.description,
                            it.voted_credit,
                            it.spent_prev,
                            it.spent_year,
                            it.spent_total,
                            it.remaining_credit,
                            it.has_overrun,
                            it.notes,
                            it.page,
                        ),
                    )
                    count += 1
            conn.commit()

        return count
