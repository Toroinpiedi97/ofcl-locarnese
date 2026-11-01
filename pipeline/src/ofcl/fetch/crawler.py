"""
Orchestratore di Crawling Cortese per i 19 Comuni del Locarnese.

Caratteristiche non negoziabili:
1. User-Agent trasparente: 'OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)'
2. Rispetto del Crawl-delay minimo di ciascun Comune (2s..30s) tra chiamate consecutive.
3. Riconoscimento delle 5 famiglie CMS (Assolo, WordPress, Joomla, PHP Orselina, Locarno).
4. Download in streaming dei PDF con verifica MIME e calcolo SHA-256 immutabile.
5. Richieste condizionali (ETag / If-Modified-Since) e controllo capienza max 150 MB.
6. Deduplicazione crittografica automatica su Cloudflare R2 (`pdf/{ust_code}/{sha256}.pdf`).
7. Esclusione automatica preventiva degli atti con dati personali (nLPD).
"""

from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

from ofcl.fetch.connectors import (
    AssoloConnector,
    JoomlaConnector,
    LocarnoConnector,
    OrselinaConnector,
    WordPressConnector,
)
from ofcl.fetch.models import DiscoveredDocument, DownloadResult, DownloadStatus
from ofcl.seed_ref import enforce_corfin_guardrail
from ofcl.storage.r2 import upload_pdf_to_r2

USER_AGENT = "OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)"
MAX_PDF_SIZE_BYTES = 150 * 1024 * 1024  # 150 MB


