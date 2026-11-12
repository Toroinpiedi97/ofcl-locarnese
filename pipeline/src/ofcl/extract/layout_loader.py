"""
Caricatore e validatore formale dei template di layout MCA2 (Fase 2).
Conformità: docs/spec/07-pipeline-estrazione-ocr.md e skills/pdf-layout-extractor.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)


class LayoutConfigError(Exception):
    """Sollevata quando un template YAML di layout è mancante, malformato o viola gli invarianti."""


@dataclass(frozen=True)
class ColumnDef:
    """Definizione geometrica di una colonna contabile."""

    id: str
    name: str
    min_x: float
    max_x: float


@dataclass(frozen=True)
class RiassuntoGeneraleConfig:
    """Configurazione validata del Riassunto Generale (Art. 22 lett. a RGFCC)."""

    layout_family: str
    section: str
    title_pattern: str
    title_re: re.Pattern[str]
    columns: list[ColumnDef]
    rows: dict[str, str]
    rows_re: dict[str, re.Pattern[str]]

    def get_column(self, col_id_or_name: str) -> ColumnDef:
        for c in self.columns:
            if c.id == col_id_or_name or c.name == col_id_or_name:
                return c
        raise LayoutConfigError(
            f"Colonna '{col_id_or_name}' non trovata nella configurazione Riassunto Generale"
        )


@dataclass(frozen=True)
class IndicatorDef:
    """Definizione di un indicatore finanziario SEL."""

    key: str
    label: str
    pattern: str
    pattern_re: re.Pattern[str]
    unit: str


@dataclass(frozen=True)
class IndicatoriSelConfig:
    """Configurazione validata degli indicatori finanziari SEL (Art. 22 lett. o RGFCC)."""

    layout_family: str
    section: str
    title_pattern: str
    title_re: re.Pattern[str]
    indicators: dict[str, IndicatorDef]
    indicator_order: list[str]
    min_x: float
    max_x: float


@dataclass(frozen=True)
class ControlloCreditiConfig:
    """Configurazione validata della tabella Controllo Crediti (Allegato f - Art. 22 lett. f RGFCC)."""

    layout_family: str
    section: str
    title_pattern: str
    title_re: re.Pattern[str]
    columns: list[dict[str, str]]
    summary_rows: dict[str, str]
    summary_rows_re: dict[str, re.Pattern[str]]


@dataclass(frozen=True)
class LayoutConfig:
    """Configurazione completa e convalidata per una famiglia di layout."""

    layout_family: str
    layout_dir: Path
    rg_config: RiassuntoGeneraleConfig
    sel_config: IndicatoriSelConfig
    cc_config: ControlloCreditiConfig


def _compile_re(pattern: str, desc: str) -> re.Pattern[str]:
    try:
        return re.compile(pattern, re.IGNORECASE)
    except re.error as exc:
        raise LayoutConfigError(f"Regex invalida per {desc} ({pattern!r}): {exc}") from exc


def _load_yaml_file(file_path: Path) -> dict[str, Any]:
    if not file_path.exists():
        raise LayoutConfigError(f"File di layout non trovato: {file_path}")
    try:
        data = yaml.safe_load(file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise LayoutConfigError(f"Errore parsing YAML in {file_path}: {exc}") from exc
    if not isinstance(data, dict):
        raise LayoutConfigError(f"Struttura non valida in {file_path}: atteso mapping/dizionario")
    return data


def load_and_validate_layout(layout_dir: Path) -> LayoutConfig:
    """
    Carica e valida rigorosamente tutti e 3 i file di layout per la famiglia indicata:
    - riassunto_generale.yaml
    - indicatori_sel.yaml
    - controllo_crediti.yaml
    """
    if not layout_dir.exists() or not layout_dir.is_dir():
        raise LayoutConfigError(f"Directory layout non trovata o non valida: {layout_dir}")

    # 1. Carica e valida Riassunto Generale
    rg_raw = _load_yaml_file(layout_dir / "riassunto_generale.yaml")
    layout_family = str(rg_raw.get("layout_family", "")).strip()
    if not layout_family:
        raise LayoutConfigError(
            f"Campo 'layout_family' mancante in {layout_dir}/riassunto_generale.yaml"
        )

    rg_section = str(rg_raw.get("section", "lett_a")).strip()
    rg_title_pat = str(rg_raw.get("title_pattern", "")).strip()
    rg_title_re = _compile_re(rg_title_pat or "riassunto", f"{layout_family} RG title")

    raw_columns = rg_raw.get("columns")
    if not isinstance(raw_columns, list) or not raw_columns:
        raise LayoutConfigError(
            f"'columns' deve essere una lista non vuota in {layout_dir}/riassunto_generale.yaml"
        )

    col_defs: list[ColumnDef] = []
    seen_col_ids: set[str] = set()
    for col in raw_columns:
        if not isinstance(col, dict) or "id" not in col or "name" not in col:
            raise LayoutConfigError(
                f"Colonna malformata in {layout_dir}/riassunto_generale.yaml: {col}"
            )
        c_id = str(col["id"]).strip()
        if c_id in seen_col_ids:
            raise LayoutConfigError(
                f"ID colonna duplicato in {layout_dir}/riassunto_generale.yaml: {c_id}"
            )
        seen_col_ids.add(c_id)

        try:
            min_x = float(col["min_x"])
            max_x = float(col["max_x"])
        except (KeyError, ValueError, TypeError) as exc:
            raise LayoutConfigError(
                f"Coordinate min_x/max_x non valide per colonna {c_id}: {exc}"
            ) from exc

        if min_x >= max_x:
            raise LayoutConfigError(
                f"Invariante min_x < max_x violato per colonna {c_id} ({min_x} >= {max_x})"
            )
        col_defs.append(ColumnDef(id=c_id, name=str(col["name"]), min_x=min_x, max_x=max_x))

    raw_rows = rg_raw.get("rows")
    if not isinstance(raw_rows, dict) or not raw_rows:
        raise LayoutConfigError(
            f"'rows' deve essere un mapping non vuoto in {layout_dir}/riassunto_generale.yaml"
        )

    rows_re: dict[str, re.Pattern[str]] = {}
    rows_dict: dict[str, str] = {}
    for r_key, r_pat in raw_rows.items():
        pat_str = str(r_pat).strip()
        rows_dict[str(r_key)] = pat_str
        rows_re[str(r_key)] = _compile_re(pat_str, f"{layout_family} RG riga {r_key}")

    rg_config = RiassuntoGeneraleConfig(
        layout_family=layout_family,
        section=rg_section,
        title_pattern=rg_title_pat,
        title_re=rg_title_re,
        columns=col_defs,
        rows=rows_dict,
        rows_re=rows_re,
    )

    # 2. Carica e valida Indicatori SEL
    sel_raw = _load_yaml_file(layout_dir / "indicatori_sel.yaml")
    sel_section = str(sel_raw.get("section", "lett_o")).strip()
    sel_title_pat = str(sel_raw.get("title_pattern", "")).strip()
    sel_title_re = _compile_re(sel_title_pat or "indicatori", f"{layout_family} SEL title")

    raw_indicators = sel_raw.get("indicators")
    if not isinstance(raw_indicators, dict) or not raw_indicators:
        raise LayoutConfigError(
            f"'indicators' deve essere un mapping non vuoto in {layout_dir}/indicatori_sel.yaml"
        )

    col_x = sel_raw.get("column_x_range", {})
    min_x_sel = float(col_x.get("min_x", 430.0))
    max_x_sel = float(col_x.get("max_x", 490.0))
    if min_x_sel >= max_x_sel:
        raise LayoutConfigError(
            f"Invariante min_x < max_x violato in {layout_dir}/indicatori_sel.yaml ({min_x_sel} >= {max_x_sel})"
        )

    indicator_defs: dict[str, IndicatorDef] = {}
    indicator_order: list[str] = []
    for ind_key, ind_data in raw_indicators.items():
        if not isinstance(ind_data, dict):
            raise LayoutConfigError(f"Dati non validi per indicatore {ind_key}")
        k = str(ind_key).strip()
        indicator_order.append(k)
        pat = str(ind_data.get("pattern", "")).strip()
        indicator_defs[k] = IndicatorDef(
            key=k,
            label=str(ind_data.get("label", k)),
            pattern=pat,
            pattern_re=_compile_re(pat, f"{layout_family} SEL {k}"),
            unit=str(ind_data.get("unit", "")),
        )

    sel_config = IndicatoriSelConfig(
        layout_family=layout_family,
        section=sel_section,
        title_pattern=sel_title_pat,
        title_re=sel_title_re,
        indicators=indicator_defs,
        indicator_order=indicator_order,
        min_x=min_x_sel,
        max_x=max_x_sel,
    )

    # 3. Carica e valida Controllo Crediti
    cc_raw = _load_yaml_file(layout_dir / "controllo_crediti.yaml")
    cc_section = str(cc_raw.get("section", "lett_f")).strip()
    cc_title_pat = str(cc_raw.get("title_pattern", "")).strip()
    cc_title_re = _compile_re(cc_title_pat or "controllo.*crediti", f"{layout_family} CC title")

    raw_cc_cols = cc_raw.get("columns", [])
    if not isinstance(raw_cc_cols, list):
        raise LayoutConfigError(
            f"'columns' deve essere una lista in {layout_dir}/controllo_crediti.yaml"
        )

    raw_summary = cc_raw.get("summary_rows")
    if not isinstance(raw_summary, dict) or not raw_summary:
        raise LayoutConfigError(
            f"'summary_rows' deve essere un mapping non vuoto in {layout_dir}/controllo_crediti.yaml"
        )

    summary_rows_re: dict[str, re.Pattern[str]] = {}
    summary_dict: dict[str, str] = {}
    for s_key, s_pat in raw_summary.items():
        pat_str = str(s_pat).strip()
        summary_dict[str(s_key)] = pat_str
        summary_rows_re[str(s_key)] = _compile_re(pat_str, f"{layout_family} CC summary {s_key}")

    cc_config = ControlloCreditiConfig(
        layout_family=layout_family,
        section=cc_section,
        title_pattern=cc_title_pat,
        title_re=cc_title_re,
        columns=raw_cc_cols,
        summary_rows=summary_dict,
        summary_rows_re=summary_rows_re,
    )

    logger.info("Caricato e validato layout %s da %s", layout_family, layout_dir)
    return LayoutConfig(
        layout_family=layout_family,
        layout_dir=layout_dir,
        rg_config=rg_config,
        sel_config=sel_config,
        cc_config=cc_config,
    )
