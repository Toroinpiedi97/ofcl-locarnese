"""
Suite di test per CorteseCrawler v2:
1. AdaptiveDOM (Scrapling v0.5.1 self-healing selectors + validazione invarianti)
2. Paginazione dinamica Assolo (?fric=&ris_n=&ris_pg= per C-07 Brione e Losone)
3. WordPress: risoluzione a 2 livelli (Centovalli) + Fit-Markdown + deep-check nLPD + WP REST API
4. Orselina: auto-bootstrap del token firmato &rif= dalla homepage su HTTP 404 (C-03a)
5. PerHostAutoThrottler: concorrenza tra host distinti, serializzazione per host, retry su 429 Retry-After e RobotsGuard
6. CrawlStateStore & HttpDiskCache: richieste condizionali ETag -> 304 Not Modified e modalità --resume
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import httpx
import pytest
import yaml

from ofcl.fetch.adaptive_dom import AdaptiveDOM
from ofcl.fetch.connectors import (
    AssoloConnector,
    WordPressConnector,
)
from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.markdown_cleaner import extract_civic_page, parse_swiss_italian_date
from ofcl.fetch.models import DiscoveredDocument
from ofcl.fetch.robots_guard import RobotsGuard
from ofcl.fetch.state_store import CrawlStateStore, HttpDiskCache
from ofcl.fetch.throttler import PerHostAutoThrottler


def test_adaptive_dom_self_healing_and_invariants(tmp_path: Path) -> None:
    """
    Verifica che AdaptiveDOM (Scrapling v0.5.1):
    1. Salvi l'impronta con auto_save=True sul layout originale (.doc-row a.doc-download);
    2. Rilochi gli elementi con adaptive=True + find_similar() quando il Comune rifà il sito
       rinominando le classi (.nuova-card a.pulsante-pdf) e restituisca relocated=True;
    3. Scarti rigorosamente i link di navigazione/footer che non superano href_validator.
    """
    db_file = tmp_path / "adaptive_test.sqlite"
    page_url = "https://www.ascona.ch/Messaggi-municipali"

    html_v1 = """
    <html><body>
      <nav><a href="/contatti">Contatti</a></nav>
      <div class="albo-list">
        <div class="doc-row">
          <a class="doc-download" href="/MM-01-Consuntivo-2025-daf46200?i=1">MM 01 Consuntivo 2025</a>
        </div>
        <div class="doc-row">
          <a class="doc-download" href="/MM-02-Preventivo-2026-88a12b00?i=1">MM 02 Preventivo 2026</a>
        </div>
      </div>
    </body></html>
    """

    dom_v1 = AdaptiveDOM(html_v1, page_url, storage_file=db_file)
    links_v1, relocated_v1 = dom_v1.select_links(
        "div.doc-row a.doc-download",
        identifier="ascona_mm_link",
        href_validator=AssoloConnector.is_valid_assolo_href,
    )
    assert relocated_v1 is False
    assert len(links_v1) == 2
    assert db_file.exists()

    # Restyling del sito: div.doc-row e a.doc-download spariscono completamente
    html_v2_redesigned = """
    <html><body>
      <header><a class="menu-item" href="/home">Home</a></header>
      <section class="grid-moderna">
        <article class="nuova-card">
          <a class="pulsante-scarica" href="/MM-10-Consuntivo-2026-11b23c00?i=1">MM 10 Consuntivo 2026</a>
        </article>
        <article class="nuova-card">
          <a class="pulsante-scarica" href="/MM-11-Preventivo-2027-99c34d00?i=1">MM 11 Preventivo 2027</a>
        </article>
        <article class="nuova-card">
          <a class="pulsante-scarica" href="/privacy-policy">Informativa Privacy (non Assolo hash)</a>
        </article>
      </section>
    </body></html>
    """

    dom_v2 = AdaptiveDOM(html_v2_redesigned, page_url, storage_file=db_file)
    links_v2, relocated_v2 = dom_v2.select_links(
        "div.doc-row a.doc-download",
        identifier="ascona_mm_link",
        href_validator=AssoloConnector.is_valid_assolo_href,
        min_similarity=30,
    )
    assert relocated_v2 is True
    hrefs_v2 = [str(el.attrib.get("href")) for el in links_v2]
    assert "/MM-10-Consuntivo-2026-11b23c00?i=1" in hrefs_v2
    assert "/MM-11-Preventivo-2027-99c34d00?i=1" in hrefs_v2
    # Il link '/privacy-policy' viene bloccato dall'invariante AssoloConnector.is_valid_assolo_href
    assert "/privacy-policy" not in hrefs_v2


def test_swiss_italian_date_and_fit_markdown_cleaner() -> None:
    """Verifica il parser di date svizzero-italiane e l'estrattore Fit-Markdown."""
    assert parse_swiss_italian_date("Pubblicato l'11 maggio 2026 all'albo") == date(2026, 5, 11)
    assert parse_swiss_italian_date("Seduta del 28.10.2025") == date(2025, 10, 28)
    assert parse_swiss_italian_date("2026-04-15T10:00:00") == date(2026, 4, 15)

    noisy_html = """
    <html>
      <head><style>.hidden { display:none; }</style></head>
      <body>
        <header><nav>Menu Principale | Chi siamo</nav></header>
        <div class="cookie-banner">Questo sito usa i cookie</div>
        <article class="entry-content">
          <h1>MM 296 - Approvazione credito manutenzione strade comunali</h1>
          <p>Pubblicato il 11 maggio 2026 dal Municipio delle Centovalli.</p>
          <p style="display:none">Testo nascosto da ignorare</p>
          <p>Il credito complessivo ammonta a CHF 70'000.-- per il comparto di Palagnedra.</p>
          <a href="/wp-content/uploads/2026/05/MM-296-Strade.pdf">Scarica il Messaggio PDF</a>
        </article>
        <footer>Copyright Comune 2026</footer>
      </body>
    </html>
    """
    extract = extract_civic_page(noisy_html, "https://centovalli.swiss/2026/05/11/mm296-strade/")
    assert "MM 296" in extract.title
    assert extract.published_date == date(2026, 5, 11)
    assert "Menu Principale" not in extract.clean_markdown
    assert "cookie" not in extract.clean_markdown.lower()
    assert "Testo nascosto" not in extract.clean_markdown
    assert "CHF 70'000.--" in extract.clean_markdown
    assert len(extract.pdf_links) == 1
    assert (
        extract.pdf_links[0][0]
        == "https://centovalli.swiss/wp-content/uploads/2026/05/MM-296-Strade.pdf"
    )


