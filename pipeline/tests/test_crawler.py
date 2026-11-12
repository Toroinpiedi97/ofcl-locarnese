"""
Suite di test per i connettori cortesi dei 5 CMS, per il filtro di privacy nLPD
e per il motore di download streaming con deduplicazione crittografica.
"""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from ofcl.fetch.connectors import (
    AssoloConnector,
    JoomlaConnector,
    LocarnoConnector,
    OrselinaConnector,
    WordPressConnector,
)
from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.models import DiscoveredDocument
from ofcl.fetch.privacy_filter import contains_personal_data

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "html"


def test_privacy_filter_nlpd_guardrail() -> None:
    """Verifica che il filtro nLPD intercetti i dati personali e approvi i bilanci."""
    # Casi sensibili da escludere
    assert contains_personal_data("Domanda di naturalizzazione del signor Rossi Mario") is True
    assert contains_personal_data("Richiesta di condono fiscale imposta 2022") is True
    assert contains_personal_data("Sussidio di aiuto sociale per famiglia Bianchi") is True
    assert contains_personal_data("Esproprio formale del fondo mappale 123") is True

    # Atti contabili ordinari (devono passare il filtro)
    assert contains_personal_data("MM 566 - Conto preventivo comunale 2027") is False
    assert contains_personal_data("Bilancio consuntivo 2024 e allegati MCA2") is False
    assert contains_personal_data("Richiesta di credito per rifacimento acquedotto") is False


def test_assolo_connector_with_html_fixture() -> None:
    """Verifica AssoloConnector su fixture HTML reale (Ascona)."""
    html = (FIXTURES_DIR / "assolo_ascona.html").read_text(encoding="utf-8")
    docs = AssoloConnector.parse_index(
        html,
        "https://www.ascona.ch/Messaggi-municipali",
        ust_code=5091,
        slug="ascona",
    )
    # 3 documenti contabili validi: Consuntivo 2025, Preventivo 2026, Credito acquedotto.
    # Esclusi: Domanda naturalizzazione (ha personal data), Messaggi municipali (indice).
    assert len(docs) == 3
    kinds = [d.doc_kind for d in docs]
    assert "CONSUNTIVO" in kinds
    assert "PREVENTIVO" in kinds
    assert "CREDITO_INVESTIMENTO" in kinds


def test_wordpress_connector_with_html_fixture() -> None:
    """Verifica WordPressConnector su fixture HTML reale (Centovalli)."""
    html = (FIXTURES_DIR / "wordpress_centovalli.html").read_text(encoding="utf-8")
    docs = WordPressConnector.parse_index(
        html,
        "https://www.comunecentovalli.ch/atti-municipali/",
        ust_code=5098,
        slug="centovalli",
    )
    assert len(docs) == 3
    assert docs[0].doc_kind == "PREVENTIVO"
    assert docs[0].fiscal_year == 2026
    assert docs[0].doc_url.endswith(".pdf")
    assert docs[1].doc_kind == "CONSUNTIVO"
    assert docs[1].fiscal_year == 2024
    assert docs[2].doc_kind == "CREDITO_INVESTIMENTO"


def test_joomla_connector_with_html_fixture() -> None:
    """Verifica JoomlaConnector su fixture HTML reale (Lavertezzo)."""
    html = (FIXTURES_DIR / "joomla_lavertezzo.html").read_text(encoding="utf-8")
    docs = JoomlaConnector.parse_index(
        html,
        "https://www.lavertezzo.ch/documenti-albo-comunale/messaggi-municipali/mm-2026",
        ust_code=5112,
        slug="lavertezzo",
    )
    # Esclude /images/PDF/avviso-chiusura-rifiuti.pdf
    assert len(docs) == 3
    assert all("/send/" in d.doc_url for d in docs)
    assert docs[0].doc_kind == "CONSUNTIVO"
    assert docs[0].fiscal_year == 2025
    assert docs[1].doc_kind == "PREVENTIVO"
    assert docs[1].fiscal_year == 2027


def test_orselina_connector_with_html_fixture() -> None:
    """Verifica OrselinaConnector su fixture HTML con token firmato &rif=."""
    html = (FIXTURES_DIR / "orselina_custom.html").read_text(encoding="utf-8")
    page_url = "https://www.orselina.ch/index.php?node=329&vis=2&rif=f5d7298ee5"
    docs = OrselinaConnector.parse_index(html, page_url, ust_code=5121, slug="orselina")
    # 3 atti contabili rilevati (Preventivo 2026, Consuntivo 2024, Credito).
    # L'atto privato di attinenza viene escluso preventivamente.
    assert len(docs) == 3
    # Tutti mantengono &rif=
    assert all("&rif=" in d.doc_url for d in docs)
    assert docs[0].doc_kind == "PREVENTIVO"
    assert docs[0].fiscal_year == 2026


def test_locarno_connector_with_html_fixture() -> None:
    """Verifica LocarnoConnector con guardrail robots.txt attivo."""
    html = (FIXTURES_DIR / "locarno_civic.html").read_text(encoding="utf-8")
    docs = LocarnoConnector.parse_index(
        html,
        "https://www.locarno.ch/it/finanze",
        ust_code=5113,
        slug="locarno",
    )
    assert len(docs) == 2
    assert all(d.metadata.get("locarno_disallow_guard") is True for d in docs)


