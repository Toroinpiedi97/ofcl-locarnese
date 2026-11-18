"""
Classificazione e validazione batch dei PDF scaricati dal crawler settimanale.

Arricchisce il report del crawler con:
- Metadati PDF (`pages`, `has_text_layer`, `layout_family`)
- Classificazione (`doc_type`, `fiscal_year`, `mm_number`, `method`, `confidence`)
- Estrazione deterministica MCA2 (Riassunto, Natura, Dicasteri, Crediti All. f)
  e validazione V01-V14 sui PDF finanziari con text layer e layout noto.
"""

from __future__ import annotations

import logging
import re
from decimal import Decimal
from pathlib import Path
from typing import Any

from ofcl.extract.pdf_inspector import inspect_pdf
from ofcl.extract.table_extractor import ExtractedCell, TableExtractor
from ofcl.validate.mca2_engine import CreditRowInput, ValidationContext, validate_mca2_document

logger = logging.getLogger(__name__)

_MM_RE = re.compile(r"\bMM\s*(?:n\.?|nr\.?|num\.?)?\s*(\d+(?:/\d{2,4})?)", re.IGNORECASE)
_STATEMENT_YEAR_RE = re.compile(
    r"(?:consuntiv\w*|preventiv\w*|piano\s+finanziario)[^0-9]{0,16}\b(20[12][0-9])\b",
    re.IGNORECASE,
)
_YEAR_RE = re.compile(r"\b(20[12][0-9])\b")

VALID_DOC_TYPES = {
    "PREVENTIVO",
    "CONSUNTIVO",
    "PIANO_FINANZIARIO",
    "CREDITO_INVESTIMENTO",
    "RAPPORTO_COMMISSIONE",
    "ALTRO",
}


def classify_document_metadata(
    *,
    title: str | None,
    url: str,
    crawler_kind: str | None,
    crawler_year: int | None,
    mm_number: str | None,
    sections: dict[str, list[int]],
    layout_family: str | None,
    cover_snippet: str = "",
) -> dict[str, Any]:
    """Classificazione deterministica multi-segnale per documenti comunali ticinesi."""
    haystack = " ".join(
        p for p in [title or "", url, cover_snippet] if p
    ).lower()

    doc_type = (
        crawler_kind if crawler_kind in VALID_DOC_TYPES else "ALTRO"
    )
    confidence = 0.65
    method = "RULES"

    if "consuntiv" in haystack:
        doc_type = "CONSUNTIVO"
        confidence = 0.95
    elif "preventiv" in haystack:
        doc_type = "PREVENTIVO"
        confidence = 0.95
    elif "piano finanziario" in haystack or "piano-finanziario" in haystack:
        doc_type = "PIANO_FINANZIARIO"
        confidence = 0.90
    elif "rapporto" in haystack and "commission" in haystack:
        doc_type = "RAPPORTO_COMMISSIONE"
        confidence = 0.85
    elif "credito" in haystack or "richiesta di credito" in haystack:
        doc_type = "CREDITO_INVESTIMENTO"
        confidence = 0.85

    # Conferma strutturale dalle sezioni MCA2 RGFCC art. 22
    if sections.get("lett_a") or sections.get("lett_o") or sections.get("lett_f"):
        method = "CONTENT"
        confidence = max(confidence, 0.96)
        if doc_type == "ALTRO":
            doc_type = "CONSUNTIVO" if sections.get("lett_o") else "PREVENTIVO"

    resolved_year = crawler_year
    if resolved_year is None:
        raw_text = f"{title or ''} {url} {cover_snippet}"
        m_stmt_year = _STATEMENT_YEAR_RE.search(raw_text)
        if m_stmt_year:
            resolved_year = int(m_stmt_year.group(1))
        else:
            cleaned_no_mm = _MM_RE.sub(" ", raw_text)
            m_year = _YEAR_RE.search(cleaned_no_mm) or _YEAR_RE.search(raw_text)
            if m_year:
                resolved_year = int(m_year.group(1))

    resolved_mm = mm_number
    if not resolved_mm:
        m_mm = _MM_RE.search(f"{title or ''} {cover_snippet}")
        if m_mm:
            resolved_mm = f"MM {m_mm.group(1)}"

    return {
        "doc_type": doc_type,
        "fiscal_year": resolved_year,
        "mm_number": resolved_mm,
        "layout_family": layout_family,
        "method": method,
        "confidence": round(confidence, 3),
    }


