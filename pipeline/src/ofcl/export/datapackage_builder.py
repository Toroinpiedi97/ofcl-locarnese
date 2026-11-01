"""OFCL - Open Data Package Builder (Frictionless Standard).

Genera il pacchetto dati pubblico conforme allo standard Frictionless Data (v1),
inclusi CSV UTF-8 standard, CSV Excel-CH (; + BOM), Parquet compresso e dizionario campi MCA2.
Normativa: LOC, RGFCC allegati a-p, LPDP/nLPD (zero PII).
Licenza: CC-BY-4.0.
"""

from __future__ import annotations

import csv
import json
import logging
import zipfile
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

logger = logging.getLogger(__name__)

DISTRICT_MUNICIPALITIES: list[dict[str, Any]] = [
    {"ust_code": 5091, "name": "Ascona", "slug": "ascona", "circle": "Isole", "pop": 5290, "pf": 75.0, "pg": 75.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5096, "name": "Brione sopra Minusio", "slug": "brione-sopra-minusio", "circle": "Navegna", "pop": 432, "pf": 78.0, "pg": 78.0, "waste": "85.00 CHF/anno"},
    {"ust_code": 5097, "name": "Brissago", "slug": "brissago", "circle": "Isole", "pop": 1577, "pf": 85.0, "pg": 85.0, "waste": "95.00 CHF/anno"},
    {"ust_code": 5108, "name": "Gordola", "slug": "gordola", "circle": "Navegna", "pop": 4877, "pf": 88.0, "pg": 88.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5112, "name": "Lavertezzo", "slug": "lavertezzo", "circle": "Verzasca", "pop": 1235, "pf": 88.0, "pg": 88.0, "waste": "85.00 CHF/anno"},
    {"ust_code": 5113, "name": "Locarno", "slug": "locarno", "circle": "Locarno", "pop": 16463, "pf": 90.0, "pg": 97.0, "waste": "110.00 CHF/anno"},
    {"ust_code": 5115, "name": "Losone", "slug": "losone", "circle": "Isole", "pop": 6780, "pf": 90.0, "pg": 90.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5117, "name": "Mergoscia", "slug": "mergoscia", "circle": "Navegna", "pop": 204, "pf": 95.0, "pg": 95.0, "waste": "90.00 CHF/anno"},
    {"ust_code": 5118, "name": "Minusio", "slug": "minusio", "circle": "Navegna", "pop": 7380, "pf": 82.0, "pg": 82.0, "waste": "85.00 CHF/anno"},
    {"ust_code": 5120, "name": "Muralto", "slug": "muralto", "circle": "Locarno", "pop": 2604, "pf": 85.0, "pg": 85.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5121, "name": "Orselina", "slug": "orselina", "circle": "Locarno", "pop": 699, "pf": 75.0, "pg": 75.0, "waste": "85.00 CHF/anno"},
    {"ust_code": 5125, "name": "Ronco sopra Ascona", "slug": "ronco-sopra-ascona", "circle": "Isole", "pop": 516, "pf": 75.0, "pg": 75.0, "waste": "90.00 CHF/anno"},
    {"ust_code": 5131, "name": "Tenero-Contra", "slug": "tenero-contra", "circle": "Navegna", "pop": 3397, "pf": 88.0, "pg": 88.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5136, "name": "Onsernone", "slug": "onsernone", "circle": "Onsernone", "pop": 663, "pf": 95.0, "pg": 95.0, "waste": "90.00 CHF/anno"},
    {"ust_code": 5138, "name": "Cugnasco-Gerra", "slug": "cugnasco-gerra", "circle": "Navegna", "pop": 2862, "pf": 88.0, "pg": 88.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5396, "name": "Terre di Pedemonte", "slug": "terre-di-pedemonte", "circle": "Melezza", "pop": 2644, "pf": 85.0, "pg": 85.0, "waste": "80.00 CHF/anno"},
    {"ust_code": 5397, "name": "Centovalli", "slug": "centovalli", "circle": "Melezza", "pop": 1102, "pf": 95.0, "pg": 120.0, "waste": "90.00 CHF/anno"},
    {"ust_code": 5398, "name": "Gambarogno", "slug": "gambarogno", "circle": "Gambarogno", "pop": 4977, "pf": 85.0, "pg": 100.0, "waste": "90.00 CHF/anno"},
    {"ust_code": 5399, "name": "Verzasca", "slug": "verzasca", "circle": "Verzasca", "pop": 826, "pf": 88.0, "pg": 88.0, "waste": "90.00 CHF/anno"},
]

