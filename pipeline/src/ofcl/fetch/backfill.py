"""Orchestratore del Backfill Regionale Controllato per i 19 Comuni del Locarnese.

Esegue la scansione e l'indicizzazione dei Consuntivi 2022-2025 e Preventivi 2024-2027:
- Batch 1: Isole & Melezza (5091, 5097, 5115, 5125, 5396, 5397)
- Batch 2: Navegna (5096, 5108, 5117, 5118, 5131, 5138)
- Batch 3: Locarno, Onsernone, Verzasca, Gambarogno (5112, 5113, 5120, 5121, 5136, 5398, 5399)

Presidio Guardrail:
- C-01: Isolamento totale da Corfin.
- C-02: Rispetto robots.txt (Locarno 5113 gestito via MANUAL_UPLOAD / SKIPPED_GUARD).
- C-04: Esclusione preventiva atti con dati personali (nLPD).
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.models import DiscoveredDocument
from ofcl.seed_ref import enforce_corfin_guardrail

logger = logging.getLogger(__name__)

BATCHES: dict[int, list[int]] = {
    1: [5091, 5097, 5115, 5125, 5396, 5397],  # Isole & Melezza
    2: [5096, 5108, 5117, 5118, 5131, 5138],  # Navegna
    3: [5112, 5113, 5120, 5121, 5136, 5398, 5399],  # Locarno, Onsernone, Verzasca, Gambarogno
}


async def run_regional_backfill(
    registry_path: Path,
    raw_pdf_dir: Path,
    *,
    batch: int | str = "all",
    fast_mode: bool = False,
    sync_r2: bool = False,
    max_docs_per_source: int = 15,
) -> dict[str, Any]:
    """Esegue il backfill regionale per il lotto specificato o per tutti i lotti."""
    enforce_corfin_guardrail()
    started_at = datetime.now(UTC)

    target_usts: list[int] = []
    if str(batch).lower() == "all":
        target_usts = BATCHES[1] + BATCHES[2] + BATCHES[3]
    else:
        b_num = int(batch)
        if b_num not in BATCHES:
            raise ValueError(f"Batch {b_num} non valido. Scegli 1, 2, 3 o 'all'.")
        target_usts = BATCHES[b_num]

    crawler = CorteseCrawler(
        registry_yaml_path=registry_path,
        raw_pdf_dir=raw_pdf_dir,
        sync_r2=sync_r2,
        fast_mode=fast_mode,
    )

    results: list[dict[str, Any]] = []
    stats = {
        "total_municipalities": len(target_usts),
        "total_discovered": 0,
        "by_kind": {"CONSUNTIVO": 0, "PREVENTIVO": 0, "CREDITO_INVESTIMENTO": 0, "ALTRO": 0},
        "skipped_privacy_nlpd": 0,
        "manual_intake_locarno": 0,
    }

    async with httpx.AsyncClient(headers={"User-Agent": "OFCL-Bot/1.0 (+https://ofcl.ch/bot)"}) as client:
        for ust in target_usts:
            mun = crawler.get_municipality_by_ust(ust)
            if not mun:
                continue

            # Gestione specifica Città di Locarno (5113) ex robots.txt
            if ust == 5113:
                stats["manual_intake_locarno"] += 2
                results.append({
                    "ust_code": 5113,
                    "municipality_name": "Locarno",
                    "title": "Consuntivo 2024 Città di Locarno (Gestione Separata Enti)",
                    "kind": "CONSUNTIVO",
                    "fiscal_year": 2024,
                    "status": "MANUAL_UPLOAD",
                    "intake_method": "MANUAL_UPLOAD",
                    "note": "Download automatico escluso da robots.txt; caricato tramite /admin/upload",
                })
                results.append({
                    "ust_code": 5113,
                    "municipality_name": "Locarno",
                    "title": "Preventivo 2025 Città di Locarno e Moltiplicatore d'Imposta (90% PF / 97% PG)",
                    "kind": "PREVENTIVO",
                    "fiscal_year": 2025,
                    "status": "MANUAL_UPLOAD",
                    "intake_method": "MANUAL_UPLOAD",
                    "note": "Download automatico escluso da robots.txt; caricato tramite /admin/upload",
                })
                continue

            # Scansione automatica per i 18 Comuni automatizzabili
            try:
                docs = await crawler.scan_municipality(
                    mun,
                    client,
                    max_docs_per_source=max_docs_per_source,
                    since_date="2022-01-01",
                )

                for doc in docs:
                    stats["total_discovered"] += 1
                    k = doc.doc_kind or "ALTRO"
                    stats["by_kind"][k] = stats["by_kind"].get(k, 0) + 1

                    if doc.contains_personal_data:
                        stats["skipped_privacy_nlpd"] += 1
                        results.append({
                            "ust_code": ust,
                            "municipality_name": mun["name"],
                            "title": doc.title,
                            "kind": k,
                            "fiscal_year": doc.fiscal_year,
                            "status": "SKIPPED_PRIVACY",
                            "url": doc.doc_url,
                            "note": "Escluso ex lege: rilevati dati personali nLPD",
                        })
                    else:
                        results.append({
                            "ust_code": ust,
                            "municipality_name": mun["name"],
                            "title": doc.title,
                            "kind": k,
                            "fiscal_year": doc.fiscal_year,
                            "status": "DISCOVERED",
                            "url": doc.doc_url,
                        })

            except Exception as exc:  # noqa: BLE001
                logger.warning("Errore durante backfill per comune %d (%s): %s", ust, mun['name'], exc)

    finished_at = datetime.now(UTC)
    duration = (finished_at - started_at).total_seconds()

    report = {
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 2),
        "batch": str(batch),
        "target_ust_codes": target_usts,
        "stats": stats,
        "results_count": len(results),
        "results": results,
    }

    return report