def _extract_financial_bundle(
    pdf_path: Path,
    *,
    doc_type: str,
    fiscal_year: int,
    layout_family: str,
    sections: dict[str, list[int]],
) -> dict[str, Any]:
    """Esegue estrazione tabulati MCA2 e validazione V01-V14 per un singolo PDF."""
    import pdfplumber

    extractor = TableExtractor(layout_family)
    value_kind_default = "BUDGET" if doc_type == "PREVENTIVO" else "ACTUAL"

    with pdfplumber.open(pdf_path) as pdf:
        rg_pages = sections.get("lett_a", [])
        rg_cells = extractor.extract_riassunto_generale(pdf, rg_pages) if rg_pages else {}
        rg_items = (
            extractor.extract_riassunto_generale_multicolumn(pdf, rg_pages)
            if rg_pages
            else []
        )

        c_pages = sections.get("lett_c", [])
        natura_items = extractor.extract_ricapitolazione_natura(pdf, c_pages) if c_pages else []

        d_pages = sections.get("lett_d", [])
        dicasteri_items = (
            extractor.extract_ricapitolazione_dicasteri(pdf, d_pages)
            if d_pages
            else []
        )

        ind_pages = sections.get("lett_o", [])
        ind_cells = extractor.extract_indicatori_sel(pdf, ind_pages) if ind_pages else {}

        f_pages = sections.get("lett_f", [])
        cred_items, cred_totals = (
            extractor.extract_controllo_crediti(pdf, f_pages) if f_pages else ([], {})
        )

    all_items = rg_items + natura_items + dicasteri_items
    ledger_rows: list[dict[str, Any]] = []

    if all_items:
        for it in all_items:
            ref_year = fiscal_year - 1 if it.column_role == "PRIOR_ACTUAL" else fiscal_year
            ledger_rows.append(
                {
                    "statement": it.statement,
                    "view_kind": it.view_kind,
                    "function_code": it.function_code,
                    "account_code": it.account_code,
                    "detail_code": None,
                    "label_raw": it.label_raw,
                    "column_role": it.column_role,
                    "ref_year": ref_year,
                    "value_kind": it.value_kind,
                    "side": it.side,
                    "amount_chf": float(it.amount_chf),
                    "amount_raw": it.amount_raw,
                    "page": it.page,
                    "bbox": [round(float(c), 2) for c in it.bbox],
                    "method": "DETERMINISTIC",
                    "parser_version": "gecoti_v3",
                }
            )
    elif rg_cells:
        for metric_key, cell in rg_cells.items():
            statement = "CI" if "investimenti" in metric_key else "CE"
            side = "SALDO"
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
            ledger_rows.append(
                {
                    "statement": statement,
                    "view_kind": "RIASSUNTO",
                    "function_code": None,
                    "account_code": metric_key,
                    "detail_code": None,
                    "label_raw": cell.raw_text or metric_key,
                    "column_role": "CURRENT",
                    "ref_year": fiscal_year,
                    "value_kind": value_kind_default,
                    "side": side,
                    "amount_chf": float(cell.amount_chf) if cell.amount_chf is not None else None,
                    "amount_raw": cell.raw_text or metric_key,
                    "page": max(1, cell.page),
                    "bbox": [round(float(c), 2) for c in cell.bbox] if cell.bbox else None,
                    "method": "DETERMINISTIC",
                    "parser_version": "gecoti_v3",
                }
            )

    # Validation V01-V14
    validation_results: list[dict[str, Any]] = []
    blocking_failed = 0
    if rg_cells or cred_items or natura_items or dicasteri_items:
        zero = Decimal("0.00")
        empty_cell = ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        credit_rows = [
            CreditRowInput(
                account_code=it.account_code,
                description=it.description,
                voted_credit=it.voted_credit,
                spent_prev=it.spent_prev,
                spent_year=it.spent_year,
                spent_total_declared=it.spent_total,
                remaining_declared=it.remaining_credit,
            )
            for it in cred_items
        ]
        natura_spese_2digit = {
            it.account_code: it.amount_chf
            for it in natura_items
            if it.column_role == "CURRENT"
            and it.statement == "CE"
            and it.side == "SPESA"
            and it.account_code
            and len(it.account_code) == 2
        }
        natura_ricavi_2digit = {
            it.account_code: it.amount_chf
            for it in natura_items
            if it.column_role == "CURRENT"
            and it.statement == "CE"
            and it.side == "RICAVO"
            and it.account_code
            and len(it.account_code) == 2
        }
        dicasteri_1digit_spese = {
            it.function_code: it.amount_chf
            for it in dicasteri_items
            if it.column_role == "CURRENT"
            and it.statement == "CE"
            and it.side == "SPESA"
            and it.function_code
            and len(it.function_code) == 1
        }
        dicasteri_1digit_ricavi = {
            it.function_code: it.amount_chf
            for it in dicasteri_items
            if it.column_role == "CURRENT"
            and it.statement == "CE"
            and it.side == "RICAVO"
            and it.function_code
            and len(it.function_code) == 1
        }

        ctx = ValidationContext(
            spese_operative=rg_cells.get("spese_operative", empty_cell).amount_chf or zero,
            ricavi_operativi=rg_cells.get("ricavi_operativi", empty_cell).amount_chf or zero,
            risultato_operativo_dichiarato=rg_cells.get("risultato_operativo", empty_cell).amount_chf
            or zero,
            spese_finanziarie_34=rg_cells.get("spese_finanziarie", empty_cell).amount_chf or zero,
            ricavi_finanziari_44=rg_cells.get("ricavi_finanziari", empty_cell).amount_chf or zero,
            risultato_finanziario_dichiarato=rg_cells.get(
                "risultato_finanziario", empty_cell
            ).amount_chf
            or zero,
            risultato_ordinario_dichiarato=rg_cells.get("risultato_ordinario", empty_cell).amount_chf
            or zero,
            risultato_totale_esercizio_dichiarato=rg_cells.get(
                "risultato_totale_esercizio", empty_cell
            ).amount_chf
            or zero,
            uscite_investimenti_ba_5=rg_cells.get("uscite_investimenti", empty_cell).amount_chf
            or zero,
            entrate_investimenti_ba_6=rg_cells.get("entrate_investimenti", empty_cell).amount_chf
            or zero,
            onere_netto_investimenti_dichiarato=rg_cells.get(
                "onere_netto_investimenti", empty_cell
            ).amount_chf
            or zero,
            autofinanziamento_dichiarato=rg_cells.get("autofinanziamento", empty_cell).amount_chf
            or zero,
            risultato_finanziamento_dichiarato=rg_cells.get("risultato_globale", empty_cell).amount_chf
            or zero,
            totale_attivi=rg_cells.get("totale_attivi", empty_cell).amount_chf or zero,
            totale_passivi=rg_cells.get("totale_passivi", empty_cell).amount_chf or zero,
            credit_rows=credit_rows,
            totale_spese_lorde_crediti=cred_totals.get(
                "totale_spese_lorde_esercizio", empty_cell
            ).amount_chf
            or zero,
            reported_indicators={
                k: v.amount_chf for k, v in ind_cells.items() if v.amount_chf is not None
            },
            natura_spese_2digit=natura_spese_2digit,
            natura_ricavi_2digit=natura_ricavi_2digit,
            dicasteri_1digit_spese=dicasteri_1digit_spese,
            dicasteri_1digit_ricavi=dicasteri_1digit_ricavi,
        )
        checks, _ = validate_mca2_document(ctx)
        for c in checks:
            if not c.passed and c.severity == "BLOCKING":
                blocking_failed += 1
            validation_results.append(
                {
                    "rule_code": c.rule_code,
                    "severity": c.severity,
                    "passed": c.passed,
                    "expected": float(c.expected),
                    "actual": float(c.actual),
                    "delta": float(c.delta),
                    "message": c.message,
                }
            )

    credit_serialized = [
        {
            "account_code": it.account_code or f"cred-{idx}",
            "mm_no": it.mm_no or None,
            "description": it.description or "Credito d'opera",
            "fiscal_year": fiscal_year,
            "voted_credit": float(it.voted_credit),
            "spent_prev": float(it.spent_prev),
            "spent_year": float(it.spent_year),
            "spent_total": float(it.spent_total),
            "remaining_credit": float(it.remaining_credit),
            "page": max(1, it.page),
        }
        for idx, it in enumerate(cred_items)
    ]

    if ledger_rows:
        target_status = "NEEDS_REVIEW" if blocking_failed > 0 else "VALIDATED"
    else:
        target_status = "CLASSIFIED"

    return {
        "extracted_status": target_status,
        "ledger_rows": ledger_rows,
        "validation_results": validation_results,
        "credit_items": credit_serialized,
    }