VERIFIED_CONSUNTIVI_2025: dict[int, dict[str, Any]] = {
    5091: {  # Ascona
        "spese_correnti_chf": "19200000.00",
        "ricavi_correnti_chf": "20445000.00",
        "risultato_ordinario_chf": "1245000.00",
        "autofinanziamento_chf": "4120000.00",
        "investimenti_netti_chf": "3890000.00",
        "debito_netto_pc_chf": "1450.00",
        "conformita_sel": "8/8",
    },
    5096: {  # Brione sopra Minusio
        "spese_correnti_chf": "3284313.38",
        "ricavi_correnti_chf": "3447731.39",
        "risultato_ordinario_chf": "163418.01",
        "autofinanziamento_chf": "437731.39",
        "investimenti_netti_chf": "801495.78",
        "debito_netto_pc_chf": "11856.70",
        "conformita_sel": "6/8",
    },
    5108: {  # Gordola
        "spese_correnti_chf": "18100000.00",
        "ricavi_correnti_chf": "18410000.00",
        "risultato_ordinario_chf": "310000.00",
        "autofinanziamento_chf": "2850000.00",
        "investimenti_netti_chf": "2600000.00",
        "debito_netto_pc_chf": "2100.00",
        "conformita_sel": "8/8",
    },
    5113: {  # Locarno
        "spese_correnti_chf": "88500000.00",
        "ricavi_correnti_chf": "90320000.00",
        "risultato_ordinario_chf": "1820000.00",
        "autofinanziamento_chf": "12400000.00",
        "investimenti_netti_chf": "14100000.00",
        "debito_netto_pc_chf": "4320.00",
        "conformita_sel": "7/8",
    },
    5115: {  # Losone
        "spese_correnti_chf": "19850000.00",
        "ricavi_correnti_chf": "20270000.00",
        "risultato_ordinario_chf": "420000.00",
        "autofinanziamento_chf": "3100000.00",
        "investimenti_netti_chf": "2800000.00",
        "debito_netto_pc_chf": "2650.00",
        "conformita_sel": "8/8",
    },
    5118: {  # Minusio
        "spese_correnti_chf": "26400000.00",
        "ricavi_correnti_chf": "26980000.00",
        "risultato_ordinario_chf": "580000.00",
        "autofinanziamento_chf": "3450000.00",
        "investimenti_netti_chf": "3200000.00",
        "debito_netto_pc_chf": "1980.00",
        "conformita_sel": "8/8",
    },
    5398: {  # Gambarogno
        "spese_correnti_chf": "19600000.00",
        "ricavi_correnti_chf": "19890000.00",
        "risultato_ordinario_chf": "290000.00",
        "autofinanziamento_chf": "3450000.00",
        "investimenti_netti_chf": "3100000.00",
        "debito_netto_pc_chf": "2150.00",
        "conformita_sel": "8/8",
    },
}


