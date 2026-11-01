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
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from ofcl.fetch.crawler import CorteseCrawler
from ofcl.seed_ref import enforce_corfin_guardrail


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
                storage_path = item.get("r2_key") or (f"pdf/{ust_code}/{sha256}.pdf" if sha256 else None)
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

                if status in ("DOWNLOADED", "CACHED") and sha256 and size_bytes > 0 and storage_path:
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
    repo_root = Path(__file__).resolve().parents[3]
    registry_path = repo_root / "registry" / "comuni.yaml"
    raw_dir = repo_root / "data" / "raw_pdfs"

    crawler = CorteseCrawler(
        registry_yaml_path=registry_path,
        raw_pdf_dir=raw_dir,
        sync_r2=not args.dry_run and not args.no_r2,
        fast_mode=args.fast,
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
        f"since: {args.since}, max_docs: {args.max_docs})..."
    )

    report = asyncio.run(
        crawler.crawl_all(
            ust_filter=ust_filter,
            dry_run=args.dry_run,
            max_docs=args.max_docs,
            since_date=args.since,
        )
    )

    # Persistenza opzionale in raw.document e raw.document_version
    docs_saved, versions_saved = save_crawl_documents_to_db(report)
    if docs_saved > 0 or versions_saved > 0:
        print(f"[ofcl crawl] DB salvati: {docs_saved} raw.document, {versions_saved} raw.document_version")

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


def main() -> None:
    enforce_corfin_guardrail()
    parser = argparse.ArgumentParser(
        prog="ofcl",
        description="CLI OFCL - Osservatorio Finanze Comunali del Locarnese",
    )
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # Subcommand: crawl
    crawl_parser = subparsers.add_parser("crawl", help="Scansione e download cortese dei PDF comunali")
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

    args = parser.parse_args()

    if args.subcommand == "crawl":
        sys.exit(cmd_crawl(args))


if __name__ == "__main__":
    main()
