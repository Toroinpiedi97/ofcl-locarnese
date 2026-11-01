"""
Connettori cortesi per le 5 famiglie di CMS dei 19 Comuni del Locarnese:
1. Assolo.net / eGov (13 Comuni)
2. WordPress (3 Comuni: Brissago, Centovalli, Ronco sopra Ascona)
3. Joomla / jDownloads (1 Comune: Lavertezzo)
4. Custom PHP con token dinamico &rif= (1 Comune: Orselina)
5. City Locarno (1 Comune: con rispetto di Disallow: / in robots.txt)

Ogni connettore estrae esclusivamente i documenti contabili pertinenti (Preventivi, Consuntivi, Crediti),
applica il filtro nLPD e mappa gli URL di download dei PDF.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from ofcl.fetch.models import DiscoveredDocument, DocKind
from ofcl.fetch.privacy_filter import contains_personal_data

_YEAR_RE = re.compile(r"\b(20\d{2})\b")
_FISCAL_YEAR_PATTERNS = [
    re.compile(r"(?:consuntiv[oi]|preventiv[oi]|conti)\s+(?:del\s+comune\s+|comunal[ei]\s+)?\b(20\d{2})\b", re.IGNORECASE),
    re.compile(r"\b(20\d{2})\b"),
]
_MM_NUM_RE = re.compile(r"\bMM\s*(?:N[°o.]?\s*)?(\d{1,4}(?:[-/]\d{2,4})?)\b", re.IGNORECASE)


def _clean_href(tag: Any) -> str:
    raw = tag.get("href", "")
    if isinstance(raw, list):
        return " ".join(raw).strip()
    return str(raw).strip()


def classify_doc_kind(title: str) -> DocKind:
    """Classifica il documento dal titolo."""
    low = title.lower()
    if "preventiv" in low:
        return "PREVENTIVO"
    if "consuntiv" in low or "conti del comune" in low or "conto consuntivo" in low:
        return "CONSUNTIVO"
    if "piano finanziario" in low or "piano economico" in low:
        return "PIANO_FINANZIARIO"
    if "credito" in low or "richiesta di credito" in low or "opera" in low or "progetto" in low:
        return "CREDITO_INVESTIMENTO"
    if "rapporto" in low and ("commissione" in low or "gestione" in low):
        return "RAPPORTO_COMMISSIONE"
    if "conti" in low:
        return "CONSUNTIVO"
    return "ALTRO"


def extract_year_and_mm(text: str) -> tuple[int | None, str | None]:
    """Estrae l'anno di competenza fiscale e l'identificativo del Messaggio Municipale."""
    mm_match = _MM_NUM_RE.search(text)
    mm_number = f"MM {mm_match.group(1)}" if mm_match else None

    # Rimuove il token MM dal testo temporaneamente per non scambiare l'anno del MM con l'esercizio
    text_without_mm = _MM_NUM_RE.sub("", text) if mm_match else text

    fiscal_year: int | None = None
    for pat in _FISCAL_YEAR_PATTERNS:
        m = pat.search(text_without_mm)
        if m:
            fiscal_year = int(m.group(1))
            break

    # Fallback se non trovato nel testo residuo
    if fiscal_year is None:
        m_fallback = _YEAR_RE.search(text)
        fiscal_year = int(m_fallback.group(1)) if m_fallback else None

    return fiscal_year, mm_number


class AssoloConnector:
    """
    Connettore per CMS Assolo.net / eGov (13 Comuni).
    Riconosce i link con hash esadecimale a 8 caratteri (-xxxxxxxx) con suffisso ?i=1.
    """

    # Pattern hash Assolo: es. -daf46200?i=1 oppure -26425b00
    _ASSOLO_HEX_RE = re.compile(r"-[0-9a-f]{8}(?:\?|$)", re.IGNORECASE)

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int,
        slug: str,
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if not cls._ASSOLO_HEX_RE.search(href):
                continue

            full_url = urljoin(page_url, href)
            # Assicura il parametro ?i=1 per il download diretto del PDF
            parsed = urlparse(full_url)
            if "i=1" not in parsed.query:
                separator = "&" if parsed.query else "?"
                full_url = f"{full_url}{separator}i=1"

            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Il titolo è il testo del link o dell'elemento genitore / h3 precedente
            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"testo messaggio", "allegato conti", "conti", "documento", "scarica", "download", "apri"}
            if not title or len(title) < 5 or title.lower() in generic_titles:
                parent = a.find_parent(["tr", "li", "div"])
                prev_h3 = parent.find_previous(["h3", "h2", "h4"]) if parent else a.find_previous(["h3", "h2", "h4"])
                if prev_h3:
                    h3_text = prev_h3.get_text(strip=True)
                    title = f"{h3_text} ({title})" if title else h3_text
                elif parent:
                    title = parent.get_text(separator=" ", strip=True)
                else:
                    title = href

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            # Esclude link di navigazione generale del portale che non sono atti/documenti
            if title.lower().strip() in {
                "messaggi municipali",
                "messaggi",
                "albo",
                "albo comunale",
                "atti",
                "sedute",
                "risoluzioni",
                "documenti",
                "archivio",
            }:
                continue

            if (
                doc_kind == "ALTRO"
                and mm_num is None
                and year is None
                and "pdf" not in href.lower()
                and "allegat" not in href.lower()
                and "messagg" not in href.lower()
                and "seduta" not in href.lower()
            ):
                continue

            if doc_kind == "ALTRO" and mm_num is None and "pdf" not in href.lower() and "pdf" not in title.lower():
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                )
            )

        return documents


class WordPressConnector:
    """
    Connettore per Comuni basati su WordPress (Brissago, Centovalli, Ronco sopra Ascona).
    Riconosce link a file PDF in /wp-content/uploads/ o /files/ e pagine di allegato.
    """

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int,
        slug: str,
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        # Strategia 1: ispezione per singoli <article> (stile blog / albo WordPress)
        articles = soup.find_all("article")
        if articles:
            for art in articles:
                heading = art.find(["h1", "h2", "h3", "h4", "entry-title"])
                title = heading.get_text(separator=" ", strip=True) if heading else ""

                # Cerca link diretti PDF dentro l'articolo
                pdf_links = [
                    a for a in art.find_all("a", href=True)
                    if _clean_href(a).lower().endswith(".pdf") or "/files/" in _clean_href(a).lower()
                ]

                # Se ci sono link diretti a PDF, usa quelli; altrimenti i link dell'articolo
                target_anchors = pdf_links if pdf_links else art.find_all("a", href=True)

                for a in target_anchors:
                    href = _clean_href(a)
                    low_href = href.lower()

                    is_pdf = low_href.endswith(".pdf") or "/files/" in low_href
                    is_doc_page = (
                        "/documenti/" in low_href
                        or "preventiv" in low_href
                        or "consuntiv" in low_href
                        or bool(re.search(r"/(?:mm[-_]?\d+|crediti)", low_href))
                    )

                    if not (is_pdf or is_doc_page):
                        continue

                    full_url = urljoin(page_url, href)
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    doc_title = title or a.get_text(separator=" ", strip=True)
                    if not doc_title or len(doc_title) < 5:
                        doc_title = a.get_text(separator=" ", strip=True)

                    doc_kind = classify_doc_kind(doc_title)
                    year, mm_num = extract_year_and_mm(doc_title)
                    has_personal = contains_personal_data(doc_title)

                    if doc_kind == "ALTRO" and mm_num is None and year is None:
                        continue

                    documents.append(
                        DiscoveredDocument(
                            ust_code=ust_code,
                            municipality_slug=slug,
                            title=doc_title,
                            doc_url=full_url,
                            page_url=page_url,
                            doc_kind=doc_kind,
                            fiscal_year=year,
                            mm_number=mm_num,
                            contains_personal_data=has_personal,
                            metadata={"is_direct_pdf": is_pdf},
                        )
                    )
            return documents

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            low_href = href.lower()

            # Link diretto a file PDF
            is_pdf = low_href.endswith(".pdf") or "/files/" in low_href or "download" in low_href
            # Articolo o pagina trattanda (es. /documenti/mm-1557-consuntivo-2024/ o /2026/05/11/mm294-...)
            is_doc_page = (
                "/documenti/" in low_href
                or "preventiv" in low_href
                or "consuntiv" in low_href
                or bool(re.search(r"/(?:mm[-_]?\d+|crediti)", low_href))
            )

            if not (is_pdf or is_doc_page):
                continue

            full_url = urljoin(page_url, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Se il titolo è generico (es. 'Scarica', 'Download'), cerca nei tag vicini o usa il nome file/slug
            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"scarica", "download", "leggi", "apri", "allegato", "pdf", "file"}
            if not title or len(title) < 5 or title.lower() in generic_titles:
                parent = a.find_parent(["article", "tr", "li", "div"])
                heading = parent.find(["h1", "h2", "h3", "h4", "strong"]) if parent else None
                if heading and len(heading.get_text(strip=True)) > 4:
                    title = heading.get_text(strip=True)
                else:
                    # Estrae il nome dal percorso del file (es. MM-1575.pdf -> MM 1575)
                    file_stem = urlparse(full_url).path.split("/")[-1].replace(".pdf", "").replace("-", " ").replace("_", " ")
                    title = file_stem if len(file_stem) > 4 else (parent.get_text(separator=" ", strip=True) if parent else href)

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            # Esclude link di navigazione generale del portale che non sono atti/documenti
            if title.lower().strip() in {
                "messaggi municipali",
                "messaggi",
                "albo",
                "albo comunale",
                "atti",
                "sedute",
                "risoluzioni",
                "documenti",
                "archivio",
            }:
                continue

            if (
                doc_kind == "ALTRO"
                and mm_num is None
                and year is None
                and "pdf" not in href.lower()
                and "allegat" not in href.lower()
                and "messagg" not in href.lower()
                and "seduta" not in href.lower()
            ):
                continue

            if doc_kind == "ALTRO" and mm_num is None and "pdf" not in href.lower() and "pdf" not in title.lower():
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                    metadata={"is_direct_pdf": is_pdf},
                )
            )

        return documents


class JoomlaConnector:
    """
    Connettore per Lavertezzo (Joomla con jDownloads).
    Riconosce gli endpoint di invio file /send/{cat_id}-{slug}/{doc_id}-{slug}.
    """

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int = 5112,
        slug: str = "lavertezzo",
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            low_href = href.lower()

            # Blocco rigoroso /images/PDF/ per guardrail T025
            if "/images/" in low_href or "/media/" in low_href:
                continue

            if "/send/" not in low_href and "/download/" not in low_href and not low_href.endswith(".pdf"):
                continue

            full_url = urljoin(page_url, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Se il titolo è generico ('Download', 'Scarica'), estrae dal nome della risorsa jDownloads
            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"scarica", "download", "leggi", "apri", "allegato", "pdf", "file"}
            if not title or len(title) < 5 or title.lower() in generic_titles:
                parent = a.find_parent(["div", "tr", "li"])
                heading = parent.find(["h1", "h2", "h3", "h4", "strong"]) if parent else None
                if heading and len(heading.get_text(strip=True)) > 4:
                    title = heading.get_text(strip=True)
                else:
                    slug_part = urlparse(full_url).path.split("/")[-1]
                    # Rimuove il prefisso numerico jDownloads (es. 845-mm-2026-01-...)
                    clean_slug = re.sub(r"^\d+-", "", slug_part).replace("-", " ").replace("_", " ")
                    title = clean_slug if len(clean_slug) > 4 else (parent.get_text(separator=" ", strip=True) if parent else href)

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            # Esclude link di navigazione generale del portale che non sono atti/documenti
            if title.lower().strip() in {
                "messaggi municipali",
                "messaggi",
                "albo",
                "albo comunale",
                "atti",
                "sedute",
                "risoluzioni",
                "documenti",
                "archivio",
            }:
                continue

            if (
                doc_kind == "ALTRO"
                and mm_num is None
                and year is None
                and "pdf" not in href.lower()
                and "allegat" not in href.lower()
                and "messagg" not in href.lower()
                and "seduta" not in href.lower()
            ):
                continue

            if doc_kind == "ALTRO" and mm_num is None and "pdf" not in href.lower() and "pdf" not in title.lower():
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                )
            )

        return documents


class OrselinaConnector:
    """
    Connettore per Orselina (Custom PHP con token dinamico &rif=).
    Estrae il token crittografico HMAC dalla pagina per costruire URL validi di downdoc.php.
    """

    _RIF_RE = re.compile(r"[?&]rif=([0-9a-f]{10})", re.IGNORECASE)

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int = 5121,
        slug: str = "orselina",
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        # Rileva il token &rif= attivo nella pagina
        rif_match = cls._RIF_RE.search(page_url) or cls._RIF_RE.search(html_content)
        active_rif = rif_match.group(1) if rif_match else None

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if "downdoc.php" not in href and "id_doc=" not in href and not href.lower().endswith(".pdf"):
                continue

            # Preserva o inietta il token &rif= valido
            if active_rif and "rif=" not in href:
                sep = "&" if "?" in href else "?"
                href = f"{href}{sep}rif={active_rif}"

            full_url = urljoin(page_url, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"scarica", "download", "apri", "documento", "scarica documento", "leggi"}
            if not title or len(title) < 5 or title.lower() in generic_titles:
                parent = a.find_parent(["tr", "li", "div"])
                if parent:
                    titolo_cell = parent.find(["td", "th"], class_=re.compile(r"titolo|descrizion", re.IGNORECASE))
                    if titolo_cell:
                        title = titolo_cell.get_text(separator=" ", strip=True)
                    else:
                        title = parent.get_text(separator=" ", strip=True)
                else:
                    title = href

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            # Esclude link di navigazione generale del portale che non sono atti/documenti
            if title.lower().strip() in {
                "messaggi municipali",
                "messaggi",
                "albo",
                "albo comunale",
                "atti",
                "sedute",
                "risoluzioni",
                "documenti",
                "archivio",
            }:
                continue

            if (
                doc_kind == "ALTRO"
                and mm_num is None
                and year is None
                and "pdf" not in href.lower()
                and "allegat" not in href.lower()
                and "messagg" not in href.lower()
                and "seduta" not in href.lower()
            ):
                continue

            if doc_kind == "ALTRO" and mm_num is None and "pdf" not in href.lower() and "pdf" not in title.lower():
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                    metadata={"rif_token": active_rif},
                )
            )

        return documents


class LocarnoConnector:
    """
    Connettore per Città di Locarno (Guardrail C-02).
    Estrae i metadati dei Messaggi Municipali pubblicati senza forzare il download
    massivo da directory protette da robots.txt.
    """

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int = 5113,
        slug: str = "locarno",
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            low_href = href.lower()
            if not (low_href.endswith(".pdf") or "messaggi-municipali" in low_href or "finanze" in low_href):
                continue

            full_url = urljoin(page_url, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = a.get_text(separator=" ", strip=True)
            if not title or len(title) < 5:
                parent = a.find_parent(["article", "tr", "li", "div"])
                title = parent.get_text(separator=" ", strip=True) if parent else href

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            # Esclude link di navigazione generale del portale che non sono atti/documenti
            if title.lower().strip() in {
                "messaggi municipali",
                "messaggi",
                "albo",
                "albo comunale",
                "atti",
                "sedute",
                "risoluzioni",
                "documenti",
                "archivio",
            }:
                continue

            if (
                doc_kind == "ALTRO"
                and mm_num is None
                and year is None
                and "pdf" not in href.lower()
                and "allegat" not in href.lower()
                and "messagg" not in href.lower()
                and "seduta" not in href.lower()
            ):
                continue

            if doc_kind == "ALTRO" and mm_num is None and "pdf" not in href.lower() and "pdf" not in title.lower():
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                    metadata={"locarno_disallow_guard": True},
                )
            )

        return documents