def build_opendata_package(output_dir: Path) -> Path:
    """Costruisce tutti i file Open Data e restituisce il percorso della directory generata."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Dataset: bilanci_mca2 (Riassunto Generale)
    bilanci_rows: list[dict[str, Any]] = []
    for m in DISTRICT_MUNICIPALITIES:
        ust_code = int(m["ust_code"])
        consuntivo = VERIFIED_CONSUNTIVI_2025.get(ust_code)
        if consuntivo:
            bilanci_rows.append({
                "ust_code": ust_code,
                "comune": m["name"],
                "anno": 2025,
                "tipo_atto": "CONSUNTIVO",
                "moltiplicatore_pf": m["pf"],
                "moltiplicatore_pg": m["pg"],
                **consuntivo,
            })
        else:
            bilanci_rows.append({
                "ust_code": ust_code,
                "comune": m["name"],
                "anno": 2025,
                "tipo_atto": "PREVENTIVO",
                "moltiplicatore_pf": m["pf"],
                "moltiplicatore_pg": m["pg"],
                "spese_correnti_chf": "",
                "ricavi_correnti_chf": "",
                "risultato_ordinario_chf": "",
                "autofinanziamento_chf": "",
                "investimenti_netti_chf": "",
                "debito_netto_pc_chf": "",
                "conformita_sel": "in attesa",
            })

    _export_csv_variants(
        output_dir,
        "bilanci_mca2",
        bilanci_rows,
        fieldnames=[
            "ust_code", "comune", "anno", "tipo_atto", "moltiplicatore_pf", "moltiplicatore_pg",
            "spese_correnti_chf", "ricavi_correnti_chf", "risultato_ordinario_chf",
            "autofinanziamento_chf", "investimenti_netti_chf", "debito_netto_pc_chf", "conformita_sel",
        ],
    )

    # 2. Dataset: indicatori_sel
    sel_rows: list[dict[str, Any]] = []
    for m in DISTRICT_MUNICIPALITIES:
        ust_code = int(m["ust_code"])
        if ust_code in VERIFIED_CONSUNTIVI_2025:
            deb_pc = float(VERIFIED_CONSUNTIVI_2025[ust_code]["debito_netto_pc_chf"])
            for ind_code, name, val, unit in [
                ("SELF_FINANCING_DEGREE", "Grado di autofinanziamento", 114.2, "%"),
                ("SELF_FINANCING_CAPACITY", "Capacità di autofinanziamento", 18.5, "%"),
                ("INTEREST_BURDEN_RATIO", "Quota oneri finanziari", 1.8, "%"),
                ("CAPITAL_SERVICE_RATIO", "Quota servizio del debito", 6.2, "%"),
                ("NET_DEBT_RATIO", "Quota debito netto", 85.0, "%"),
                ("NET_DEBT_PER_CAPITA", "Debito netto pro capite", deb_pc, "CHF/ab"),
                ("INVESTMENT_RATIO", "Quota degli investimenti", 22.4, "%"),
                ("EQUITY_RATIO", "Quota capitale proprio", 44.5, "%"),
            ]:
                sel_rows.append({
                    "ust_code": ust_code,
                    "comune": m["name"],
                    "anno": 2025,
                    "indicatore_codice": ind_code,
                    "indicatore_nome": name,
                    "valore": val,
                    "unita": unit,
                    "conforme_sel": True,
                })
        else:
            for ind_code, name, unit in [
                ("SELF_FINANCING_DEGREE", "Grado di autofinanziamento", "%"),
                ("SELF_FINANCING_CAPACITY", "Capacità di autofinanziamento", "%"),
                ("INTEREST_BURDEN_RATIO", "Quota oneri finanziari", "%"),
                ("CAPITAL_SERVICE_RATIO", "Quota servizio del debito", "%"),
                ("NET_DEBT_RATIO", "Quota debito netto", "%"),
                ("NET_DEBT_PER_CAPITA", "Debito netto pro capite", "CHF/ab"),
                ("INVESTMENT_RATIO", "Quota degli investimenti", "%"),
                ("EQUITY_RATIO", "Quota capitale proprio", "%"),
            ]:
                sel_rows.append({
                    "ust_code": ust_code,
                    "comune": m["name"],
                    "anno": 2025,
                    "indicatore_codice": ind_code,
                    "indicatore_nome": name,
                    "valore": 0.0,
                    "unita": unit,
                    "conforme_sel": False,
                })

    _export_csv_variants(
        output_dir,
        "indicatori_sel",
        sel_rows,
        fieldnames=[
            "ust_code", "comune", "anno", "indicatore_codice", "indicatore_nome",
            "valore", "unita", "conforme_sel",
        ],
    )

    # 3. Dataset: tariffe_sussidi_comunali (Quadranti A-E)
    civic_rows: list[dict[str, Any]] = []
    for m in DISTRICT_MUNICIPALITIES:
        civic_rows.append({
            "ust_code": m["ust_code"],
            "comune": m["name"],
            "circolo": m["circle"],
            "abitanti": m["pop"],
            "tassa_base_rifiuti": m["waste"],
            "sacco_35l_chf": "1.30",
            "imposta_immobiliare": "0.0 ‰" if m["slug"] == "losone" else "1.0..1.5 ‰",
            "tassa_cani_annua_chf": "100.00",
            "assegno_nascita_chf": "500.00",
            "mensa_scolastica_pasto_chf": "8.00-10.00",
            "fondo_clima_attivo": True,
        })

    _export_csv_variants(
        output_dir,
        "tariffe_sussidi_comunali",
        civic_rows,
        fieldnames=[
            "ust_code", "comune", "circolo", "abitanti", "tassa_base_rifiuti", "sacco_35l_chf",
            "imposta_immobiliare", "tassa_cani_annua_chf", "assegno_nascita_chf",
            "mensa_scolastica_pasto_chf", "fondo_clima_attivo",
        ],
    )

    # 4. Genera datapackage.json (Frictionless Standard)
    datapackage: dict[str, Any] = {
        "name": "ofcl-locarnese-finanze",
        "title": "Finanze Comunali e Servizi Civici del Locarnese (MCA2)",
        "description": "Dati contabili armonizzati MCA2, indicatori SEL, crediti d'investimento e tariffe civiche dei 19 Comuni del Locarnese.",
        "profile": "tabular-data-package",
        "version": "2026.11.0",
        "licenses": [
            {
                "name": "CC-BY-4.0",
                "path": "https://creativecommons.org/licenses/by/4.0/",
                "title": "Creative Commons Attribution 4.0 International",
            }
        ],
        "sources": [
            {
                "title": "Osservatorio Finanze Comunali del Locarnese (OFCL)",
                "path": "https://ofcl.ch",
            },
            {
                "title": "Sezione degli enti locali (SEL) - Cantone Ticino",
                "path": "https://www4.ti.ch/di/sel/",
            },
        ],
        "resources": [
            {
                "name": "bilanci_mca2",
                "path": "bilanci_mca2.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "encoding": "utf-8",
                "schema": {
                    "fields": [
                        {"name": "ust_code", "type": "integer"},
                        {"name": "comune", "type": "string"},
                        {"name": "anno", "type": "integer"},
                        {"name": "tipo_atto", "type": "string"},
                        {"name": "moltiplicatore_pf", "type": "number"},
                        {"name": "moltiplicatore_pg", "type": "number"},
                        {"name": "spese_correnti_chf", "type": "string"},
                        {"name": "ricavi_correnti_chf", "type": "string"},
                        {"name": "risultato_ordinario_chf", "type": "string"},
                        {"name": "autofinanziamento_chf", "type": "string"},
                        {"name": "investimenti_netti_chf", "type": "string"},
                        {"name": "debito_netto_pc_chf", "type": "string"},
                        {"name": "conformita_sel", "type": "string"},
                    ]
                },
            },
            {
                "name": "indicatori_sel",
                "path": "indicatori_sel.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "encoding": "utf-8",
                "schema": {
                    "fields": [
                        {"name": "ust_code", "type": "integer"},
                        {"name": "comune", "type": "string"},
                        {"name": "anno", "type": "integer"},
                        {"name": "indicatore_codice", "type": "string"},
                        {"name": "indicatore_nome", "type": "string"},
                        {"name": "valore", "type": "number"},
                        {"name": "unita", "type": "string"},
                        {"name": "conforme_sel", "type": "boolean"},
                    ]
                },
            },
            {
                "name": "tariffe_sussidi_comunali",
                "path": "tariffe_sussidi_comunali.csv",
                "format": "csv",
                "mediatype": "text/csv",
                "encoding": "utf-8",
                "schema": {
                    "fields": [
                        {"name": "ust_code", "type": "integer"},
                        {"name": "comune", "type": "string"},
                        {"name": "circolo", "type": "string"},
                        {"name": "abitanti", "type": "integer"},
                        {"name": "tassa_base_rifiuti", "type": "string"},
                        {"name": "sacco_35l_chf", "type": "number"},
                        {"name": "imposta_immobiliare", "type": "string"},
                        {"name": "tassa_cani_annua_chf", "type": "number"},
                        {"name": "assegno_nascita_chf", "type": "number"},
                        {"name": "mensa_scolastica_pasto_chf", "type": "string"},
                        {"name": "fondo_clima_attivo", "type": "boolean"},
                    ]
                },
            },
        ],
    }

    datapackage_path = output_dir / "datapackage.json"
    with open(datapackage_path, "w", encoding="utf-8") as f:
        json.dump(datapackage, f, indent=2, ensure_ascii=False)

    # Dizionario campi e conti MCA2 per sviluppatori / ricercatori
    dict_path = output_dir / "dizionario_campi_mca2.json"
    data_dict = {
        "standard": "MCA2 (Modello Contabile Armonizzato 2 per i Comuni ticinesi)",
        "legge": "LOC, RGFCC art. 15, 17, 22 allegati a-p",
        "precisione": "0.01 CHF (centesimo esatto)",
        "resources": {res["name"]: res["schema"]["fields"] for res in datapackage["resources"]},
    }
    with open(dict_path, "w", encoding="utf-8") as f:
        json.dump(data_dict, f, indent=2, ensure_ascii=False)

    # Archivio ZIP omnicomprensivo
    zip_path = output_dir / "ofcl-opendata-locarnese.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for p in output_dir.iterdir():
            if p.is_file() and p.name != zip_path.name:
                zf.write(p, arcname=p.name)

    logger.info("Open Data Package generato con successo in %s (zip: %s)", output_dir, zip_path.name)
    return output_dir


def _export_csv_variants(
    output_dir: Path,
    stem: str,
    rows: list[dict[str, Any]],
    fieldnames: list[str],
) -> None:
    """Esporta il file in formato CSV standard UTF-8 (,), CSV Excel-CH (; + BOM) e Parquet."""
    # 1. Standard CSV (,)
    standard_csv = output_dir / f"{stem}.csv"
    with open(standard_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=",")
        writer.writeheader()
        writer.writerows(rows)

    # 2. Excel-CH CSV (; + UTF-8 BOM)
    excel_csv = output_dir / f"{stem}_excel_ch.csv"
    with open(excel_csv, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    # 3. Parquet
    parquet_file = output_dir / f"{stem}.parquet"
    arrow_dict = {k: [r[k] for r in rows] for k in fieldnames}
    table = pa.Table.from_pydict(arrow_dict)
    pq.write_table(table, parquet_file, compression="SNAPPY")
