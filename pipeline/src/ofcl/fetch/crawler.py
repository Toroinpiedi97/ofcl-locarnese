"""
Orchestratore di Crawling Cortese v2 per i 19 Comuni del Locarnese.

Caratteristiche non negoziabili:
1. User-Agent trasparente: 'OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)'
2. Concorrenza per-dominio (fino a 6 Comuni in parallelo, max 1 richiesta attiva per host)
   con AutoThrottle basato su latenza EWMA e Retry con rispetto di Retry-After.
3. Rispetto rigoroso di robots.txt (Protego con cache 24h) e kill-switch `active` (NFR-04).
4. Paginazione dinamica Assolo (?fric=&ris_n=&ris_pg= per C-07), discesa al 2° livello WordPress
   (Centovalli + REST API) e auto-bootstrap del token firmato &rif= per Orselina (C-03a).
5. Download in streaming dei PDF con verifica MIME/%PDF- e calcolo SHA-256 immutabile.
6. Richieste condizionali reali (ETag / If-Modified-Since tramite CrawlStateStore) e max 150 MB.
7. Deduplicazione crittografica automatica su Cloudflare R2 (`pdf/{ust_code}/{sha256}.pdf`).
8. Esclusione automatica preventiva degli atti con dati personali (nLPD, titolo + Fit-Markdown).
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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
from ofcl.fetch.robots_guard import RobotsGuard
from ofcl.fetch.state_store import CrawlStateStore, HttpDiskCache
from ofcl.fetch.throttler import PerHostAutoThrottler
from ofcl.seed_ref import enforce_corfin_guardrail
from ofcl.storage.r2 import upload_pdf_to_r2

logger = logging.getLogger(__name__)

USER_AGENT = "OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)"
MAX_PDF_SIZE_BYTES = 150 * 1024 * 1024  # 150 MB


class CorteseCrawler:
    """Orchestratore del crawling cortese v2 per i 19 Comuni del Locarnese."""

    def __init__(
        self,
        registry_yaml_path: Path,
        raw_pdf_dir: Path,
        *,
        sync_r2: bool = True,
        fast_mode: bool = False,
        max_concurrent_hosts: int = 6,
        max_pages_per_source: int = 3,
        obey_robots: bool = True,
        state_store: CrawlStateStore | None = None,
        http_cache: HttpDiskCache | None = None,
    ) -> None:
        enforce_corfin_guardrail()
        self.registry_yaml_path = registry_yaml_path
        self.raw_pdf_dir = raw_pdf_dir
        self.sync_r2 = sync_r2
        self.fast_mode = fast_mode
        self.max_concurrent_hosts = max(1, max_concurrent_hosts)
        self.max_pages_per_source = max(1, max_pages_per_source)
        self.obey_robots = obey_robots

        self.state_store = state_store or CrawlStateStore()
        self.http_cache = http_cache or HttpDiskCache(enabled=False)
        self.robots_guard = RobotsGuard(
            user_agent=USER_AGENT,
            obey_robots=obey_robots,
        )
        self.throttler = PerHostAutoThrottler(
            max_concurrent_hosts=self.max_concurrent_hosts,
            fast_mode=self.fast_mode,
        )

        # Contatori metriche operativi
        self.sources_scanned: int = 0
        self.sources_failed: int = 0
        self.uploads_failed: int = 0
        self.robots_denied: int = 0

        loaded = yaml.safe_load(registry_yaml_path.read_text(encoding="utf-8"))
        self.municipalities: list[dict[str, Any]] = loaded if isinstance(loaded, list) else []

    def get_municipality_by_ust(self, ust_code: int) -> dict[str, Any] | None:
        """Restituisce la configurazione di un comune dato il codice UST."""
        for m in self.municipalities:
            if m.get("ust_code") == ust_code:
                return m
        return None

    async def _request(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        *,
        respect_robots: bool = True,
        use_cache: bool = True,
        min_delay_s: float = 0.0,
        headers: dict[str, str] | None = None,
        timeout: float = 30.0,
        **kwargs: Any,
    ) -> httpx.Response:
        """
        Gateway HTTP unificato.
        1. Validazione schema URL.
        2. Controllo robots.txt (con guardrail specifici).
        3. Consultazione HttpDiskCache (se GET).
        4. AutoThrottling per host e rispetto Crawl-delay.
        5. Esecuzione richiesta HTTP.
        6. Controllo redirect cross-host contro robots.txt.
        7. Aggiornamento HttpDiskCache.
        """
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Schema URL non valido o non supportato: {url!r}")

        # 2. Controllo Robots.txt preventivo
        if (
            respect_robots
            and self.obey_robots
            and not await self.robots_guard.can_fetch(url, client)
        ):
            self.robots_denied += 1
            req = httpx.Request(method, url)
            return httpx.Response(status_code=403, request=req, text="")

        # 3. Consultazione cache per richieste GET
        if use_cache and method.upper() == "GET":
            cached = self.http_cache.get(url)
            if cached is not None:
                req = httpx.Request(method, url)
                return httpx.Response(
                    status_code=int(cached.get("status_code", 200)),
                    request=req,
                    text=str(cached.get("text", "")),
                    headers={"x-ofcl-cache": "HIT"},
                )

        # 4. Calcolo del delay effettivo per host
        effective_delay = (
            0.0
            if self.fast_mode
            else (
                await self.robots_guard.get_effective_delay(url, min_delay_s, client)
                if respect_robots and self.obey_robots
                else min_delay_s
            )
        )

        req_headers = {"User-Agent": USER_AGENT, **(headers or {})}
        resp = await self.throttler.request(
            client,
            method,
            url,
            min_delay_s=effective_delay,
            headers=req_headers,
            timeout=timeout,
            **kwargs,
        )

        # 5. Verifica eventuale redirect cross-host
        final_url_str = str(resp.url)
        final_host = urlparse(final_url_str).netloc.lower()
        orig_host = parsed.netloc.lower()
        if (
            final_host != orig_host
            and respect_robots
            and self.obey_robots
            and not await self.robots_guard.can_fetch(final_url_str, client)
        ):
            self.robots_denied += 1
            req = httpx.Request(method, final_url_str)
            return httpx.Response(status_code=403, request=req, text="")

        # 6. Aggiornamento cache
        if use_cache and method.upper() == "GET" and resp.status_code == 200 and resp.text:
            self.http_cache.put(url, resp.status_code, resp.text, final_url_str)

        return resp

    async def _fetch_text_polite(
        self,
        url: str,
        client: httpx.AsyncClient,
        *,
        min_delay_s: float,
    ) -> tuple[int, str, str]:
        """
        Scarica una pagina HTML/JSON attraverso il gateway _request.
        Restituisce (status_code, text, final_url).
        """
        resp = await self._request(
            client,
            "GET",
            url,
            respect_robots=True,
            use_cache=True,
            min_delay_s=min_delay_s,
        )
        return resp.status_code, resp.text, str(resp.url)

    async def check_canary(
        self,
        m: dict[str, Any],
        client: httpx.AsyncClient,
    ) -> tuple[bool, int, str | None]:
        """Verifica la salute dell'URL canarino (Guardrail C-13 anti-drift) tramite _request."""
        canary_url = m.get("canary_url")
        if not canary_url:
            return True, 200, None

        try:
            resp = await self._request(
                client,
                "HEAD",
                canary_url,
                respect_robots=True,
                use_cache=False,
                timeout=15.0,
                follow_redirects=True,
            )
            if resp.status_code == 405:  # Method Not Allowed -> fallback GET
                resp = await self._request(
                    client,
                    "GET",
                    canary_url,
                    respect_robots=True,
                    use_cache=False,
                    timeout=15.0,
                    follow_redirects=True,
                )
            if resp.status_code < 400:
                return True, resp.status_code, None
            return False, resp.status_code, f"HTTP {resp.status_code}"
        except Exception as exc:
            logger.warning(
                "Canary check fallito per %s (%s): %s",
                m.get("name"),
                canary_url,
                exc,
                exc_info=True,
            )
            return False, 0, str(exc)

    async def _scan_assolo_source(
        self,
        src: dict[str, Any],
        ust_code: int,
        slug: str,
        min_delay_s: float,
        client: httpx.AsyncClient,
        *,
        max_docs: int,
    ) -> list[DiscoveredDocument]:
        """Scansiona una fonte Assolo con supporto a params (fric, ris_n) e paginazione ris_pg (C-07)."""
        base_url = str(src["url"])
        params = src.get("params") if isinstance(src.get("params"), dict) else None
        collected: list[DiscoveredDocument] = []
        seen_doc_urls: set[str] = set()

        for page_num in range(1, self.max_pages_per_source + 1):
            page_url = AssoloConnector.build_page_url(base_url, params, page=page_num)
            status, html, final_url = await self._fetch_text_polite(
                page_url,
                client,
                min_delay_s=min_delay_s,
            )
            if status != 200 or not html:
                break

            page_docs = AssoloConnector.parse_index(html, final_url, ust_code, slug)
            new_on_page = 0
            for d in page_docs:
                if d.doc_url not in seen_doc_urls:
                    seen_doc_urls.add(d.doc_url)
                    collected.append(d)
                    new_on_page += 1

            # Se la pagina non produce nuovi documenti o non ci sono params/paginazione ulteriori, interrompe
            if new_on_page == 0 or len(collected) >= max_docs:
                break
            # Rileva se nel DOM compare effettivamente un link alla pagina successiva
            if f"ris_pg={page_num + 1}" not in html and not params:
                break

        return collected

    async def _scan_wordpress_source(
        self,
        src: dict[str, Any],
        ust_code: int,
        slug: str,
        min_delay_s: float,
        client: httpx.AsyncClient,
        *,
        max_docs: int,
    ) -> list[DiscoveredDocument]:
        """
        Scansiona una fonte WordPress:
        1. Se strategy == 'wordpress_rest', interroga `/wp-json/wp/v2/posts` (+ `/media`).
        2. Altrimenti scarica l'indice HTML e, per i post di 1° livello senza link PDF diretto
           (`metadata['is_direct_pdf'] == False`, es. Centovalli), scende al 2° livello per
           estrarre i PDF allegati, il Fit-Markdown e verificare i dati personali nLPD.
        """
        url = str(src["url"])
        strategy = str(src.get("strategy", "wordpress_html"))

        if strategy == "wordpress_rest":
            parsed = urlparse(url)
            origin = f"{parsed.scheme or 'https'}://{parsed.netloc}"
            posts_api = f"{origin}/wp-json/wp/v2/posts?per_page={min(max_docs * 2, 50)}"
            media_api = f"{origin}/wp-json/wp/v2/media?mime_type=application/pdf&per_page=100"
            status, posts_text, _ = await self._fetch_text_polite(
                posts_api, client, min_delay_s=min_delay_s
            )
            if status == 200 and posts_text:
                import json

                try:
                    posts_data = json.loads(posts_text)
                    media_data: list[dict[str, Any]] | None = None
                    m_status, m_text, _ = await self._fetch_text_polite(
                        media_api, client, min_delay_s=min_delay_s
                    )
                    if m_status == 200 and m_text:
                        parsed_media = json.loads(m_text)
                        if isinstance(parsed_media, list):
                            media_data = parsed_media
                    if isinstance(posts_data, list):
                        rest_docs = WordPressConnector.parse_wp_rest_posts(
                            posts_data, media_data, origin, ust_code, slug
                        )
                        if rest_docs:
                            return rest_docs
                except Exception:  # noqa: BLE001, S110
                    pass

        status, html, final_url = await self._fetch_text_polite(
            url, client, min_delay_s=min_delay_s
        )
        if status != 200 or not html:
            return []

        first_level = WordPressConnector.parse_index(html, final_url, ust_code, slug)
        resolved_docs: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for doc in first_level:
            if doc.metadata.get("is_direct_pdf", True):
                if doc.doc_url not in seen_urls:
                    seen_urls.add(doc.doc_url)
                    resolved_docs.append(doc)
            else:
                # Discesa al 2° livello (pagina articolo trattanda)
                p_status, p_html, _ = await self._fetch_text_polite(
                    doc.doc_url, client, min_delay_s=min_delay_s
                )
                if p_status == 200 and p_html:
                    second_level = WordPressConnector.resolve_post_page(p_html, doc)
                    if second_level:
                        for child in second_level:
                            if child.doc_url not in seen_urls:
                                seen_urls.add(child.doc_url)
                                resolved_docs.append(child)
                        continue
                # Fallback se la pagina di 2° livello non è raggiungibile nei mock/test
                if doc.doc_url not in seen_urls:
                    seen_urls.add(doc.doc_url)
                    resolved_docs.append(doc)

            if len(resolved_docs) >= max_docs:
                break

        return resolved_docs

    async def _scan_orselina_source(
        self,
        src: dict[str, Any],
        ust_code: int,
        slug: str,
        min_delay_s: float,
        client: httpx.AsyncClient,
    ) -> list[DiscoveredDocument]:
        """
        Scansiona Orselina preservando il token &rif= e, in caso di HTTP 404 (token scaduto),
        esegue l'auto-bootstrap dalla homepage `/` per recuperare il nuovo link firmato (Fix C-03a).
        """
        url = str(src["url"])
        status, html, final_url = await self._fetch_text_polite(
            url, client, min_delay_s=min_delay_s
        )
        if status == 200 and html:
            docs = OrselinaConnector.parse_index(html, final_url, ust_code, slug)
            if docs:
                return docs

        # Auto-bootstrap da homepage '/' se il token &rif= statico è scaduto (HTTP 404 o 0 doc)
        parsed = urlparse(url)
        home_url = f"{parsed.scheme or 'https'}://{parsed.netloc}/"
        h_status, h_html, h_final = await self._fetch_text_polite(
            home_url, client, min_delay_s=min_delay_s
        )
        if h_status != 200 or not h_html:
            return []

        signed_nodes = OrselinaConnector.discover_signed_nodes_from_home(h_html, h_final)
        collected: list[DiscoveredDocument] = []
        seen: set[str] = set()
        for node_url in signed_nodes[:3]:
            n_status, n_html, n_final = await self._fetch_text_polite(
                node_url, client, min_delay_s=min_delay_s
            )
            if n_status == 200 and n_html:
                for d in OrselinaConnector.parse_index(n_html, n_final, ust_code, slug):
                    if d.doc_url not in seen:
                        seen.add(d.doc_url)
                        collected.append(d)
        return collected

    async def scan_municipality(
        self,
        m: dict[str, Any],
        client: httpx.AsyncClient,
        *,
        max_docs_per_source: int = 15,
        since_date: str | None = None,
    ) -> list[DiscoveredDocument]:
        """Scansiona le fonti di un singolo comune rispettando il crawl-delay e i guardrail."""
        if not m.get("active", True):
            return []

        ust_code = int(m["ust_code"])
        slug = str(m["slug"])
        cms_family = str(m["cms_family"])
        crawl_delay = float(m.get("robots", {}).get("crawl_delay_s", 2))
        min_delay = 0.0 if self.fast_mode else crawl_delay

        discovered: list[DiscoveredDocument] = []

        for src in m.get("sources", []):
            url = str(src["url"])
            self.sources_scanned += 1
            try:
                docs: list[DiscoveredDocument] = []
                if cms_family == "ASSOLO":
                    docs = await self._scan_assolo_source(
                        src,
                        ust_code,
                        slug,
                        min_delay,
                        client,
                        max_docs=max_docs_per_source,
                    )
                elif cms_family == "WORDPRESS":
                    docs = await self._scan_wordpress_source(
                        src,
                        ust_code,
                        slug,
                        min_delay,
                        client,
                        max_docs=max_docs_per_source,
                    )
                elif cms_family == "CUSTOM_PHP":
                    docs = await self._scan_orselina_source(
                        src,
                        ust_code,
                        slug,
                        min_delay,
                        client,
                    )
                elif cms_family == "JOOMLA":
                    status, html, final_url = await self._fetch_text_polite(
                        url, client, min_delay_s=min_delay
                    )
                    if status == 200 and html:
                        docs = JoomlaConnector.parse_index(html, final_url, ust_code, slug)
                elif cms_family == "CITY_LOCARNO":
                    status, html, final_url = await self._fetch_text_polite(
                        url, client, min_delay_s=min_delay
                    )
                    if status == 200 and html:
                        docs = LocarnoConnector.parse_index(html, final_url, ust_code, slug)

                # Filtro facoltativo per data / anno
                if since_date:
                    try:
                        since_year = int(since_date.split("-")[0])
                        docs = [d for d in docs if (d.fiscal_year or 9999) >= since_year]
                    except ValueError:
                        pass

                discovered.extend(docs[:max_docs_per_source])

            except Exception as exc:
                self.sources_failed += 1
                logger.warning(
                    "Errore scansione fonte %s per UST %s (%s): %s",
                    url,
                    ust_code,
                    slug,
                    exc,
                    exc_info=True,
                )
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
        1. Supporto richieste condizionali (If-None-Match, If-Modified-Since) via CrawlStateStore.
        2. Verifica robots.txt / guardrail Locarno C-02 e privacy nLPD.
        3. Limite rigido di dimensione max 150 MB.
        4. Verifica firma %PDF- nel chunk iniziale.
        5. Calcolo SHA-256 e salvataggio in data/raw_pdfs/{ust_code}/{sha256}.pdf.
        6. Upload e deduplicazione su Cloudflare R2 (se abilitato).
        """
        parsed_doc = urlparse(doc.doc_url)
        if parsed_doc.scheme not in ("http", "https"):
            return DownloadResult(
                doc=doc,
                status="ERROR",
                error=f"Schema URL non supportato: {doc.doc_url}",
            )

        # 1. Esclude preventivamente i documenti con dati personali nLPD
        if doc.contains_personal_data:
            return DownloadResult(
                doc=doc,
                status="SKIPPED_PRIVACY",
                error="Documento escluso preventivamente: contiene dati personali (nLPD/LPDP)",
            )

        # 2. Per Locarno o percorsi bloccati da robots.txt rispetta il divieto
        if doc.metadata.get("locarno_disallow_guard") or not await self.robots_guard.can_fetch(
            doc.doc_url, client
        ):
            self.robots_denied += 1
            return DownloadResult(
                doc=doc,
                status="SKIPPED_GUARD",
                error="Download automatico escluso da robots.txt: richiede autorizzazione scritta",
            )

        # 3. Throttling preventivo per host prima dello streaming
        effective_min_delay = (
            0.0
            if self.fast_mode
            else await self.robots_guard.get_effective_delay(doc.doc_url, 1.0, client)
        )
        host = parsed_doc.netloc.lower() or "default"
        await self.throttler.acquire(host, min_delay_s=effective_min_delay)

        # Recupera eventuale stato precedente dallo store se non passato esplicitamente
        prior_state = self.state_store.get(doc.doc_url)
        effective_etag = etag or (prior_state.etag if prior_state else None)
        effective_ims = if_modified_since or (prior_state.last_modified if prior_state else None)

        headers = {"User-Agent": USER_AGENT}
        if effective_etag:
            headers["If-None-Match"] = effective_etag
        if effective_ims:
            headers["If-Modified-Since"] = effective_ims

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
                    self.state_store.update_url(
                        doc.doc_url,
                        doc.ust_code,
                        etag=effective_etag,
                        last_modified=effective_ims,
                        status="NOT_MODIFIED",
                    )
                    self.state_store.save()
                    return DownloadResult(
                        doc=doc,
                        status="NOT_MODIFIED",
                        etag=effective_etag,
                        last_modified=effective_ims,
                        sha256=prior_state.sha256 if prior_state else None,
                        size_bytes=prior_state.size_bytes if prior_state else 0,
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
                resp_last_mod = resp.headers.get("last-modified")

                dest_dir = self.raw_pdf_dir / str(doc.ust_code)
                dest_dir.mkdir(parents=True, exist_ok=True)
                target_path = dest_dir / f"{sha256}.pdf"

                already_cached = target_path.exists()
                if not already_cached:
                    target_path.write_bytes(b"".join(chunks))

                r2_key: str | None = None
                if self.sync_r2:
                    try:
                        r2_key = upload_pdf_to_r2(target_path, doc.ust_code, sha256)
                    except Exception as exc:
                        self.uploads_failed += 1
                        logger.warning(
                            "Upload R2 fallito per %s (UST %s): %s",
                            target_path,
                            doc.ust_code,
                            exc,
                            exc_info=True,
                        )

                final_status: DownloadStatus = "CACHED" if already_cached else "DOWNLOADED"
                self.state_store.update_url(
                    doc.doc_url,
                    doc.ust_code,
                    etag=resp_etag,
                    last_modified=resp_last_mod,
                    sha256=sha256,
                    size_bytes=total_bytes,
                    status=final_status,
                )
                self.state_store.save()

                return DownloadResult(
                    doc=doc,
                    status=final_status,
                    sha256=sha256,
                    size_bytes=total_bytes,
                    local_path=target_path,
                    r2_key=r2_key,
                    etag=resp_etag,
                    last_modified=resp_last_mod,
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
        if not m.get("active", True):
            return []

        discovered = await self.scan_municipality(
            m,
            client,
            max_docs_per_source=max_docs,
            since_date=since_date,
        )

        results: list[DownloadResult] = []
        download_delay = (
            0.0 if self.fast_mode else float(m.get("robots", {}).get("crawl_delay_s", 2))
        )

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
                    host = urlparse(doc.doc_url).netloc.lower() or "default"
                    await asyncio.sleep(self.throttler.compute_delay(host, download_delay))
                prior = self.state_store.get(doc.doc_url)
                res = await self.download_pdf_stream(
                    doc,
                    client,
                    etag=prior.etag if prior else None,
                    if_modified_since=prior.last_modified if prior else None,
                )
                results.append(res)

        self.state_store.mark_municipality_completed(int(m["ust_code"]))
        return results

    async def crawl_all(
        self,
        *,
        ust_filter: int | None = None,
        dry_run: bool = False,
        max_docs: int = 15,
        since_date: str | None = None,
        resume: bool = False,
    ) -> dict[str, Any]:
        """
        Esegue il crawling su tutti i 19 Comuni (in parallelo controllato tra domini distinti,
        max `max_concurrent_hosts` simultanei e max 1 req attiva per singolo Comune).
        """
        target_comuni = (
            [m for m in self.municipalities if m.get("ust_code") == ust_filter]
            if ust_filter
            else [m for m in self.municipalities if m.get("active", True)]
        )

        if not resume:
            self.state_store.reset_completed_usts()
        else:
            target_comuni = [
                m
                for m in target_comuni
                if not self.state_store.is_municipality_completed(int(m["ust_code"]))
            ]

        started_at = datetime.now(UTC)
        all_results: list[DownloadResult] = []
        canary_reports: list[dict[str, Any]] = []
        mun_sem = asyncio.Semaphore(self.max_concurrent_hosts)

        async with httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT},
            follow_redirects=True,
        ) as client:

            async def _worker(m: dict[str, Any]) -> tuple[dict[str, Any], list[DownloadResult]]:
                async with mun_sem:
                    canary_ok, canary_code, canary_err = await self.check_canary(m, client)
                    c_report = {
                        "ust_code": m["ust_code"],
                        "name": m["name"],
                        "canary_url": m.get("canary_url"),
                        "ok": canary_ok,
                        "status_code": canary_code,
                        "error": canary_err,
                    }
                    res = await self.crawl_municipality(
                        m,
                        client,
                        dry_run=dry_run,
                        max_docs=max_docs,
                        since_date=since_date,
                    )
                    return c_report, res

            worker_outputs = await asyncio.gather(*(_worker(m) for m in target_comuni))
            for c_rep, m_res in worker_outputs:
                canary_reports.append(c_rep)
                all_results.extend(m_res)

        finished_at = datetime.now(UTC)
        duration_s = (finished_at - started_at).total_seconds()

        status_counts: dict[str, int] = {}
        selector_relocations: list[dict[str, Any]] = []
        for r in all_results:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1
            if r.doc.selector_relocated:
                selector_relocations.append(
                    {
                        "ust_code": r.doc.ust_code,
                        "municipality_slug": r.doc.municipality_slug,
                        "page_url": r.doc.page_url,
                        "doc_url": r.doc.doc_url,
                    }
                )

        total_bytes = sum(r.size_bytes for r in all_results)

        report = {
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "duration_seconds": round(duration_s, 2),
            "dry_run": dry_run,
            "target_municipalities_count": len(target_comuni),
            "total_discovered_docs": len(all_results),
            "sources_scanned": self.sources_scanned,
            "sources_failed": self.sources_failed,
            "uploads_failed": self.uploads_failed,
            "robots_denied": self.robots_denied,
            "status_counts": status_counts,
            "canary_checks": canary_reports,
            "selector_relocations": selector_relocations,
            "throttler_metrics": self.throttler.get_metrics_summary(),
            "total_bytes_downloaded": total_bytes,
            "results": [
                {
                    "ust_code": r.doc.ust_code,
                    "title": r.doc.title,
                    "kind": r.doc.doc_kind,
                    "fiscal_year": r.doc.fiscal_year,
                    "published_date": (
                        r.doc.published_date.isoformat() if r.doc.published_date else None
                    ),
                    "url": r.doc.doc_url,
                    "status": r.status,
                    "sha256": r.sha256,
                    "size_bytes": r.size_bytes,
                    "r2_key": r.r2_key,
                    "selector_relocated": r.doc.selector_relocated,
                    "error": r.error,
                }
                for r in all_results
            ],
        }
        return report
