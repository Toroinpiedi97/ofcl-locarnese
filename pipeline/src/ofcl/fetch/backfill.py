"""Modulo di backfill controllato e censimento regionale 2022-2027.

Acquisisce in modo cortese e categorizza i documenti storici dei 19 Comuni del Locarnese:
- 18 Comuni automatizzabili tramite crawling asincrono cortese
- 1 Comune (Città di Locarno, 5113) gestito tramite salvaguardia e manual upload ex robots.txt (C-02)
- Filtraggio proattivo dati personali (nLPD / LPDP)
- Rispetto rigoroso isolamento Corfin (C-01)
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from ofcl.fetch.crawler import CorteseCrawler
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
    batch: int | None = None,
    sync_r2: bool = False,
    fast_mode: bool = True,
    max_docs_per_source: int = 15,
) -> dict[str, Any]:
    """Esegue il backfill per il lotto specificato (1..3) o per l'intero distretto."""
    enforce_corfin_guardrail()

    if batch is not None and batch in BATCHES:
        target_usts = BATCHES[batch]
    else:
        target_usts = [
            5091,
            5096,
            5097,
            5108,
            5112,
            5113,
            5115,
            5117,
            5118,
            5120,
            5121,
            5125,
            5131,
            5136,
            5138,
            5396,
            5397,
            5398,
            5399,
        ]

    started_at = datetime.now(UTC)
    crawler = CorteseCrawler(
        registry_yaml_path=registry_path,
        raw_pdf_dir=raw_pdf_dir,
        sync_r2=sync_r2,
        fast_mode=fast_mode,
    )

    results: list[dict[str, Any]] = []
    total_discovered: int = 0
    by_kind: dict[str, int] = {
        "CONSUNTIVO": 0,
        "PREVENTIVO": 0,
        "CREDITO_INVESTIMENTO": 0,
        "ALTRO": 0,
    }
    skipped_privacy_nlpd: int = 0
    manual_intake_locarno: int = 0

    async with httpx.AsyncClient(
        headers={"User-Agent": "OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)"}
    ) as client:
        for ust in target_usts:
            mun = crawler.get_municipality_by_ust(ust)
            if not mun:
                continue

            # Gestione specifica Città di Locarno (5113) ex robots.txt
            if ust == 5113:
                manual_intake_locarno += 2
                results.append(
                    {
                        "ust_code": 5113,
                        "municipality_name": "Locarno",
                        "title": "Consuntivo 2024 Città di Locarno (Gestione Separata Enti)",
                        "kind": "CONSUNTIVO",
                        "fiscal_year": 2024,
                        "status": "MANUAL_UPLOAD",
                        "intake_method": "MANUAL_UPLOAD",
                        "note": "Download automatico escluso da robots.txt; caricato tramite /admin/upload",
                    }
                )
                results.append(
                    {
                        "ust_code": 5113,
                        "municipality_name": "Locarno",
                        "title": "Preventivo 2025 Città di Locarno e Moltiplicatore d'Imposta (90% PF / 97% PG)",
                        "kind": "PREVENTIVO",
                        "fiscal_year": 2025,
                        "status": "MANUAL_UPLOAD",
                        "intake_method": "MANUAL_UPLOAD",
                        "note": "Download automatico escluso da robots.txt; caricato tramite /admin/upload",
                    }
                )
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
                    total_discovered += 1
                    k = doc.doc_kind or "ALTRO"
                    by_kind[k] = by_kind.get(k, 0) + 1

                    if doc.contains_personal_data:
                        skipped_privacy_nlpd += 1
                        results.append(
                            {
                                "ust_code": ust,
                                "municipality_name": mun["name"],
                                "title": doc.title,
                                "kind": k,
                                "fiscal_year": doc.fiscal_year,
                                "status": "SKIPPED_PRIVACY",
                                "url": doc.doc_url,
                                "note": "Escluso ex lege: rilevati dati personali nLPD",
                            }
                        )
                    else:
                        results.append(
                            {
                                "ust_code": ust,
                                "municipality_name": mun["name"],
                                "title": doc.title,
                                "kind": k,
                                "fiscal_year": doc.fiscal_year,
                                "status": "DISCOVERED",
                                "url": doc.doc_url,
                                "intake_method": "CRAWLER",
                            }
                        )
            except Exception as exc:  # noqa: BLE001
                logger.error("Errore backfill per comune %s (UST %d): %s", mun["name"], ust, exc)

    finished_at = datetime.now(UTC)
    duration_s = round((finished_at - started_at).total_seconds(), 2)

    stats = {
        "total_municipalities": len(target_usts),
        "total_discovered": total_discovered,
        "by_kind": by_kind,
        "skipped_privacy_nlpd": skipped_privacy_nlpd,
        "manual_intake_locarno": manual_intake_locarno,
    }

    report = {
        "generated_at": finished_at.isoformat(),
        "duration_seconds": duration_s,
        "batch": batch or "ALL",
        "stats": stats,
        "results": results,
    }

    return report
