"""
Suite di test per i connettori cortesi dei 5 CMS e per il filtro di privacy nLPD.
"""

from __future__ import annotations

from ofcl.fetch.connectors import (
    AssoloConnector,
    JoomlaConnector,
    LocarnoConnector,
    OrselinaConnector,
    WordPressConnector,
)
from ofcl.fetch.privacy_filter import contains_personal_data


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


def test_assolo_connector_parses_hex_hashes() -> None:
    """Verifica che AssoloConnector estragga gli URL PDF con hash esadecimale e parametro ?i=1."""
    html_fixture = """
    <div>
        <a href="/Conti-del-Comune-454d6500?i=1&MasterId=g1_3779">MM 08/2026 - Conti del Comune 2025</a>
        <a href="/MM-36-Preventivo-2026-a5ca8400">Preventivo 2026 e moltiplicatore</a>
        <a href="/notizia-comunale-generica">Avviso chiusura cancelleria</a>
    </div>
    """
    docs = AssoloConnector.parse_index(
        html_fixture,
        "https://www.ascona.ch/Messaggi-municipali",
        ust_code=5091,
        slug="ascona",
    )
    assert len(docs) == 2
    # Primo documento: consuntivo con ?i=1 presente
    assert docs[0].doc_kind == "CONSUNTIVO"
    assert docs[0].mm_number == "MM 08/2026"
    assert docs[0].fiscal_year == 2025
    assert "i=1" in docs[0].doc_url

    # Secondo documento: preventivo, il connettore inietta ?i=1 per il download PDF
    assert docs[1].doc_kind == "PREVENTIVO"
    assert docs[1].fiscal_year == 2026
    assert "i=1" in docs[1].doc_url


def test_wordpress_connector_parses_pdf_and_doc_links() -> None:
    """Verifica che WordPressConnector estragga i PDF in /wp-content/ o /files/."""
    html_fixture = """
    <div class="entry-content">
        <a href="/files/mm_1478_-_preventivo_comune.pdf">MM 1478 - Preventivo 2025</a>
        <a href="/documenti/mm-1557-consuntivo-2024/">MM 1557 - Consuntivo 2024</a>
        <a href="/orari-ecocentro/">Orari di apertura ecocentro</a>
    </div>
    """
    docs = WordPressConnector.parse_index(
        html_fixture,
        "https://www.brissago.ch/documenti-consiglio-comunale/",
        ust_code=5097,
        slug="brissago",
    )
    assert len(docs) == 2
    assert docs[0].doc_kind == "PREVENTIVO"
    assert docs[0].doc_url.endswith(".pdf")
    assert docs[1].doc_kind == "CONSUNTIVO"


def test_joomla_connector_parses_jdownloads_endpoints() -> None:
    """Verifica che JoomlaConnector per Lavertezzo riconosca gli endpoint /send/."""
    html_fixture = """
    <div class="jd_category">
        <a href="/documenti-albo-comunale/messaggi-municipali/mm-2026/send/80-mm-2026/864-mm-2026-07-consuntivo-comunale-2025">
            MM 2026-07 - Consuntivo comunale 2025
        </a>
        <a href="/contatti/">Contatti cancelleria</a>
    </div>
    """
    docs = JoomlaConnector.parse_index(
        html_fixture,
        "https://www.lavertezzo.ch/documenti-albo-comunale/messaggi-municipali/mm-2026",
    )
    assert len(docs) == 1
    assert docs[0].doc_kind == "CONSUNTIVO"
    assert docs[0].fiscal_year == 2025
    assert "/send/" in docs[0].doc_url


def test_orselina_connector_preserves_dynamic_rif_token() -> None:
    """Verifica che OrselinaConnector conservi il token dinamico &rif= per evitare HTTP 404."""
    html_fixture = """
    <div>
        <a href="downdoc.php?id_doc=3255&lng=1&i=1">MM 4/2023 Consuntivo 2022 del Comune di Orselina</a>
        <a href="downdoc.php?id_doc=3593&lng=1&i=1&rif=c1b05871c1">Preventivo 2024</a>
    </div>
    """
    page_url = "https://www.orselina.ch/index.php?node=326&lng=1&vis=2&rif=b07ebc24cc"
    docs = OrselinaConnector.parse_index(html_fixture, page_url)
    assert len(docs) == 2
    # Il primo link non aveva rif nel tag, ma il connettore inietta quello attivo della pagina
    assert "rif=b07ebc24cc" in docs[0].doc_url
    assert docs[0].fiscal_year == 2022


def test_locarno_connector_enforces_disallow_guard() -> None:
    """Verifica che LocarnoConnector contrassegni i documenti per il guardrail robots.txt."""
    html_fixture = """
    <div>
        <a href="/files/documenti/Preventivi_2025_Conti_1.pdf">Preventivi 2025 Conti</a>
    </div>
    """
    docs = LocarnoConnector.parse_index(html_fixture, "https://www.locarno.ch/it/finanze")
    assert len(docs) == 1
    assert docs[0].metadata.get("locarno_disallow_guard") is True
