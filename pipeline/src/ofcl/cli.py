"""
Interfaccia a riga di comando (CLI) per OFCL.

Comandi supportati:
- ofcl crawl: Acquisizione cortese dei documenti dai 19 portali comunali.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from ofcl.export.datapackage_builder import build_opendata_package
from ofcl.extract.layout_loader import LayoutConfigError
from ofcl.extract.pdf_inspector import inspect_pdf
from ofcl.extract.table_extractor import ExtractedCell, TableExtractor
from ofcl.fetch.backfill import run_regional_backfill
from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.state_store import CrawlStateStore, HttpDiskCache
from ofcl.load.postgres_loader import PostgresLoader
from ofcl.seed_ref import enforce_corfin_guardrail
from ofcl.validate.mca2_engine import CreditRowInput, ValidationContext, validate_mca2_document


def _json_default(obj: Any) -> Any:
    """Serializzatore sicuro per tipi non JSON nativi (Decimal, UUID, date)."""
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, (uuid.UUID, Path)):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def get_git_sha() -> str:
    """Restituisce il commit SHA corrente o un fallback."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            stderr=subprocess.DEVNULL,
        )
        return out.decode("utf-8").strip()
    except Exception:  # noqa: BLE001
        return "local-dev"


def save_pipeline_run_to_db(stage: str, git_sha: str, report: dict[str, Any]) -> str | None:
    """Tenta di persistere l'esecuzione in raw.pipeline_run se PostgreSQL è disponibile."""
    enforce_corfin_guardrail()
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not db_url:
        return None

    try:
        import psycopg

        status = "OK"
        if report.get("status_counts", {}).get("ERROR", 0) > 0:
            status = "PARTIAL"

        with psycopg.connect(db_url) as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO raw.pipeline_run (stage, git_sha, started_at, finished_at, status, report)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id::text;
                """,
                (
                    stage,
                    git_sha,
                    report.get("started_at"),
                    report.get("finished_at"),
                    status,
                    json.dumps(report),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return row[0] if row else None
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Impossibile salvare pipeline_run su DB: {exc}", file=sys.stderr)
        return None


def save_crawl_documents_to_db(report: dict[str, Any]) -> tuple[int, int]:
    """Salva i documenti e le versioni scoperte in raw.document e raw.document_version."""
    enforce_corfin_guardrail()
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not db_url:
        return 0, 0

    docs_count = 0
    versions_count = 0
    try:
        import psycopg

        with psycopg.connect(db_url) as conn, conn.cursor() as cur:
            for item in report.get("results", []):
                ust_code = item["ust_code"]
                origin_url = item["url"]
                title_raw = item.get("title")
                status = item.get("status")
                sha256 = item.get("sha256")
                size_bytes = item.get("size_bytes", 0)
                storage_path = item.get("r2_key") or (
                    f"pdf/{ust_code}/{sha256}.pdf" if sha256 else None
                )
                contains_privacy = status == "SKIPPED_PRIVACY"

                cur.execute(
                    """
                    INSERT INTO raw.document (ust_code, origin_url, title_raw, acquisition, contains_personal_data)
                    VALUES (%s, %s, %s, 'CRAWLER', %s)
                    ON CONFLICT (ust_code, origin_url) DO UPDATE
                    SET title_raw = coalesce(EXCLUDED.title_raw, raw.document.title_raw),
                        contains_personal_data = EXCLUDED.contains_personal_data
                    RETURNING id;
                    """,
                    (ust_code, origin_url, title_raw, contains_privacy),
                )
                doc_row = cur.fetchone()
                if not doc_row:
                    continue
                doc_id = doc_row[0]
                docs_count += 1

                if (
                    status in ("DOWNLOADED", "CACHED")
                    and sha256
                    and size_bytes > 0
                    and storage_path
                ):
                    cur.execute(
                        """
                        INSERT INTO raw.document_version (document_id, sha256, storage_path, bytes, mime, fetched_at, status)
                        VALUES (%s, %s, %s, %s, 'application/pdf', now(), 'DOWNLOADED')
                        ON CONFLICT (sha256) DO UPDATE
                        SET storage_path = EXCLUDED.storage_path
                        RETURNING id;
                        """,
                        (doc_id, sha256, storage_path, size_bytes),
                    )
                    ver_row = cur.fetchone()
                    if ver_row:
                        versions_count += 1

            conn.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[WARN] Errore salvataggio documenti su DB: {exc}", file=sys.stderr)

    return docs_count, versions_count


def cmd_crawl(args: argparse.Namespace) -> int:
    """Esegue il comando 'ofcl crawl'."""
    if args.concurrency < 1:
        print(
            f"[ERRORE] --concurrency deve essere >= 1 (ricevuto {args.concurrency})",
            file=sys.stderr,
        )
        return 1
    if args.max_pages < 1:
        print(f"[ERRORE] --max-pages deve essere >= 1 (ricevuto {args.max_pages})", file=sys.stderr)
        return 1

    repo_root = Path(__file__).resolve().parents[3]
    registry_path = repo_root / "registry" / "comuni.yaml"
    raw_dir = repo_root / "data" / "raw_pdfs"
    state_file = repo_root / "data" / "crawl_state.json"
    cache_dir = repo_root / "data" / ".http_cache"

    state_store = CrawlStateStore(state_file)
    http_cache = HttpDiskCache(cache_dir, enabled=bool(args.http_cache))

    crawler = CorteseCrawler(
        registry_yaml_path=registry_path,
        raw_pdf_dir=raw_dir,
        sync_r2=not args.dry_run and not args.no_r2,
        fast_mode=args.fast,
        max_concurrent_hosts=args.concurrency,
        max_pages_per_source=args.max_pages,
        state_store=state_store,
        http_cache=http_cache,
    )

    ust_filter: int | None = None
    if args.ust.lower() != "all":
        try:
            ust_filter = int(args.ust)
        except ValueError:
            print(f"[ERRORE] Codice UST non valido: {args.ust}", file=sys.stderr)
            return 1

    print(
        f"[ofcl crawl] Avvio scansione (UST: {args.ust}, dry_run: {args.dry_run}, "
        f"since: {args.since}, max_docs: {args.max_docs}, concurrency: {args.concurrency}, "
        f"max_pages: {args.max_pages}, resume: {args.resume})..."
    )

    report = asyncio.run(
        crawler.crawl_all(
            ust_filter=ust_filter,
            dry_run=args.dry_run,
            max_docs=args.max_docs,
            since_date=args.since,
            resume=args.resume,
        )
    )

    # Persistenza opzionale in raw.document e raw.document_version
    docs_saved, versions_saved = save_crawl_documents_to_db(report)
    if docs_saved > 0 or versions_saved > 0:
        print(
            f"[ofcl crawl] DB salvati: {docs_saved} raw.document, {versions_saved} raw.document_version"
        )

    # Persistenza opzionale in raw.pipeline_run
    git_sha = get_git_sha()
    run_id = save_pipeline_run_to_db("CRAWL", git_sha, report)
    if run_id:
        report["db_run_id"] = run_id
        print(f"[ofcl crawl] Registrato in raw.pipeline_run ID: {run_id}")

    # Output report su file o console
    if args.output_json:
        out_path = Path(args.output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[ofcl crawl] Report salvato in: {out_path}")
    else:
        # Salva comunque in data/reports per tracciabilità locale
        reports_dir = repo_root / "data" / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        report_file = reports_dir / f"crawl_report_{ts}.json"
        report_file.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    # Stampa riepilogo sintetico
    print("\n--- Riepilogo OFCL Crawl ---")
    print(f"Comuni analizzati: {report['target_municipalities_count']}")
    print(f"Documenti scoperti: {report['total_discovered_docs']}")
    print(f"Stati: {report['status_counts']}")
    print(f"Byte scaricati: {report['total_bytes_downloaded']} bytes")
    print(f"Durata: {report['duration_seconds']}s")

    return 0


def cmd_inspect_pdf(args: argparse.Namespace) -> int:
    """Ispezione strutturale e geometrica di un PDF contabile."""
    pdf_path = Path(args.path)
    if not pdf_path.exists():
        print(f"[ERRORE] File non trovato: {pdf_path}", file=sys.stderr)
        return 1

    report = inspect_pdf(pdf_path)
    print("\n--- Ispezione Strutturale PDF OFCL ---")
    print(f"File: {report.pdf_path.name}")
    print(f"SHA-256: {report.sha256}")
    print(f"Pagine: {report.page_count}")
    print(f"Text Layer: {'SÌ' if report.has_text_layer else 'NO'}")
    print(f"Layout Family: {report.layout_family}")
    print("Sezioni rilevate (Art. 22 RGFCC):")
    for sec, pages in sorted(report.sections.items()):
        print(f"  - {sec}: pagine {pages}")
    print(f"Metadati: {report.metadata}")

    if args.output_json:
        out = {
            "sha256": report.sha256,
            "page_count": report.page_count,
            "has_text_layer": report.has_text_layer,
            "layout_family": report.layout_family,
            "sections": report.sections,
            "metadata": report.metadata,
        }
        Path(args.output_json).write_text(json.dumps(out, indent=2), encoding="utf-8")
        print(f"\nRapporto salvato in: {args.output_json}")

    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    """Estrazione deterministica dei dati dai tabulati contabili (Riassunto, Indicatori, Crediti)."""
    import pdfplumber

    if args.db and (not getattr(args, "version_id", None) or not getattr(args, "entity_id", None)):
        print(
            "[ERRORE] --version-id ed --entity-id sono obbligatori quando --db è specificato",
            file=sys.stderr,
        )
        return 1

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"[ERRORE] File non trovato: {pdf_path}", file=sys.stderr)
        return 1

    inspection = inspect_pdf(pdf_path)
    if not inspection.has_text_layer or inspection.layout_family == "SCAN_IMAGE":
        err_msg = inspection.metadata.get("error") or "text layer assente o scansione immagine"
        print(
            f"[ERRORE] Impossibile estrarre tabelle da {pdf_path.name}: {err_msg}", file=sys.stderr
        )
        return 1

    try:
        extractor = TableExtractor(inspection.layout_family)
    except LayoutConfigError as exc:
        print(f"[ERRORE] Layout non supportato o non valido: {exc}", file=sys.stderr)
        return 1

    with pdfplumber.open(pdf_path) as pdf:
        rg_pages = inspection.sections.get("lett_a", [])
        rg_cells = extractor.extract_riassunto_generale(pdf, rg_pages) if rg_pages else {}

        ind_pages = inspection.sections.get("lett_o", [])
        ind_cells = extractor.extract_indicatori_sel(pdf, ind_pages) if ind_pages else {}

        f_pages = inspection.sections.get("lett_f", [])
        cred_items, cred_totals = (
            extractor.extract_controllo_crediti(pdf, f_pages) if f_pages else ([], {})
        )

    print("\n--- Risultato Estrazione OFCL ---")
    print(f"Riassunto Generale: {len(rg_cells)} celle estratte")
    for k in [
        "spese_operative",
        "ricavi_operativi",
        "risultato_ordinario",
        "onere_netto_investimenti",
        "autofinanziamento",
    ]:
        if k in rg_cells:
            print(f"  - {k}: {rg_cells[k].amount_chf} CHF (p.{rg_cells[k].page})")

    print(f"Indicatori SEL: {len(ind_cells)} indicatori estratti")
    for k, cell in ind_cells.items():
        print(f"  - {k}: {cell.amount_chf} (p.{cell.page})")

    print(f"Controllo Crediti: {len(cred_items)} opere, {len(cred_totals)} totali")
    overruns = [i for i in cred_items if i.has_overrun]
    if overruns:
        print(f"  [ATTENZIONE] Rilevati {len(overruns)} sorpassi di spesa!")
        for o in overruns:
            print(f"    * {o.description} ({o.account_code}): residuo {o.remaining_credit} CHF")

    if args.db:
        loader = PostgresLoader()
        saved = loader.save_ledger_cells(args.version_id, args.entity_id, rg_cells, 2025)
        print(f"Persistenza DB: {saved} celle salvate")

    if args.output_json:
        out_data = {
            "sha256": inspection.sha256,
            "riassunto_generale": {k: v.to_dict() for k, v in rg_cells.items()},
            "indicatori_sel": {k: v.to_dict() for k, v in ind_cells.items()},
            "crediti_count": len(cred_items),
            "crediti_totali": {k: v.to_dict() for k, v in cred_totals.items()},
        }
        Path(args.output_json).write_text(
            json.dumps(out_data, indent=2, ensure_ascii=False, default=_json_default),
            encoding="utf-8",
        )
        print(f"Dati salvati in: {args.output_json}")

    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    """Esecuzione delle 12 verifiche contabili MCA2 e rilevamento segnali."""
    import pdfplumber

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"[ERRORE] File non trovato: {pdf_path}", file=sys.stderr)
        return 1

    inspection = inspect_pdf(pdf_path)
    if not inspection.has_text_layer or inspection.layout_family == "SCAN_IMAGE":
        err_msg = inspection.metadata.get("error") or "text layer assente o scansione immagine"
        print(f"[ERRORE] Impossibile validare {pdf_path.name}: {err_msg}", file=sys.stderr)
        return 1

    try:
        extractor = TableExtractor(inspection.layout_family)
    except LayoutConfigError as exc:
        print(f"[ERRORE] Layout non supportato o non valido: {exc}", file=sys.stderr)
        return 1

    with pdfplumber.open(pdf_path) as pdf:
        rg_cells = extractor.extract_riassunto_generale(pdf, inspection.sections.get("lett_a", []))
        ind_cells = extractor.extract_indicatori_sel(pdf, inspection.sections.get("lett_o", []))
        cred_items, cred_totals = extractor.extract_controllo_crediti(
            pdf, inspection.sections.get("lett_f", [])
        )

    # Prepara CreditRowInput
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

    zero = Decimal("0.00")
    ctx = ValidationContext(
        spese_operative=rg_cells.get(
            "spese_operative", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        ricavi_operativi=rg_cells.get(
            "ricavi_operativi", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        risultato_operativo_dichiarato=rg_cells.get(
            "risultato_operativo", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        spese_finanziarie_34=rg_cells.get(
            "spese_finanziarie", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        ricavi_finanziari_44=rg_cells.get(
            "ricavi_finanziari", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        risultato_finanziario_dichiarato=rg_cells.get(
            "risultato_finanziario", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        risultato_ordinario_dichiarato=rg_cells.get(
            "risultato_ordinario", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        risultato_totale_esercizio_dichiarato=rg_cells.get(
            "risultato_totale_esercizio", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        uscite_investimenti_ba_5=rg_cells.get(
            "uscite_investimenti", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        entrate_investimenti_ba_6=rg_cells.get(
            "entrate_investimenti", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        onere_netto_investimenti_dichiarato=rg_cells.get(
            "onere_netto_investimenti", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        autofinanziamento_dichiarato=rg_cells.get(
            "autofinanziamento", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        risultato_finanziamento_dichiarato=rg_cells.get(
            "risultato_globale", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        totale_attivi=rg_cells.get(
            "totale_attivi", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        totale_passivi=rg_cells.get(
            "totale_passivi", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        credit_rows=credit_rows,
        totale_spese_lorde_crediti=cred_totals.get(
            "totale_spese_lorde_esercizio", ExtractedCell("", "", 0, (0, 0, 0, 0), "", zero)
        ).amount_chf
        or zero,
        reported_indicators={
            k: v.amount_chf for k, v in ind_cells.items() if v.amount_chf is not None
        },
    )

    checks, signals = validate_mca2_document(ctx)

    print("\n--- Report di Quadratura Contabile MCA2 (V01-V12) ---")
    blocking_failed = [c for c in checks if not c.passed and c.severity == "BLOCKING"]
    warnings_failed = [c for c in checks if not c.passed and c.severity == "WARNING"]
    if warnings_failed:
        print(f"  [AVVISO] Rilevati {len(warnings_failed)} warning contabili.")

    for c in checks:
        status_sym = "[OK]" if c.passed else f"[{c.severity}]"
        print(f"  {status_sym} {c.message}")

    if signals:
        print(f"\n--- Segnali di Contenuto Rilevati ({len(signals)}) ---")
        for s in signals:
            print(f"  [{s.severity}] {s.signal_code}: {s.title} -> {s.description}")

    if args.output_json:
        out_data = {
            "sha256": inspection.sha256,
            "status": "NEEDS_REVIEW" if blocking_failed else "VALIDATED",
            "blocking_failed_count": len(blocking_failed),
            "warnings_count": len(warnings_failed),
            "checks": [
                {
                    "rule_code": c.rule_code,
                    "passed": c.passed,
                    "severity": c.severity,
                    "message": c.message,
                    "expected": str(c.expected),
                    "actual": str(c.actual),
                    "delta": str(c.delta),
                }
                for c in checks
            ],
            "signals": [
                {
                    "signal_code": s.signal_code,
                    "severity": s.severity,
                    "title": s.title,
                    "description": s.description,
                }
                for s in signals
            ],
        }
        out_p = Path(args.output_json)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(
            json.dumps(out_data, indent=2, ensure_ascii=False, default=_json_default),
            encoding="utf-8",
        )
        print(f"Report validazione salvato in: {args.output_json}")

    if blocking_failed:
        print(
            f"\n[ESITO: NEEDS_REVIEW] {len(blocking_failed)} controlli bloccanti falliti.",
            file=sys.stderr,
        )
        return 2

    print("\n[ESITO: VALIDATED] Tutte le quadrature contabili MCA2 superate con successo!")
    return 0


def cmd_export_opendata(args: argparse.Namespace) -> int:
    """Genera i pacchetti Open Data (Frictionless, CSV standard, CSV Excel-CH, Parquet)."""
    enforce_corfin_guardrail()
    out_dir = Path(args.out_dir)
    print(f"--- Generazione Pacchetto Open Data Frictionless in {out_dir} ---")
    res = build_opendata_package(out_dir)
    print(f"[OK] Open Data Package generato con successo: {res}")
    return 0


def cmd_backfill(args: argparse.Namespace) -> int:
    """Esegue il backfill regionale controllato (per lotti o all) dei 19 Comuni."""
    enforce_corfin_guardrail()
    repo_root = Path(__file__).resolve().parents[3]
    registry_path = repo_root / "registry" / "comuni.yaml"
    raw_pdf_dir = repo_root / "data" / "raw_pdfs"

    print(f"[ofcl backfill] Avvio backfill regionale (Lotto: {args.batch}, fast: {args.fast})...")
    report = asyncio.run(
        run_regional_backfill(
            registry_path=registry_path,
            raw_pdf_dir=raw_pdf_dir,
            batch=args.batch,
            fast_mode=args.fast,
            sync_r2=not args.no_r2,
            max_docs_per_source=args.max_docs,
        )
    )

    if args.output_json:
        out_p = Path(args.output_json)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[ofcl backfill] Catalogo salvato in: {out_p}")

    stats = report["stats"]
    print("\n--- Riepilogo Backfill Regionale OFCL ---")
    print(f"Comuni nel lotto: {stats['total_municipalities']}")
    print(f"Atti scoperti: {stats['total_discovered']}")
    print(f"Per tipologia: {stats['by_kind']}")
    print(f"Esclusioni privacy nLPD: {stats['skipped_privacy_nlpd']}")
    print(f"Intake manuale (Locarno): {stats['manual_intake_locarno']}")
    print(f"Durata: {report['duration_seconds']}s")
    return 0


def main() -> None:
    enforce_corfin_guardrail()
    parser = argparse.ArgumentParser(
        prog="ofcl",
        description="CLI OFCL - Osservatorio Finanze Comunali del Locarnese",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Subcommand: crawl
    crawl_parser = subparsers.add_parser(
        "crawl", help="Scansione e download cortese dei PDF comunali"
    )
    crawl_parser.add_argument(
        "--ust",
        required=True,
        help="Codice UST del comune (es. 5096) oppure 'all' per tutti i 19 Comuni",
    )
    crawl_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scansiona le fonti senza scaricare i file PDF fisici",
    )
    crawl_parser.add_argument(
        "--since",
        type=str,
        default=None,
        help="Filtro anno o data ISO (es. 2024 o 2024-01-01)",
    )
    crawl_parser.add_argument(
        "--max-docs",
        type=int,
        default=10,
        help="Numero massimo di documenti per fonte da analizzare (default: 10)",
    )
    crawl_parser.add_argument(
        "--output-json",
        type=str,
        default=None,
        help="Percorso file in cui salvare il report JSON completo",
    )
    crawl_parser.add_argument(
        "--no-r2",
        action="store_true",
        help="Disabilita sincronizzazione con Cloudflare R2",
    )
    crawl_parser.add_argument(
        "--fast",
        action="store_true",
        help="Esecuzione rapida senza crawl-delay (uso interno / test)",
    )
    crawl_parser.add_argument(
        "--concurrency",
        type=int,
        default=6,
        help="Numero massimo di domini comunali scansionati in parallelo (default: 6)",
    )
    crawl_parser.add_argument(
        "--max-pages",
        type=int,
        default=3,
        help="Numero massimo di pagine di paginazione per fonte (default: 3)",
    )
    crawl_parser.add_argument(
        "--resume",
        action="store_true",
        help="Riprende la scansione saltando i Comuni già completati in data/crawl_state.json",
    )
    crawl_parser.add_argument(
        "--http-cache",
        action="store_true",
        help="Abilita la cache disco HTML in data/.http_cache per sviluppo/debug",
    )

    # Subcommand: inspect-pdf
    inspect_parser = subparsers.add_parser(
        "inspect-pdf", help="Ispezione geometrica e indicizzazione di un PDF"
    )
    inspect_parser.add_argument("path", help="Percorso del file PDF da analizzare")
    inspect_parser.add_argument(
        "--output-json", type=str, default=None, help="Salva output in formato JSON"
    )

    # Subcommand: extract
    extract_parser = subparsers.add_parser(
        "extract", help="Estrazione tabulati MCA2 (Riassunto, Indicatori, Crediti)"
    )
    extract_parser.add_argument("--pdf", required=True, help="Percorso del file PDF")
    extract_parser.add_argument(
        "--output-json", type=str, default=None, help="Salva output in formato JSON"
    )
    extract_parser.add_argument(
        "--db",
        action="store_true",
        help="Salva i record in core.ledger_value se DATABASE_URL è presente",
    )
    extract_parser.add_argument(
        "--version-id",
        type=str,
        default=None,
        help="UUID della versione documento (richiesto con --db)",
    )
    extract_parser.add_argument(
        "--entity-id", type=str, default=None, help="UUID dell'ente/comune (richiesto con --db)"
    )

    # Subcommand: validate
    validate_parser = subparsers.add_parser(
        "validate", help="Validazione quadratura contabile V01-V12 e segnali S01-S04"
    )
    validate_parser.add_argument("--pdf", required=True, help="Percorso del file PDF")
    validate_parser.add_argument(
        "--output-json", type=str, default=None, help="Salva output in formato JSON"
    )

    # Subcommand: export-opendata
    export_parser = subparsers.add_parser(
        "export-opendata", help="Generazione pacchetti Open Data (CSV, Parquet, Frictionless)"
    )
    export_parser.add_argument(
        "--out-dir", type=str, default="data/opendata", help="Directory di destinazione export"
    )

    # Subcommand: backfill
    backfill_parser = subparsers.add_parser(
        "backfill", help="Backfill regionale controllato (Consuntivi e Preventivi 2022-2027)"
    )
    backfill_parser.add_argument(
        "--batch",
        default="all",
        help="Numero lotto (1: Isole/Melezza, 2: Navegna, 3: Locarno/Valli/Gambarogno) oppure 'all'",
    )
    backfill_parser.add_argument(
        "--fast", action="store_true", help="Esecuzione rapida senza crawl-delay (uso interno/test)"
    )
    backfill_parser.add_argument(
        "--no-r2", action="store_true", help="Disabilita sincronizzazione R2"
    )
    backfill_parser.add_argument(
        "--max-docs", type=int, default=15, help="Massimo documenti per fonte (default: 15)"
    )
    backfill_parser.add_argument(
        "--output-json",
        type=str,
        default="data/backfill_regional_report.json",
        help="Percorso report JSON",
    )

    args = parser.parse_args()

    if args.subcommand == "crawl":
        sys.exit(cmd_crawl(args))
    elif args.subcommand == "inspect-pdf":
        sys.exit(cmd_inspect_pdf(args))
    elif args.subcommand == "extract":
        sys.exit(cmd_extract(args))
    elif args.subcommand == "validate":
        sys.exit(cmd_validate(args))
    elif args.subcommand == "export-opendata":
        sys.exit(cmd_export_opendata(args))
    elif args.subcommand == "backfill":
        sys.exit(cmd_backfill(args))


if __name__ == "__main__":
    main()