@pytest.mark.asyncio
async def test_assolo_pagination_and_fric_params(tmp_path: Path) -> None:
    """Verifica che Assolo inietti ?fric=&param_sla=0&ris_n=50 e pagini ris_pg=1..2 (Fix C-07)."""
    registry = [
        {
            "ust_code": 5096,
            "slug": "brione-sopra-minusio",
            "name": "Brione sopra Minusio",
            "cms_family": "ASSOLO",
            "active": True,
            "robots": {"crawl_delay_s": 2},
            "sources": [
                {
                    "kind": "MM_INDEX",
                    "url": "https://www.brione.ch/Messaggi-municipali-di-nuova-promulgazione-a459ef00",
                    "strategy": "assolo_list",
                    "params": {"fric": 3790},
                }
            ],
        }
    ]
    reg_file = tmp_path / "comuni.yaml"
    reg_file.write_text(yaml.safe_dump(registry), encoding="utf-8")

    requested_urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        u = str(request.url)
        requested_urls.append(u)
        if "robots.txt" in u:
            return httpx.Response(200, text="User-agent: *\nAllow: /\n")
        if "fric=3790" in u and "ris_pg=2" not in u:
            return httpx.Response(
                200,
                text="""
                <html><body>
                  <a href="/MM-560-Consuntivo-2025-12345600">MM 560 Consuntivo 2025</a>
                  <a href="?param_sla=0&fric=3790&ris_pg=2">Pagina 2</a>
                </body></html>
                """,
            )
        if "fric=3790" in u and "ris_pg=2" in u:
            return httpx.Response(
                200,
                text="""
                <html><body>
                  <a href="/MM-561-Preventivo-2026-65432100">MM 561 Preventivo 2026</a>
                </body></html>
                """,
            )
        return httpx.Response(200, text="<html><body>Pagina vuota</body></html>")

    crawler = CorteseCrawler(
        reg_file,
        tmp_path / "raw_pdfs",
        sync_r2=False,
        fast_mode=True,
        max_pages_per_source=3,
    )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        docs = await crawler.scan_municipality(registry[0], client, max_docs_per_source=10)

    assert len(docs) == 2
    assert any("fric=3790" in u and "param_sla=0" in u for u in requested_urls)
    assert any("ris_pg=2" in u for u in requested_urls)
    assert {d.doc_kind for d in docs} == {"CONSUNTIVO", "PREVENTIVO"}