def enrich_crawl_report_with_extractions(
    report: dict[str, Any],
    raw_pdf_dir: Path,
    *,
    extract_tables: bool = True,
) -> dict[str, int]:
    """
    Ispeziona e classifica tutti i PDF scaricati presenti su disco e, per i
    CONSUNTIVO/PREVENTIVO compatibili, estrae tabulati MCA2 e quadrature V01-V14.
    """
    stats = {
        "inspected": 0,
        "classified": 0,
        "extracted": 0,
        "validated": 0,
        "needs_review": 0,
    }

    for item in report.get("results", []):
        status = item.get("status")
        sha256 = item.get("sha256")
        ust_code = item.get("ust_code")
        if status not in ("DOWNLOADED", "CACHED") or not sha256 or not ust_code:
            continue

        pdf_path = raw_pdf_dir / str(ust_code) / f"{sha256}.pdf"
        if not pdf_path.exists():
            continue

        try:
            inspection = inspect_pdf(pdf_path)
            stats["inspected"] += 1
            item["pages"] = inspection.page_count
            item["has_text_layer"] = inspection.has_text_layer
            item["layout_family"] = inspection.layout_family

            cls = classify_document_metadata(
                title=item.get("title"),
                url=str(item.get("url") or ""),
                crawler_kind=item.get("kind"),
                crawler_year=item.get("fiscal_year"),
                mm_number=item.get("mm_number"),
                sections=inspection.sections,
                layout_family=inspection.layout_family,
                cover_snippet=str(inspection.metadata.get("title_hint") or ""),
            )
            item["classification"] = cls
            item["extracted_status"] = "CLASSIFIED"
            stats["classified"] += 1

            is_statement = cls["doc_type"] in ("CONSUNTIVO", "PREVENTIVO")
            can_extract = (
                extract_tables
                and is_statement
                and inspection.has_text_layer
                and inspection.layout_family != "SCAN_IMAGE"
                and (
                    inspection.sections.get("lett_a")
                    or inspection.sections.get("lett_c")
                    or inspection.sections.get("lett_d")
                    or inspection.sections.get("lett_f")
                )
            )

            if can_extract:
                fiscal_year = int(cls["fiscal_year"] or 2025)
                bundle = _extract_financial_bundle(
                    pdf_path,
                    doc_type=cls["doc_type"],
                    fiscal_year=fiscal_year,
                    layout_family=inspection.layout_family,
                    sections=inspection.sections,
                )
                item["extracted_status"] = bundle["extracted_status"]
                if bundle["ledger_rows"]:
                    item["ledger_rows"] = bundle["ledger_rows"]
                    stats["extracted"] += 1
                if bundle["validation_results"]:
                    item["validation_results"] = bundle["validation_results"]
                if bundle["credit_items"]:
                    item["credit_items"] = bundle["credit_items"]
                if bundle["extracted_status"] == "VALIDATED":
                    stats["validated"] += 1
                elif bundle["extracted_status"] == "NEEDS_REVIEW":
                    stats["needs_review"] += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Errore ispezione/estrazione PDF %s (UST %s): %s",
                pdf_path.name,
                ust_code,
                exc,
            )
            item.setdefault("extracted_status", "NEEDS_REVIEW")
            stats["needs_review"] += 1

    return stats
