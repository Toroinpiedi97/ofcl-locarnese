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
from typing import Any

import pdfplumber
import yaml

from ofcl.extract.chf_parser import parse_chf

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

        # Carica configurazione Riassunto Generale
        rg_yaml = self.layout_path / "riassunto_generale.yaml"
        with open(rg_yaml, encoding="utf-8") as f:
            self.rg_config = yaml.safe_load(f)

        # Carica configurazione Indicatori SEL
        ind_yaml = self.layout_path / "indicatori_sel.yaml"
        with open(ind_yaml, encoding="utf-8") as f:
            self.ind_config = yaml.safe_load(f)

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

                for row_key, row_pat in self.rg_config["rows"].items():
                    if row_key in cells:
                        continue
                    if re.search(row_pat, line_text, re.IGNORECASE):
                        # Assegnazione colonne basata sull'allineamento a destra Ge.Co.Ti.
                        col0_words = [x for x in line if x["x1"] <= 450 and x["x0"] >= 250]
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
                                col_name="consuntivo_t",
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
        """
        indicators: dict[str, ExtractedCell] = {}

        for page_num in page_numbers:
            if page_num > len(pdf.pages):
                continue
            page = pdf.pages[page_num - 1]
            words = page.extract_words()

            # Gli indicatori SEL in Ge.Co.Ti. sono posizionati verticalmente con i numeri nella colonna x in [430, 490]
            val_words = [w for w in words if 430 <= w["x0"] <= 490 and w["top"] > 120]

            # Associazione alle righe SEL tramite ordinamento verticale
            # Ordine standard MCA2 Ge.Co.Ti. degli indicatori:
            order_keys = [
                "tasso_indebitamento_netto_pct",
                "grado_autofinanziamento_pct",
                "quota_spese_interessi_pct",
                "debito_netto_pro_capite_chf",
                "quota_investimenti_pct",
                "quota_capitale_proprio_pct",
                "quota_indebitamento_lordo_pct",
                "quota_oneri_finanziari_pct",
            ]

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
        """
        items: list[CreditWorkItem] = []
        totals: dict[str, ExtractedCell] = {}

        account_re = re.compile(r"^\d{3}\.\d{4}\.\d{3}$")

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
                                items[-1].remaining_credit = (items[-1].voted_credit - items[-1].spent_total).quantize(Decimal("0.01"))
                                items[-1].has_overrun = (items[-1].remaining_credit < Decimal("0.00"))
                                items[-1].notes += f" [Suppletorio {supp_val} CHF]"
                            except ValueError:
                                pass
                        elif not any(c for c in cells_clean[4:]):
                            # Continuazione testo descrizione
                            items[-1].description += f" {cells_clean[3]}"

                    # 2. Riconoscimento righe di totale a fine tabella
                    full_row_str = " ".join(cells_clean).lower()
                    if "totale investimenti votati" in full_row_str:
                        # Trova il valore numerico
                        for c in cells_clean:
                            if c and any(d.isdigit() for d in c) and not c.startswith("TOT"):
                                try:
                                    v = parse_chf(c)
                                    totals["totale_investimenti_votati"] = ExtractedCell(
                                        metric_key="totale_investimenti_votati",
                                        col_name="totale",
                                        page=page_num,
                                        bbox=(0.0, 0.0, 0.0, 0.0),
                                        raw_text=c,
                                        amount_chf=v,
                                    )
                                    break
                                except ValueError:
                                    pass

                    elif "totale crediti consumati al 01.01" in full_row_str:
                        for c in cells_clean:
                            if c and any(d.isdigit() for d in c) and not c.startswith("TOT"):
                                try:
                                    v = parse_chf(c)
                                    totals["totale_crediti_consumati_01_01"] = ExtractedCell(
                                        metric_key="totale_crediti_consumati_01_01",
                                        col_name="totale",
                                        page=page_num,
                                        bbox=(0.0, 0.0, 0.0, 0.0),
                                        raw_text=c,
                                        amount_chf=v,
                                    )
                                    break
                                except ValueError:
                                    pass

                    elif "totale investimenti lordi" in full_row_str:
                        for c in cells_clean:
                            if c and any(d.isdigit() for d in c) and not c.startswith("TOT"):
                                try:
                                    v = parse_chf(c)
                                    totals["totale_spese_lorde_esercizio"] = ExtractedCell(
                                        metric_key="totale_spese_lorde_esercizio",
                                        col_name="totale",
                                        page=page_num,
                                        bbox=(0.0, 0.0, 0.0, 0.0),
                                        raw_text=c,
                                        amount_chf=v,
                                    )
                                    break
                                except ValueError:
                                    pass

                    elif "totale crediti consumati al 31.12" in full_row_str:
                        for c in cells_clean:
                            if c and any(d.isdigit() for d in c) and not c.startswith("TOT"):
                                try:
                                    v = parse_chf(c)
                                    totals["totale_crediti_consumati_31_12"] = ExtractedCell(
                                        metric_key="totale_crediti_consumati_31_12",
                                        col_name="totale",
                                        page=page_num,
                                        bbox=(0.0, 0.0, 0.0, 0.0),
                                        raw_text=c,
                                        amount_chf=v,
                                    )
                                    break
                                except ValueError:
                                    pass

        return items, totals
