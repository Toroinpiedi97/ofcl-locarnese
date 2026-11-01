"""Unit test per il builder pacchetti Open Data (Frictionless).

Verifica la generazione di:
1. datapackage.json standard Frictionless
2. CSV standard UTF-8 (separatore ',')
3. CSV Excel-CH con BOM UTF-8 (\ufeff) e separatore ';'
4. Parquet compresso per analisi dati
5. Presenza di tutti i 19 Comuni del Distretto
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pyarrow.parquet as pq

from ofcl.export.datapackage_builder import DISTRICT_MUNICIPALITIES, build_opendata_package


def test_district_municipalities_count():
    assert len(DISTRICT_MUNICIPALITIES) == 19
    codes = {m["ust_code"] for m in DISTRICT_MUNICIPALITIES}
    assert 5091 in codes  # Ascona
    assert 5113 in codes  # Locarno
    assert 5115 in codes  # Losone
    assert 5131 in codes  # Tenero-Contra
    assert 5138 in codes  # Cugnasco-Gerra
    assert 5396 in codes  # Terre di Pedemonte
    assert 5399 in codes  # Verzasca


def test_build_opendata_package(tmp_path: Path):
    out_dir = tmp_path / "export"
    result_path = build_opendata_package(out_dir)

    assert result_path == out_dir
    dp_file = out_dir / "datapackage.json"
    assert dp_file.exists()

    with open(dp_file, "r", encoding="utf-8") as f:
        dp = json.load(f)

    assert dp["name"] == "ofcl-locarnese-finanze"
    assert len(dp["resources"]) == 3
    resource_names = [r["name"] for r in dp["resources"]]
    assert "bilanci_mca2" in resource_names
    assert "indicatori_sel" in resource_names
    assert "tariffe_sussidi_comunali" in resource_names

    # Check bilanci_mca2 CSV standard
    csv_file = out_dir / "bilanci_mca2.csv"
    assert csv_file.exists()
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter=",")
        header = next(reader)
        assert "ust_code" in header
        rows = list(reader)
        assert len(rows) == 19

    # Check bilanci_mca2 CSV Excel-CH (BOM + semicolon)
    excel_file = out_dir / "bilanci_mca2_excel_ch.csv"
    assert excel_file.exists()
    content_bytes = excel_file.read_bytes()
    assert content_bytes.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM
    with open(excel_file, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)
        assert "ust_code" in header
        rows = list(reader)
        assert len(rows) == 19

    # Check Parquet
    parquet_file = out_dir / "bilanci_mca2.parquet"
    assert parquet_file.exists()
    table = pq.read_table(parquet_file)
    assert table.num_rows == 19

    # Check data dictionary
    dict_file = out_dir / "dizionario_campi_mca2.json"
    assert dict_file.exists()
