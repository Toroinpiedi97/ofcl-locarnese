"""
Estrattore Geometrico Deterministico dei Tabulati Contabili MCA2 (Task T033 & T034).
Conformità: docs/spec/07-pipeline-estrazione-ocr.md e skills/pdf-layout-extractor.
Precisione: centesimo esatto (0.01 CHF), zero allucinazioni, tracciamento page + bbox.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

import pdfplumber

from ofcl.extract.chf_parser import parse_chf
from ofcl.extract.layout_loader import LayoutConfig, load_and_validate_layout

LAYOUTS_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "registry" / "layouts"


@dataclass
class ExtractedCell:
    """Singola cella estratta con precisione geometrica e contabile."""

    metric_key: str
    col_name: str
    page: int
    bbox: tuple[float, float, float, float]  # (x0, top, x1, bottom)
    raw_text: str
    amount_chf: Decimal | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "metric_key": self.metric_key,
            "col_name": self.col_name,
            "page": self.page,
            "bbox": [round(c, 2) for c in self.bbox],
            "raw_text": self.raw_text,
            "amount_chf": str(self.amount_chf) if self.amount_chf is not None else None,
        }


@dataclass(frozen=True)
class LedgerRowItem:
    """Singola voce contabile normalizzata pronta per core.ledger_value."""

    statement: Literal["CE", "CI", "BIL"]
    view_kind: Literal["RIASSUNTO", "NATURA", "FUNZIONE"]
    function_code: str | None
    account_code: str | None
    label_raw: str
    column_role: Literal["CURRENT", "PRIOR_BUDGET", "PRIOR_ACTUAL"]
    value_kind: Literal["ACTUAL", "BUDGET"]
    side: Literal["SPESA", "RICAVO", "ATTIVO", "PASSIVO", "SALDO"]
    amount_chf: Decimal
    amount_raw: str
    page: int
    bbox: tuple[float, float, float, float]

    def to_dict(self) -> dict[str, Any]:
        return {
            "statement": self.statement,
            "view_kind": self.view_kind,
            "function_code": self.function_code,
            "account_code": self.account_code,
            "label_raw": self.label_raw,
            "column_role": self.column_role,
            "value_kind": self.value_kind,
            "side": self.side,
            "amount_chf": str(self.amount_chf),
            "amount_raw": self.amount_raw,
            "page": self.page,
            "bbox": [round(c, 2) for c in self.bbox],
        }


@dataclass
class CreditWorkItem:
    """Singola opera/credito estratto dalla Tabella di Controllo Crediti (Allegato f)."""

    resolution_cc: str
    mm_no: str
    account_code: str
    description: str
    voted_credit: Decimal
    spent_prev: Decimal
    spent_year: Decimal
    spent_total: Decimal
    remaining_credit: Decimal
    notes: str
    page: int
    has_overrun: bool


class TableExtractor:
    """Estrattore per i tabulati MCA2 basato su template di layout e geometria vettoriale."""

    def __init__(self, layout_family: str = "GECOTI_V3") -> None:
        self.layout_family = layout_family
        self.layout_path = LAYOUTS_DIR / layout_family.lower()
        self.layout: LayoutConfig = load_and_validate_layout(self.layout_path)

    def extract_riassunto_generale(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
    ) -> dict[str, ExtractedCell]:
        """
        Estrae le celle del Riassunto Generale (Art. 22 lett. a RGFCC).
        Estrae i valori di Consuntivo T (col_0), Preventivo T (col_1) e Consuntivo T-1 (col_2).
        """
        cells: dict[str, ExtractedCell] = {}

        col0 = self.layout.rg_config.get_column("consuntivo_t")

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            words = page.extract_words()

            # Raggruppa parole per riga orizzontale (tolleranza 3.5pt)
            lines: list[list[dict[str, Any]]] = []
            for w in words:
                matched = False
                for line in lines:
                    if abs(line[0]["top"] - w["top"]) < 3.5:
                        line.append(w)
                        matched = True
                        break
                if not matched:
                    lines.append([w])

            for line in lines:
                line.sort(key=lambda x: x["x0"])
                line_text = " ".join(x["text"] for x in line)

                for row_key, row_re in self.layout.rg_config.rows_re.items():
                    if row_key in cells:
                        continue
                    if row_re.search(line_text):
                        # Assegnazione colonne basata sull'allineamento a destra Ge.Co.Ti.
                        col0_words = [
                            x for x in line if col0.min_x <= x["x0"] and x["x1"] <= col0.max_x
                        ]
                        if col0_words:
                            raw_str = " ".join(x["text"] for x in col0_words)
                            val = parse_chf(raw_str)
                            bbox = (
                                min(x["x0"] for x in col0_words),
                                min(x["top"] for x in col0_words),
                                max(x["x1"] for x in col0_words),
                                max(x["bottom"] for x in col0_words),
                            )
                            cells[row_key] = ExtractedCell(
                                metric_key=row_key,
                                col_name=col0.id,
                                page=page_num,
                                bbox=bbox,
                                raw_text=raw_str,
                                amount_chf=val,
                            )
                        break

        return cells

    def extract_indicatori_sel(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
    ) -> dict[str, ExtractedCell]:
        """
        Estrae gli 8 indicatori SEL ufficiali dal prospetto di Analisi Finanziaria (lett. o).
        Guidato dalla configurazione validata indicatori_sel.yaml.
        """
        indicators: dict[str, ExtractedCell] = {}
        sel_cfg = self.layout.sel_config

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            words = page.extract_words()

            # Gli indicatori SEL in Ge.Co.Ti. sono posizionati verticalmente con i numeri nella colonna specificata
            val_words = [
                w for w in words if sel_cfg.min_x <= w["x0"] <= sel_cfg.max_x and w["top"] > 120
            ]

            # Associazione alle righe SEL tramite ordinamento verticale
            # Ordine definito in indicatori_sel.yaml
            order_keys = sel_cfg.indicator_order

            # Raggruppa i blocchi di valore per Y
            grouped_vals: list[list[dict[str, Any]]] = []
            for w in val_words:
                if w["text"] == "%":
                    if grouped_vals:
                        grouped_vals[-1].append(w)
                    continue
                matched = False
                for g in grouped_vals:
                    if abs(g[0]["top"] - w["top"]) < 8:
                        g.append(w)
                        matched = True
                        break
                if not matched:
                    grouped_vals.append([w])

            # Associa a ciascun indicatore atteso
            for i, key in enumerate(order_keys):
                if i < len(grouped_vals):
                    cluster = grouped_vals[i]
                    cluster.sort(key=lambda x: x["x0"])
                    raw_str = " ".join(x["text"] for x in cluster)
                    # Pulisce eventuali caratteri non numerici
                    clean_str = raw_str.replace("%", "").strip()
                    try:
                        val = parse_chf(clean_str)
                    except ValueError:
                        continue
                    bbox = (
                        min(x["x0"] for x in cluster),
                        min(x["top"] for x in cluster),
                        max(x["x1"] for x in cluster),
                        max(x["bottom"] for x in cluster),
                    )
                    indicators[key] = ExtractedCell(
                        metric_key=key,
                        col_name="valore",
                        page=page_num,
                        bbox=bbox,
                        raw_text=raw_str,
                        amount_chf=val,
                    )

        return indicators

    def extract_controllo_crediti(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
    ) -> tuple[list[CreditWorkItem], dict[str, ExtractedCell]]:
        """
        Estrae le singole opere e i totali dalla Tabella di Controllo Crediti (Allegato f).
        Gestisce normalizzazione multi-riga e rileva sorpassi di spesa (remaining_credit < 0).
        Totali estratti tramite configurazione validata summary_rows_re.
        """
        items: list[CreditWorkItem] = []
        totals: dict[str, ExtractedCell] = {}

        account_re = re.compile(r"^\d{3}\.\d{4}\.\d{3}$")
        summary_rows_re = self.layout.cc_config.summary_rows_re

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                for row in table:
                    if not row or len(row) < 9:
                        continue

                    # Pulizia celle
                    cells_clean = [c.replace("\n", " ").strip() if c else "" for c in row]

                    # 1. Riconoscimento riga opera (presenza codice conto MCA2)
                    # La colonna 2 è solitamente Conto nº
                    conto = cells_clean[2]
                    if account_re.match(conto):
                        try:
                            voted = parse_chf(cells_clean[4]) or Decimal("0.00")
                            spent_prev = parse_chf(cells_clean[5]) or Decimal("0.00")
                            spent_year = parse_chf(cells_clean[6]) or Decimal("0.00")
                            spent_total = parse_chf(cells_clean[7]) or Decimal("0.00")
                            remaining = parse_chf(cells_clean[8]) or Decimal("0.00")
                        except ValueError:
                            continue

                        notes = cells_clean[9] if len(cells_clean) > 9 else ""
                        item = CreditWorkItem(
                            resolution_cc=cells_clean[0],
                            mm_no=cells_clean[1],
                            account_code=conto,
                            description=cells_clean[3],
                            voted_credit=voted,
                            spent_prev=spent_prev,
                            spent_year=spent_year,
                            spent_total=spent_total,
                            remaining_credit=remaining,
                            notes=notes,
                            page=page_num,
                            has_overrun=(remaining < Decimal("0.00")),
                        )
                        items.append(item)
                    elif items and not conto and cells_clean[3]:
                        # Normalizzazione multi-riga (skill pdf-layout-extractor §3):
                        # Se la riga successiva contiene un Credito Suppletorio
                        if "suppletorio" in cells_clean[3].lower() and cells_clean[4]:
                            try:
                                supp_val = parse_chf(cells_clean[4]) or Decimal("0.00")
                                items[-1].voted_credit += supp_val
                                items[-1].remaining_credit = (
                                    items[-1].voted_credit - items[-1].spent_total
                                ).quantize(Decimal("0.01"))
                                items[-1].has_overrun = items[-1].remaining_credit < Decimal("0.00")
                                items[-1].notes += f" [Suppletorio {supp_val} CHF]"
                            except ValueError:
                                pass
                        elif not any(c for c in cells_clean[4:]):
                            # Continuazione testo descrizione
                            items[-1].description += f" {cells_clean[3]}"

                    # 2. Riconoscimento righe di totale tramite configurazione summary_rows
                    full_row_str = " ".join(cells_clean).lower()
                    for metric_key, summary_re in summary_rows_re.items():
                        if metric_key in totals:
                            continue
                        if summary_re.search(full_row_str):
                            for c in cells_clean:
                                if c and any(d.isdigit() for d in c) and not c.startswith("TOT"):
                                    try:
                                        v = parse_chf(c)
                                        totals[metric_key] = ExtractedCell(
                                            metric_key=metric_key,
                                            col_name="totale",
                                            page=page_num,
                                            bbox=(0.0, 0.0, 0.0, 0.0),
                                            raw_text=c,
                                            amount_chf=v,
                                        )
                                        break
                                    except ValueError:
                                        pass
                            break

        return items, totals

    @staticmethod
    def _group_words_into_lines(words: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
        lines: list[list[dict[str, Any]]] = []
        for w in words:
            matched = False
            for line in lines:
                if abs(line[0]["top"] - w["top"]) < 3.5:
                    line.append(w)
                    matched = True
                    break
            if not matched:
                lines.append([w])
        for line in lines:
            line.sort(key=lambda x: x["x0"])
        lines.sort(key=lambda l: l[0]["top"] if l else 0.0)
        return lines

    @staticmethod
    def _resolve_col_semantics(
        col_name_or_role: str,
        doc_type: str = "CONSUNTIVO",
    ) -> tuple[Literal["CURRENT", "PRIOR_BUDGET", "PRIOR_ACTUAL"], Literal["ACTUAL", "BUDGET"]]:
        norm = col_name_or_role.upper()
        if norm in ("PRIOR_BUDGET", "PREVENTIVO_T"):
            return "PRIOR_BUDGET", "BUDGET"
        if norm in ("PRIOR_ACTUAL", "CONSUNTIVO_T_MINUS_1"):
            return "PRIOR_ACTUAL", "ACTUAL"
        if doc_type.upper() == "PREVENTIVO":
            return "CURRENT", "BUDGET"
        return "CURRENT", "ACTUAL"

    @staticmethod
    def _infer_riassunto_statement_side(
        metric_key: str,
    ) -> tuple[Literal["CE", "CI", "BIL"], Literal["SPESA", "RICAVO", "ATTIVO", "PASSIVO", "SALDO"]]:
        statement: Literal["CE", "CI", "BIL"] = "CE"
        side: Literal["SPESA", "RICAVO", "ATTIVO", "PASSIVO", "SALDO"] = "SALDO"
        if "investimenti" in metric_key:
            statement = "CI"
        if "uscite" in metric_key or "spese" in metric_key:
            side = "SPESA"
        elif "entrate" in metric_key or "ricavi" in metric_key:
            side = "RICAVO"
        elif "attivi" in metric_key or "patrimoniali" in metric_key:
            statement = "BIL"
            side = "ATTIVO"
        elif "passivi" in metric_key or "terzi" in metric_key or "proprio" in metric_key or "299" in metric_key:
            statement = "BIL"
            side = "PASSIVO"
        return statement, side

    def extract_riassunto_generale_multicolumn(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
        doc_type: str = "CONSUNTIVO",
    ) -> list[LedgerRowItem]:
        """
        Estrae tutte le colonne comparative del Riassunto Generale (Consuntivo T, Preventivo T, Consuntivo T-1)
        come LedgerRowItem pronti per core.ledger_value.
        """
        items: list[LedgerRowItem] = []
        seen_keys: set[tuple[str, str]] = set()

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            lines = self._group_words_into_lines(page.extract_words())

            for line in lines:
                line_text = " ".join(x["text"] for x in line)
                for row_key, row_re in self.layout.rg_config.rows_re.items():
                    if not row_re.search(line_text):
                        continue
                    statement, side = self._infer_riassunto_statement_side(row_key)
                    for col in self.layout.rg_config.columns:
                        if (row_key, col.id) in seen_keys:
                            continue
                        col_words = [
                            x for x in line if col.min_x <= x["x0"] and x["x1"] <= col.max_x
                        ]
                        if not col_words:
                            continue
                        raw_str = " ".join(x["text"] for x in col_words)
                        try:
                            val = parse_chf(raw_str)
                        except ValueError:
                            continue
                        if val is None:
                            continue
                        col_role, val_kind = self._resolve_col_semantics(col.name, doc_type)
                        bbox = (
                            min(x["x0"] for x in col_words),
                            min(x["top"] for x in col_words),
                            max(x["x1"] for x in col_words),
                            max(x["bottom"] for x in col_words),
                        )
                        items.append(
                            LedgerRowItem(
                                statement=statement,
                                view_kind="RIASSUNTO",
                                function_code=None,
                                account_code=row_key,
                                label_raw=row_key,
                                column_role=col_role,
                                value_kind=val_kind,
                                side=side,
                                amount_chf=val,
                                amount_raw=raw_str,
                                page=page_num,
                                bbox=bbox,
                            )
                        )
                        seen_keys.add((row_key, col.id))
                    break

        return items

    def extract_ricapitolazione_natura(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
        doc_type: str = "CONSUNTIVO",
    ) -> list[LedgerRowItem]:
        """
        Estrae la Ricapitolazione per genere di conto / Natura (Art. 22 lett. c RGFCC).
        Estrae conti a 2 cifre (30..49) e 4 cifre (3010..4999) con relative colonne comparative.
        """
        cfg = self.layout.natura_config
        if cfg is None:
            return []

        items: list[LedgerRowItem] = []
        seen: set[tuple[str, str, str]] = set()
        first_col_min_x = min(c.min_x for c in cfg.columns)

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            lines = self._group_words_into_lines(page.extract_words())

            for line in lines:
                code_words = [
                    w for w in line if cfg.code_min_x <= w["x0"] <= cfg.code_max_x
                ]
                if not code_words:
                    continue

                account_code: str | None = None
                for cw in code_words:
                    token = cw["text"].strip().rstrip(".")
                    if any(pat.match(token) for pat in cfg.code_patterns_re.values()):
                        account_code = token
                        break
                if not account_code:
                    continue

                prefix = account_code[0]
                if prefix == "3":
                    statement: Literal["CE", "CI", "BIL"] = "CE"
                    side: Literal["SPESA", "RICAVO", "SALDO"] = "SPESA"
                elif prefix == "4":
                    statement = "CE"
                    side = "RICAVO"
                elif prefix == "5":
                    statement = "CI"
                    side = "SPESA"
                elif prefix == "6":
                    statement = "CI"
                    side = "RICAVO"
                else:
                    continue

                label_words = [
                    w for w in line if cfg.code_max_x < w["x0"] < first_col_min_x
                ]
                label_raw = " ".join(w["text"] for w in label_words).strip() or account_code

                for col in cfg.columns:
                    col_words = [
                        x for x in line if col.min_x <= x["x0"] and x["x1"] <= col.max_x
                    ]
                    if not col_words:
                        continue
                    raw_str = " ".join(x["text"] for x in col_words)
                    try:
                        val = parse_chf(raw_str)
                    except ValueError:
                        continue
                    if val is None:
                        continue

                    col_role, val_kind = self._resolve_col_semantics(col.column_role, doc_type)
                    dedup_key = (account_code, col_role, side)
                    if dedup_key in seen:
                        continue
                    seen.add(dedup_key)

                    bbox = (
                        min(x["x0"] for x in col_words),
                        min(x["top"] for x in col_words),
                        max(x["x1"] for x in col_words),
                        max(x["bottom"] for x in col_words),
                    )
                    items.append(
                        LedgerRowItem(
                            statement=statement,
                            view_kind="NATURA",
                            function_code=None,
                            account_code=account_code,
                            label_raw=label_raw,
                            column_role=col_role,
                            value_kind=val_kind,
                            side=side,
                            amount_chf=val,
                            amount_raw=raw_str,
                            page=page_num,
                            bbox=bbox,
                        )
                    )

        return items

    def extract_ricapitolazione_dicasteri(
        self,
        pdf: pdfplumber.PDF,
        page_numbers: list[int],
        doc_type: str = "CONSUNTIVO",
    ) -> list[LedgerRowItem]:
        """
        Estrae la Ricapitolazione per dicastero / classificazione funzionale (Art. 22 lett. d RGFCC).
        Estrae dicasteri a 1 cifra (0..9) e funzioni a 2-3 cifre (011..999) con Spese e Ricavi.
        """
        cfg = self.layout.dicasteri_config
        if cfg is None:
            return []

        items: list[LedgerRowItem] = []
        seen: set[tuple[str, str, str, str]] = set()
        first_col_min_x = min(c.min_x for c in cfg.columns)

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            words = page.extract_words()
            top_header = " ".join(w["text"].lower() for w in words if w["top"] < 120)
            statement: Literal["CE", "CI", "BIL"] = (
                "CI"
                if ("investimenti" in top_header and "economico" not in top_header)
                else "CE"
            )
            lines = self._group_words_into_lines(words)

            for line in lines:
                code_words = [
                    w for w in line if cfg.code_min_x <= w["x0"] <= cfg.code_max_x
                ]
                if not code_words:
                    continue

                function_code: str | None = None
                for cw in code_words:
                    token = cw["text"].strip().rstrip(".")
                    if any(pat.match(token) for pat in cfg.code_patterns_re.values()):
                        function_code = token
                        break
                if not function_code:
                    continue

                label_words = [
                    w for w in line if cfg.code_max_x < w["x0"] < first_col_min_x
                ]
                label_raw = " ".join(w["text"] for w in label_words).strip() or function_code

                for col in cfg.columns:
                    col_words = [
                        x for x in line if col.min_x <= x["x0"] and x["x1"] <= col.max_x
                    ]
                    if not col_words:
                        continue
                    raw_str = " ".join(x["text"] for x in col_words)
                    try:
                        val = parse_chf(raw_str)
                    except ValueError:
                        continue
                    if val is None:
                        continue

                    col_role, val_kind = self._resolve_col_semantics(col.column_role, doc_type)
                    side: Literal["SPESA", "RICAVO", "SALDO"] = (
                        col.side if col.side in ("SPESA", "RICAVO", "SALDO") else "SALDO"  # type: ignore[assignment]
                    )
                    dedup_key = (statement, function_code, col_role, side)
                    if dedup_key in seen:
                        continue
                    seen.add(dedup_key)

                    bbox = (
                        min(x["x0"] for x in col_words),
                        min(x["top"] for x in col_words),
                        max(x["x1"] for x in col_words),
                        max(x["bottom"] for x in col_words),
                    )
                    items.append(
                        LedgerRowItem(
                            statement=statement,
                            view_kind="FUNZIONE",
                            function_code=function_code,
                            account_code=None,
                            label_raw=label_raw,
                            column_role=col_role,
                            value_kind=val_kind,
                            side=side,
                            amount_chf=val,
                            amount_raw=raw_str,
                            page=page_num,
                            bbox=bbox,
                        )
                    )

        return items