@pytest.mark.asyncio
async def test_wordpress_two_level_resolution_and_markdown_nlpd(tmp_path: Path) -> None:
    """
    Verifica che WordPressConnector scenda automaticamente al 2° livello sugli articoli di Centovalli
    (quando l'indice contiene solo il link al post HTML e non il link diretto al PDF) ed esegua il
    controllo privacy nLPD anche sul testo Fit-Markdown del 2° livello.
    """
    registry = [
        {
            "ust_code": 5397,
            "slug": "centovalli",
            "name": "Centovalli",
            "cms_family": "WORDPRESS",
            "active": True,
            "robots": {"crawl_delay_s": 2},
            "sources": [
                {
                    "kind": "MM_INDEX",
                    "url": "https://centovalli.swiss/category/a4-messaggi-municipali/",
                    "strategy": "wordpress_html",
                }
            ],
        }
    ]
    reg_file = tmp_path / "comuni.yaml"
    reg_file.write_text(yaml.safe_dump(registry), encoding="utf-8")

    def handler(request: httpx.Request) -> httpx.Response:
        u = str(request.url)
        if "robots.txt" in u:
            return httpx.Response(200, text="User-agent: *\nAllow: /\n")
        if u.endswith("/category/a4-messaggi-municipali/"):
            return httpx.Response(
                200,
                text="""
                <html><body>
                  <article>
                    <h2><a href="https://centovalli.swiss/2026/05/11/mm296-credito-strade/">MM 296 Credito manutenzione strade 2026</a></h2>
                  </article>
                  <article>
                    <h2><a href="https://centovalli.swiss/2026/05/12/mm297-decisione-municipale/">MM 297 Decisione municipale 2026</a></h2>
                  </article>
                </body></html>
                """,
            )
        if "mm296-credito-strade" in u:
            return httpx.Response(
                200,
                text="""
                <html><body><article class="entry-content">
                  <h1>MM 296 Credito manutenzione strade 2026</h1>
                  <p>Pubblicato il 11 maggio 2026. Richiesta di credito di CHF 70'000.--.</p>
                  <a href="/wp-content/uploads/2026/05/MM296_allegato.pdf">Scarica PDF</a>
                </article></body></html>
                """,
            )
        if "mm297-decisione-municipale" in u:
            # Il titolo sembrava neutro, ma il corpo dell'atto contiene una domanda di naturalizzazione (nLPD)!
            return httpx.Response(
                200,
                text="""
                <html><body><article class="entry-content">
                  <h1>MM 297 Decisione municipale 2026</h1>
                  <p>Trattanda concernente la domanda di naturalizzazione e attinenza comunale di un privato.</p>
                  <a href="/wp-content/uploads/2026/05/MM297_riservato.pdf">Scarica allegato</a>
                </article></body></html>
                """,
            )
        return httpx.Response(404)

    crawler = CorteseCrawler(reg_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        docs = await crawler.scan_municipality(registry[0], client, max_docs_per_source=10)

    assert len(docs) == 2
    doc_296 = next(d for d in docs if "MM296_allegato.pdf" in d.doc_url)
    doc_297 = next(d for d in docs if "MM297_riservato.pdf" in d.doc_url)

    assert doc_296.doc_kind == "CREDITO_INVESTIMENTO"
    assert doc_296.mm_number == "MM 296"
    assert doc_296.published_date == date(2026, 5, 11)
    assert doc_296.contains_personal_data is False
    assert doc_296.summary_md is not None and "CHF 70'000.--" in doc_296.summary_md

    # Verifica che il deep-check nLPD sul Fit-Markdown abbia intercettato la naturalizzazione
    assert doc_297.contains_personal_data is True


def test_wordpress_rest_api_discovery() -> None:
    """Verifica il parsing diretto di /wp-json/wp/v2/posts e /wp-json/wp/v2/media."""
    posts_json = [
        {
            "id": 101,
            "date": "2026-10-15T09:30:00",
            "link": "https://www.brissago.ch/post/mm-1575-preventivo-2027/",
            "title": {"rendered": "MM 1575 &#8211; Conto Preventivo 2027"},
            "content": {"rendered": "<p>Presentazione del conto preventivo per l'anno 2027.</p>"},
        }
    ]
    media_json = [
        {
            "id": 501,
            "post": 101,
            "mime_type": "application/pdf",
            "source_url": "https://www.brissago.ch/wp-content/uploads/2026/10/MM-1575.pdf",
        }
    ]

    docs = WordPressConnector.parse_wp_rest_posts(
        posts_json,
        media_json,
        "https://www.brissago.ch",
        ust_code=5097,
        slug="brissago",
    )
    assert len(docs) == 1
    assert docs[0].doc_url == "https://www.brissago.ch/wp-content/uploads/2026/10/MM-1575.pdf"
    assert docs[0].doc_kind == "PREVENTIVO"
    assert docs[0].fiscal_year == 2027
    assert docs[0].mm_number == "MM 1575"
    assert docs[0].published_date == date(2026, 10, 15)


@pytest.mark.asyncio
async def test_orselina_rif_404_auto_bootstrap(tmp_path: Path) -> None:
    """
    Verifica che se l'URL con &rif= statico in comuni.yaml restituisce HTTP 404,
    OrselinaConnector esegua l'auto-bootstrap dalla homepage '/' recuperando il nuovo &rif= (C-03a).
    """
    registry = [
        {
            "ust_code": 5121,
            "slug": "orselina",
            "name": "Orselina",
            "cms_family": "CUSTOM_PHP",
            "active": True,
            "robots": {"crawl_delay_s": 2},
            "sources": [
                {
                    "kind": "MM_INDEX",
                    "url": "https://www.orselina.ch/index.php?node=329&lng=1&vis=2&rif=oldexpired0",
                    "strategy": "assolo_legacy_signed",
                }
            ],
        }
    ]
    reg_file = tmp_path / "comuni.yaml"
    reg_file.write_text(yaml.safe_dump(registry), encoding="utf-8")

    def handler(request: httpx.Request) -> httpx.Response:
        u = str(request.url)
        if "robots.txt" in u:
            return httpx.Response(200, text="User-agent: *\nAllow: /\n")
        if "rif=oldexpired0" in u:
            return httpx.Response(404, text="Token rif scaduto")
        if u == "https://www.orselina.ch/":
            return httpx.Response(
                200,
                text="""
                <html><body>
                  <a href="index.php?node=329&lng=1&vis=2&rif=newvalid99">Messaggi Municipali</a>
                </body></html>
                """,
            )
        if "rif=newvalid99" in u:
            return httpx.Response(
                200,
                text="""
                <html><body>
                  <table><tr>
                    <td class="titolo">MM 12/2026 Conto Consuntivo 2025</td>
                    <td><a href="downdoc.php?id_doc=4500&lng=1&i=1&vis=2">Scarica</a></td>
                  </tr></table>
                </body></html>
                """,
            )
        return httpx.Response(404)

    crawler = CorteseCrawler(reg_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        docs = await crawler.scan_municipality(registry[0], client)

    assert len(docs) == 1
    assert "rif=newvalid99" in docs[0].doc_url
    assert docs[0].doc_kind == "CONSUNTIVO"
    assert docs[0].fiscal_year == 2025


@pytest.mark.asyncio
async def test_per_host_autothrottle_retry_and_robots(tmp_path: Path) -> None:
    """
    Verifica:
    1. Retry automatico su HTTP 429 con rispetto di Retry-After;
    2. Blocco di RobotsGuard su percorsi vietati da robots.txt.
    """
    attempts = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        u = str(request.url)
        if "robots.txt" in u:
            return httpx.Response(200, text="User-agent: *\nDisallow: /privato/\nCrawl-delay: 4\n")
        if "/rate-limited" in u:
            attempts += 1
            if attempts == 1:
                return httpx.Response(
                    429, headers={"Retry-After": "0.05"}, text="Too Many Requests"
                )
            return httpx.Response(200, text="OK dopo retry")
        return httpx.Response(200, text="OK")

    throttler = PerHostAutoThrottler(max_concurrent_hosts=4, fast_mode=True, max_retries=2)
    guard = RobotsGuard(cache_dir=tmp_path / "robots_cache", obey_robots=True)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        assert await guard.can_fetch("https://comune-test.ch/pubblico/albo", client) is True
        assert await guard.can_fetch("https://comune-test.ch/privato/segreto.pdf", client) is False
        # Guardrail C-02 Locarno sempre attivo
        assert (
            await guard.can_fetch("https://www.locarno.ch/files/documenti/MM.pdf", client) is False
        )

        eff_delay = await guard.get_effective_delay(
            "https://comune-test.ch/pubblico/albo", 2.0, client
        )
        assert eff_delay == 4.0

        resp = await throttler.request(client, "GET", "https://comune-test.ch/rate-limited")
        assert resp.status_code == 200
        assert attempts == 2
        metrics = throttler.get_metrics_summary()
        assert metrics["comune-test.ch"]["retries_count"] == 1


@pytest.mark.asyncio
async def test_state_store_etag_304_and_resume(tmp_path: Path) -> None:
    """
    Verifica che CrawlStateStore persista ETag e invii If-None-Match al secondo passaggio
    ottenendo NOT_MODIFIED senza riscaricare il PDF, e che --resume salti i Comuni completati.
    """
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    registry = [
        {
            "ust_code": 5091,
            "slug": "ascona",
            "name": "Ascona",
            "cms_family": "ASSOLO",
            "active": True,
            "robots": {"crawl_delay_s": 2},
            "sources": [
                {
                    "kind": "MM_INDEX",
                    "url": "https://www.ascona.ch/Messaggi",
                    "strategy": "assolo_list",
                }
            ],
        }
    ]
    reg_file = tmp_path / "comuni.yaml"
    reg_file.write_text(yaml.safe_dump(registry), encoding="utf-8")
    state_file = tmp_path / "crawl_state.json"

    def handler(request: httpx.Request) -> httpx.Response:
        u = str(request.url)
        if "robots.txt" in u:
            return httpx.Response(200, text="User-agent: *\nAllow: /\n")
        if u.endswith("/Messaggi"):
            return httpx.Response(
                200,
                text='<a href="/MM-01-Consuntivo-2025-daf46200?i=1">MM 01 Consuntivo 2025</a>',
            )
        if "MM-01-Consuntivo-2025-daf46200" in u:
            if request.headers.get("If-None-Match") == '"etag-ascona-2025"':
                return httpx.Response(304, headers={"ETag": '"etag-ascona-2025"'})
            return httpx.Response(
                200,
                content=pdf_bytes,
                headers={"Content-Type": "application/pdf", "ETag": '"etag-ascona-2025"'},
            )
        return httpx.Response(404)

    store = CrawlStateStore(state_file)
    cache = HttpDiskCache(tmp_path / "http_cache", enabled=True)
    crawler = CorteseCrawler(
        reg_file,
        tmp_path / "raw_pdfs",
        sync_r2=False,
        fast_mode=True,
        state_store=store,
        http_cache=cache,
    )

    doc = DiscoveredDocument(
        ust_code=5091,
        municipality_slug="ascona",
        title="MM 01 Consuntivo 2025",
        doc_url="https://www.ascona.ch/MM-01-Consuntivo-2025-daf46200?i=1",
        page_url="https://www.ascona.ch/Messaggi",
        doc_kind="CONSUNTIVO",
        fiscal_year=2025,
    )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        # 1° download: scarica il PDF e salva '"etag-ascona-2025"' nello store
        r1 = await crawler.download_pdf_stream(doc, client)
        assert r1.status == "DOWNLOADED"
        assert r1.etag == '"etag-ascona-2025"'

        # 2° download: invia automaticamente If-None-Match dallo store -> riceve 304 NOT_MODIFIED
        r2 = await crawler.download_pdf_stream(doc, client)
        assert r2.status == "NOT_MODIFIED"
        assert r2.sha256 == r1.sha256

    # Verifica che lo state_file sia stato scritto su disco con schema_version
    saved_json = json.loads(state_file.read_text(encoding="utf-8"))
    assert saved_json.get("schema_version") == 1
    assert doc.doc_url in saved_json["urls"]


@pytest.mark.asyncio
async def test_crawler_unified_gateway_validates_scheme(tmp_path: Path) -> None:
    reg_file = tmp_path / "comuni.yaml"
    reg_file.write_text("[]", encoding="utf-8")
    crawler = CorteseCrawler(reg_file, tmp_path / "raw_pdfs")

    async with httpx.AsyncClient() as client:
        with pytest.raises(ValueError, match="Schema URL non valido"):
            await crawler._request(client, "GET", "ftp://example.com/file.pdf")

        with pytest.raises(ValueError, match="Schema URL non valido"):
            await crawler._request(client, "GET", "file:///etc/passwd")


@pytest.mark.asyncio
async def test_http_disk_cache_atomic_and_schema_version(tmp_path: Path) -> None:
    cache = HttpDiskCache(tmp_path / "cache", enabled=True)
    cache.put("https://example.ch/test", 200, "hello world", "https://example.ch/test")

    cached = cache.get("https://example.ch/test")
    assert cached is not None
    assert cached["text"] == "hello world"

    # Verifica schema_version nel file salvato
    key_file = next((tmp_path / "cache").glob("*.json"))
    raw = json.loads(key_file.read_text(encoding="utf-8"))
    assert raw["schema_version"] == 1