@pytest.mark.asyncio
async def test_download_pdf_stream_guardrails(tmp_path: Path) -> None:
    """Verifica il comportamento del download in streaming sui vari casi limite."""
    registry_file = tmp_path / "comuni.yaml"
    registry_file.write_text("[]", encoding="utf-8")
    crawler = CorteseCrawler(registry_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)

    # 1. Caso nLPD: saltato preventivamente
    doc_nlpd = DiscoveredDocument(
        ust_code=5096,
        municipality_slug="brione",
        title="Naturalizzazione Mario Rossi",
        page_url="https://brione.ch",
        doc_url="https://brione.ch/doc.pdf",
        doc_kind="ALTRO",
        contains_personal_data=True,
    )
    async with httpx.AsyncClient() as client:
        res = await crawler.download_pdf_stream(doc_nlpd, client)
        assert res.status == "SKIPPED_PRIVACY"

    # 2. Caso Locarno robots.txt guard: saltato preventivamente
    doc_locarno = DiscoveredDocument(
        ust_code=5113,
        municipality_slug="locarno",
        title="MM 120 Preventivo 2026",
        page_url="https://locarno.ch",
        doc_url="https://locarno.ch/files/mm120.pdf",
        doc_kind="PREVENTIVO",
        metadata={"locarno_disallow_guard": True},
    )
    async with httpx.AsyncClient() as client:
        res = await crawler.download_pdf_stream(doc_locarno, client)
        assert res.status == "SKIPPED_GUARD"


@pytest.mark.asyncio
async def test_download_pdf_stream_success_and_cache(tmp_path: Path) -> None:
    """Verifica download valido con mock e verifica caching su download successivo."""
    registry_file = tmp_path / "comuni.yaml"
    registry_file.write_text("[]", encoding="utf-8")
    crawler = CorteseCrawler(registry_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)

    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            content=pdf_bytes,
            headers={"Content-Type": "application/pdf", "ETag": '"abc123etag"'},
        )
    )

    doc = DiscoveredDocument(
        ust_code=5096,
        municipality_slug="brione",
        title="MM 562 - Consuntivo 2025",
        page_url="https://brione.ch",
        doc_url="https://brione.ch/mm562.pdf",
        doc_kind="CONSUNTIVO",
    )

    async with httpx.AsyncClient(transport=transport) as client:
        # Primo download: DOWNLOADED
        res1 = await crawler.download_pdf_stream(doc, client)
        assert res1.status == "DOWNLOADED"
        assert res1.size_bytes == len(pdf_bytes)
        assert res1.sha256 is not None
        assert res1.local_path is not None
        assert res1.local_path.exists()

        # Secondo download: CACHED (file già su disco)
        res2 = await crawler.download_pdf_stream(doc, client)
        assert res2.status == "CACHED"
        assert res2.sha256 == res1.sha256


@pytest.mark.asyncio
async def test_download_pdf_stream_invalid_and_not_modified(tmp_path: Path) -> None:
    """Verifica gestione di file non-PDF e risposte HTTP 304."""
    registry_file = tmp_path / "comuni.yaml"
    registry_file.write_text("[]", encoding="utf-8")
    crawler = CorteseCrawler(registry_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)

    doc = DiscoveredDocument(
        ust_code=5096,
        municipality_slug="brione",
        title="Documento",
        page_url="https://brione.ch",
        doc_url="https://brione.ch/doc.html",
        doc_kind="CONSUNTIVO",
    )

    # 1. Risposta HTML invece di PDF
    transport_html = httpx.MockTransport(
        lambda req: httpx.Response(200, text="<html><body>Non e' un PDF</body></html>")
    )
    async with httpx.AsyncClient(transport=transport_html) as client:
        res = await crawler.download_pdf_stream(doc, client)
        assert res.status == "INVALID_PDF"

    # 2. Risposta HTTP 304 Not Modified
    transport_304 = httpx.MockTransport(
        lambda req: httpx.Response(304, headers={"ETag": '"xyz789"'})
    )
    async with httpx.AsyncClient(transport=transport_304) as client:
        res = await crawler.download_pdf_stream(doc, client, etag='"xyz789"')
        assert res.status == "NOT_MODIFIED"


@pytest.mark.asyncio
async def test_crawler_check_canary_anti_drift(tmp_path: Path) -> None:
    """Verifica che check_canary rilevi endpoint sani (200) e segnali drift su 404."""
    registry_file = tmp_path / "comuni.yaml"
    registry_file.write_text("[]", encoding="utf-8")
    crawler = CorteseCrawler(registry_file, tmp_path / "raw_pdfs", sync_r2=False, fast_mode=True)

    transport = httpx.MockTransport(
        lambda req: httpx.Response(200 if "canary-ok" in str(req.url) else 404)
    )

    async with httpx.AsyncClient(transport=transport) as client:
        # Canarino valido
        ok, code, err = await crawler.check_canary(
            {"canary_url": "https://example.ch/canary-ok"}, client
        )
        assert ok is True
        assert code == 200
        assert err is None

        # Canarino in drift (404 Not Found)
        drift_ok, drift_code, drift_err = await crawler.check_canary(
            {"canary_url": "https://example.ch/canary-broken"}, client
        )
        assert drift_ok is False
        assert drift_code == 404
        assert "HTTP 404" in str(drift_err)