class CorteseCrawler:
    """Orchestratore del crawling cortese per i 19 Comuni."""

    def __init__(
        self,
        registry_yaml_path: Path,
        raw_pdf_dir: Path,
        *,
        sync_r2: bool = True,
        fast_mode: bool = False,
    ) -> None:
        enforce_corfin_guardrail()
        self.registry_yaml_path = registry_yaml_path
        self.raw_pdf_dir = raw_pdf_dir
        self.sync_r2 = sync_r2
        self.fast_mode = fast_mode
        self.municipalities: list[dict[str, Any]] = yaml.safe_load(
            registry_yaml_path.read_text(encoding="utf-8")
        )

    def get_municipality_by_ust(self, ust_code: int) -> dict[str, Any] | None:
        """Restituisce la configurazione di un comune dato il codice UST."""
        for m in self.municipalities:
            if m["ust_code"] == ust_code:
                return m
        return None

    async def check_canary(
        self,
        m: dict[str, Any],
        client: httpx.AsyncClient,
    ) -> tuple[bool, int, str | None]:
        """Verifica la salute dell'URL canarino (Guardrail C-13 anti-drift)."""
        canary_url = m.get("canary_url")
        if not canary_url:
            return True, 200, None

        try:
            resp = await client.head(canary_url, timeout=15.0, follow_redirects=True)
            if resp.status_code == 405:  # Method Not Allowed -> fallback GET
                resp = await client.get(canary_url, timeout=15.0, follow_redirects=True)
            if resp.status_code < 400:
                return True, resp.status_code, None
            return False, resp.status_code, f"HTTP {resp.status_code}"
        except Exception as exc:  # noqa: BLE001
            return False, 0, str(exc)

    async def scan_municipality(
        self,
        m: dict[str, Any],
        client: httpx.AsyncClient,
        *,
        max_docs_per_source: int = 15,
        since_date: str | None = None,
    ) -> list[DiscoveredDocument]:
        """Scansiona le fonti di un singolo comune rispettando il crawl-delay reale."""
        ust_code = m["ust_code"]
        slug = m["slug"]
        cms_family = m["cms_family"]
        crawl_delay = m.get("robots", {}).get("crawl_delay_s", 2)
        delay = 0 if self.fast_mode else crawl_delay
        discovered: list[DiscoveredDocument] = []

        for src in m.get("sources", []):
            url = src["url"]
            try:
                # Rispetto del Crawl-delay prima di ciascuna richiesta
                if delay > 0:
                    await asyncio.sleep(delay)

                resp = await client.get(url, timeout=30.0, follow_redirects=True)
                if resp.status_code != 200:
                    continue

                html = resp.text
                docs: list[DiscoveredDocument] = []

                if cms_family == "ASSOLO":
                    docs = AssoloConnector.parse_index(html, str(resp.url), ust_code, slug)
                elif cms_family == "WORDPRESS":
                    docs = WordPressConnector.parse_index(html, str(resp.url), ust_code, slug)
                elif cms_family == "JOOMLA":
                    docs = JoomlaConnector.parse_index(html, str(resp.url), ust_code, slug)
                elif cms_family == "CUSTOM_PHP":
                    docs = OrselinaConnector.parse_index(html, str(resp.url), ust_code, slug)
                elif cms_family == "CITY_LOCARNO":
                    docs = LocarnoConnector.parse_index(html, str(resp.url), ust_code, slug)

                # Filtro facoltativo per data / anno
                if since_date:
                    try:
                        since_year = int(since_date.split("-")[0])
                        docs = [d for d in docs if (d.fiscal_year or 9999) >= since_year]
                    except ValueError:
                        pass

                discovered.extend(docs[:max_docs_per_source])

            except Exception:  # noqa: BLE001, S112
                continue

        return discovered

    async def download_pdf_stream(
        self,
        doc: DiscoveredDocument,
        client: httpx.AsyncClient,
        *,
        etag: str | None = None,
        if_modified_since: str | None = None,
    ) -> DownloadResult:
        """
        Scarica il PDF in streaming con:
        1. Supporto richieste condizionali (If-None-Match, If-Modified-Since).
        2. Limite rigido di dimensione max 150 MB.
        3. Verifica firma %PDF- nel chunk iniziale.
        4. Calcolo SHA-256 e salvataggio in data/raw_pdfs/{ust_code}/{sha256}.pdf.
        5. Upload e deduplicazione su Cloudflare R2 (se abilitato).
        """
        # Esclude preventivamente i documenti con dati personali nLPD
        if doc.contains_personal_data:
            return DownloadResult(
                doc=doc,
                status="SKIPPED_PRIVACY",
                error="Documento escluso preventivamente: contiene dati personali (nLPD/LPDP)",
            )

        # Per Locarno rispetta il divieto di download massivo automatico
        if doc.metadata.get("locarno_disallow_guard"):
            return DownloadResult(
                doc=doc,
                status="SKIPPED_GUARD",
                error="Download automatico escluso da robots.txt: richiede autorizzazione scritta",
            )

        headers = {"User-Agent": USER_AGENT}
        if etag:
            headers["If-None-Match"] = etag
        if if_modified_since:
            headers["If-Modified-Since"] = if_modified_since

        try:
            async with client.stream(
                "GET",
                doc.doc_url,
                headers=headers,
                timeout=45.0,
                follow_redirects=True,
            ) as resp:
                # 304 Not Modified
                if resp.status_code == 304:
                    return DownloadResult(
                        doc=doc,
                        status="NOT_MODIFIED",
                        etag=etag,
                    )

                if resp.status_code != 200:
                    return DownloadResult(
                        doc=doc,
                        status="ERROR",
                        error=f"HTTP {resp.status_code}: {resp.reason_phrase}",
                    )

                # Controllo Content-Length preventivo
                content_len = resp.headers.get("content-length")
                if content_len:
                    try:
                        total_declared = int(content_len)
                        if total_declared > MAX_PDF_SIZE_BYTES:
                            return DownloadResult(
                                doc=doc,
                                status="TOO_LARGE",
                                size_bytes=total_declared,
                                error=f"File dichiarato {total_declared} byte supera il limite di 150MB",
                            )
                    except ValueError:
                        pass

                hasher = hashlib.sha256()
                chunks: list[bytes] = []
                total_bytes = 0
                is_first_chunk = True

                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    if not chunk:
                        continue

                    # Verifica firma %PDF- sul primo chunk
                    if is_first_chunk:
                        is_first_chunk = False
                        if not chunk.startswith(b"%PDF-"):
                            return DownloadResult(
                                doc=doc,
                                status="INVALID_PDF",
                                error="Il contenuto scaricato non inizia con la firma PDF (%PDF-)",
                            )

                    total_bytes += len(chunk)
                    if total_bytes > MAX_PDF_SIZE_BYTES:
                        return DownloadResult(
                            doc=doc,
                            status="TOO_LARGE",
                            size_bytes=total_bytes,
                            error=f"Download interrotto: supera il limite di 150MB ({total_bytes} byte)",
                        )

                    hasher.update(chunk)
                    chunks.append(chunk)

                sha256 = hasher.hexdigest()
                resp_etag = resp.headers.get("etag")

                dest_dir = self.raw_pdf_dir / str(doc.ust_code)
                dest_dir.mkdir(parents=True, exist_ok=True)
                target_path = dest_dir / f"{sha256}.pdf"

                # Se già esistente su disco locale
                already_cached = target_path.exists()
                if not already_cached:
                    target_path.write_bytes(b"".join(chunks))

                # Deduplicazione ed eventuale upload su Cloudflare R2
                r2_key: str | None = None
                if self.sync_r2:
                    try:
                        r2_key = upload_pdf_to_r2(target_path, doc.ust_code, sha256)
                    except Exception:  # noqa: BLE001, S110
                        # Fallback non bloccante se R2 non è raggiungibile offline
                        pass

                return DownloadResult(
                    doc=doc,
                    status="CACHED" if already_cached else "DOWNLOADED",
                    sha256=sha256,
                    size_bytes=total_bytes,
                    local_path=target_path,
                    r2_key=r2_key,
                    etag=resp_etag,
                )

        except Exception as exc:  # noqa: BLE001
            return DownloadResult(
                doc=doc,
                status="ERROR",
                error=str(exc),
            )

    async def crawl_municipality(
        self,
        m: dict[str, Any],
        client: httpx.AsyncClient,
        *,
        dry_run: bool = False,
        max_docs: int = 15,
        since_date: str | None = None,
    ) -> list[DownloadResult]:
        """Esegue il ciclo completo di discovery e download per un singolo comune."""
        discovered = await self.scan_municipality(
            m,
            client,
            max_docs_per_source=max_docs,
            since_date=since_date,
        )

        results: list[DownloadResult] = []
        download_delay = 0 if self.fast_mode else m.get("robots", {}).get("crawl_delay_s", 2)

        for i, doc in enumerate(discovered):
            if dry_run:
                status: DownloadStatus
                if doc.contains_personal_data:
                    status = "SKIPPED_PRIVACY"
                elif doc.metadata.get("locarno_disallow_guard"):
                    status = "SKIPPED_GUARD"
                else:
                    status = "DOWNLOADED"
                results.append(
                    DownloadResult(
                        doc=doc,
                        status=status,
                    )
                )
            else:
                if i > 0 and download_delay > 0:
                    await asyncio.sleep(download_delay)
                res = await self.download_pdf_stream(doc, client)
                results.append(res)

        return results

    async def crawl_all(
        self,
        *,
        ust_filter: int | None = None,
        dry_run: bool = False,
        max_docs: int = 15,
        since_date: str | None = None,
    ) -> dict[str, Any]:
        """Esegue il crawling su tutti i 19 Comuni o su quello specificato."""
        target_comuni = (
            [m for m in self.municipalities if m["ust_code"] == ust_filter]
            if ust_filter
            else self.municipalities
        )

        started_at = datetime.now(UTC)
        all_results: list[DownloadResult] = []
        canary_reports: list[dict[str, Any]] = []

        async with httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        ) as client:
            for m in target_comuni:
                # Controllo preliminare canarino anti-drift C-13
                canary_ok, canary_code, canary_err = await self.check_canary(m, client)
                canary_reports.append(
                    {
                        "ust_code": m["ust_code"],
                        "name": m["name"],
                        "canary_url": m.get("canary_url"),
                        "ok": canary_ok,
                        "status_code": canary_code,
                        "error": canary_err,
                    }
                )

                res = await self.crawl_municipality(
                    m,
                    client,
                    dry_run=dry_run,
                    max_docs=max_docs,
                    since_date=since_date,
                )
                all_results.extend(res)

        finished_at = datetime.now(UTC)
        duration_s = (finished_at - started_at).total_seconds()

        # Calcolo metriche riassuntive
        status_counts: dict[str, int] = {}
        for r in all_results:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1

        total_bytes = sum(r.size_bytes for r in all_results)

        report = {
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_seconds": round(duration_s, 2),
            "dry_run": dry_run,
            "target_municipalities_count": len(target_comuni),
            "total_discovered_docs": len(all_results),
            "status_counts": status_counts,
            "canary_checks": canary_reports,
            "total_bytes_downloaded": total_bytes,
            "results": [
                {
                    "ust_code": r.doc.ust_code,
                    "title": r.doc.title,
                    "kind": r.doc.doc_kind,
                    "fiscal_year": r.doc.fiscal_year,
                    "url": r.doc.doc_url,
                    "status": r.status,
                    "sha256": r.sha256,
                    "size_bytes": r.size_bytes,
                    "r2_key": r.r2_key,
                    "error": r.error,
                }
                for r in all_results
            ],
        }
        return report
