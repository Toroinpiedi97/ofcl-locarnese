"""
Connettori cortesi e auto-adattivi per le 5 famiglie di CMS dei 19 Comuni del Locarnese:
1. Assolo.net / eGov (13 Comuni) — con paginazione dinamica ?fric=&ris_n=&ris_pg= (Fix C-07)
2. WordPress (3 Comuni: Brissago, Centovalli, Ronco sopra Ascona) — con REST API + 2° livello post
3. Joomla / jDownloads (1 Comune: Lavertezzo) — endpoint /send/ e blocco /images/PDF/
4. Custom PHP con token dinamico &rif= (1 Comune: Orselina) — con auto-bootstrap da '/' su 404 (Fix C-03a)
5. City Locarno (1 Comune: con rispetto di Disallow: /files/ in robots.txt, C-02)

Ogni connettore combina BeautifulSoup con il motore auto-adattivo Scrapling v0.5 (`AdaptiveDOM`),
applica il filtro nLPD (sia su titolo sia su eventuale sommario Markdown) e mappa gli URL dei PDF.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup

from ofcl.fetch.adaptive_dom import AdaptiveDOM
from ofcl.fetch.markdown_cleaner import extract_civic_page, parse_swiss_italian_date
from ofcl.fetch.models import DiscoveredDocument, DocKind
from ofcl.fetch.privacy_filter import contains_personal_data

_YEAR_RE = re.compile(r"\b(20\d{2})\b")
_FISCAL_YEAR_PATTERNS = [
    re.compile(
        r"(?:consuntiv[oi]|preventiv[oi]|conti)\s+(?:del\s+comune\s+|comunal[ei]\s+)?\b(20\d{2})\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(20\d{2})\b"),
]
_MM_NUM_RE = re.compile(r"\bMM\s*(?:N[°o.]?\s*)?(\d{1,4}(?:[-/]\d{2,4})?)\b", re.IGNORECASE)

_NAV_TITLES: frozenset[str] = frozenset({
    "messaggi municipali",
    "messaggi",
    "albo",
    "albo comunale",
    "atti",
    "sedute",
    "risoluzioni",
    "documenti",
    "archivio",
    "home",
    "contatti",
    "mappa del sito",
})


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


def _should_skip_non_accounting(doc_kind: DocKind, mm_num: str | None, year: int | None, href: str, title: str) -> bool:
    if title.lower().strip() in _NAV_TITLES:
        return True
    low_h = href.lower()
    low_t = title.lower()
    if (
        doc_kind == "ALTRO"
        and mm_num is None
        and year is None
        and "pdf" not in low_h
        and "allegat" not in low_h
        and "messagg" not in low_h
        and "seduta" not in low_h
    ):
        return True
    return bool(doc_kind == "ALTRO" and mm_num is None and "pdf" not in low_h and "pdf" not in low_t)


class AssoloConnector:
    """
    Connettore per CMS Assolo.net / eGov (13 Comuni).
    Riconosce i link con hash esadecimale a 8 caratteri (-xxxxxxxx) con suffisso ?i=1
    e supporta la paginazione dinamica ?param_sla=0&fric=...&ris_n=...&ris_pg=N (Fix C-07).
    """

    # Pattern hash Assolo: es. -daf46200?i=1 oppure -26425b00
    _ASSOLO_HEX_RE = re.compile(r"-[0-9a-f]{8}(?:\?|$)", re.IGNORECASE)

    @classmethod
    def is_valid_assolo_href(cls, href: str) -> bool:
        return bool(cls._ASSOLO_HEX_RE.search(href))

    @classmethod
    def build_page_url(
        cls,
        base_url: str,
        params: dict[str, Any] | None = None,
        page: int = 1,
    ) -> str:
        """
        Costruisce l'URL di interrogazione indice per Assolo.net, iniettando i parametri
        `fric`, `ris_n` e `ris_pg` quando definiti in `comuni.yaml` o per pagine > 1 (Fix C-07).
        """
        if not params and page <= 1:
            return base_url

        parsed = urlparse(base_url)
        query_dict = dict(parse_qsl(parsed.query, keep_blank_values=True))

        if params:
            if "fric" in params and "param_sla" not in query_dict:
                query_dict["param_sla"] = str(params.get("param_sla", 0))
            if "fric" in params and "ris_n" not in query_dict and "ris_n" not in params:
                query_dict["ris_n"] = "50"
            for k, v in params.items():
                query_dict[str(k)] = str(v)

        if page > 1:
            query_dict["ris_pg"] = str(page)

        new_query = urlencode(query_dict)
        return urlunparse(parsed._replace(query=new_query))

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int,
        slug: str,
        *,
        css_selector: str = "a[href]",
        adaptive_storage_file: Path | None = None,
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        dom = AdaptiveDOM(html_content, page_url, storage_file=adaptive_storage_file)
        _, relocated = dom.select_links(
            css_selector,
            identifier=f"assolo_{slug}_links",
            href_validator=cls.is_valid_assolo_href,
        )

        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if not cls.is_valid_assolo_href(href):
                continue

            full_url = urljoin(page_url, href)
            parsed = urlparse(full_url)
            if "i=1" not in parsed.query:
                separator = "&" if parsed.query else "?"
                full_url = f"{full_url}{separator}i=1"

            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = a.get_text(separator=" ", strip=True)
            generic_titles = {
                "testo messaggio",
                "allegato conti",
                "conti",
                "documento",
                "scarica",
                "download",
                "apri",
            }
            parent = a.find_parent(["tr", "li", "div"])
            if not title or len(title) < 5 or title.lower() in generic_titles:
                prev_h3 = (
                    parent.find_previous(["h3", "h2", "h4"])
                    if parent
                    else a.find_previous(["h3", "h2", "h4"])
                )
                if prev_h3:
                    h3_text = prev_h3.get_text(strip=True)
                    title = f"{h3_text} ({title})" if title else h3_text
                elif parent:
                    title = parent.get_text(separator=" ", strip=True)
                else:
                    title = href

            context_text = parent.get_text(separator=" ", strip=True) if parent else title
            pub_date = parse_swiss_italian_date(context_text)
            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            if _should_skip_non_accounting(doc_kind, mm_num, year, href, title):
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    published_date=pub_date,
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                    selector_relocated=relocated,
                )
            )

        return documents


class WordPressConnector:
    """
    Connettore per Comuni basati su WordPress (Brissago, Centovalli, Ronco sopra Ascona).
    Supporta:
    1. Parsing indice HTML (sia per <article> sia per liste di link diretti).
    2. Discesa al 2° livello (`resolve_post_page`) con Fit-Markdown e deep-check nLPD per
       gli articoli albo che non espongono il PDF nell'indice di categoria (es. Centovalli).
    3. Interrogazione strutturata della WordPress REST API (`/wp-json/wp/v2/posts` + `media`).
    """

    @staticmethod
    def _is_wp_candidate_href(href: str) -> bool:
        low_href = href.lower()
        is_pdf = low_href.endswith(".pdf") or "/files/" in low_href or "/wp-content/uploads/" in low_href
        is_doc_page = (
            "/documenti/" in low_href
            or "preventiv" in low_href
            or "consuntiv" in low_href
            or bool(re.search(r"/(?:mm[-_]?\d+|crediti)", low_href))
        )
        return is_pdf or is_doc_page

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int,
        slug: str,
        *,
        css_selector: str = "article a[href], a[href]",
        adaptive_storage_file: Path | None = None,
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        dom = AdaptiveDOM(html_content, page_url, storage_file=adaptive_storage_file)
        _, relocated = dom.select_links(
            css_selector,
            identifier=f"wp_{slug}_links",
            href_validator=cls._is_wp_candidate_href,
        )

        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        # Strategia 1: ispezione per singoli <article> (stile blog / albo WordPress)
        articles = soup.find_all("article")
        if articles:
            for art in articles:
                heading = art.find(["h1", "h2", "h3", "h4", "entry-title"])
                title = heading.get_text(separator=" ", strip=True) if heading else ""
                art_date = parse_swiss_italian_date(art.get_text(separator=" ", strip=True))

                pdf_links = [
                    a
                    for a in art.find_all("a", href=True)
                    if _clean_href(a).lower().endswith(".pdf") or "/files/" in _clean_href(a).lower()
                ]
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

                    link_text = a.get_text(separator=" ", strip=True)
                    generic_titles = {
                        "scarica",
                        "download",
                        "leggi",
                        "apri",
                        "allegato",
                        "pdf",
                        "file",
                        "link",
                        "continua a leggere",
                    }
                    if link_text and len(link_text) >= 5 and link_text.lower() not in generic_titles:
                        doc_title = link_text
                    elif title:
                        doc_title = title
                    else:
                        file_stem = (
                            urlparse(full_url)
                            .path.split("/")[-1]
                            .replace(".pdf", "")
                            .replace("-", " ")
                            .replace("_", " ")
                        )
                        doc_title = file_stem if len(file_stem) > 4 else (link_text or href)

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
                            published_date=art_date or parse_swiss_italian_date(full_url),
                            fiscal_year=year,
                            mm_number=mm_num,
                            contains_personal_data=has_personal,
                            selector_relocated=relocated,
                            metadata={"is_direct_pdf": is_pdf},
                        )
                    )
            return documents

        # Strategia 2: lista di link diretti nella pagina
        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            low_href = href.lower()

            is_pdf = low_href.endswith(".pdf") or "/files/" in low_href or "download" in low_href
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

            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"scarica", "download", "leggi", "apri", "allegato", "pdf", "file"}
            parent = a.find_parent(["article", "tr", "li", "div"])
            if not title or len(title) < 5 or title.lower() in generic_titles:
                heading = parent.find(["h1", "h2", "h3", "h4", "strong"]) if parent else None
                if heading and len(heading.get_text(strip=True)) > 4:
                    title = heading.get_text(strip=True)
                else:
                    file_stem = (
                        urlparse(full_url)
                        .path.split("/")[-1]
                        .replace(".pdf", "")
                        .replace("-", " ")
                        .replace("_", " ")
                    )
                    title = (
                        file_stem
                        if len(file_stem) > 4
                        else (parent.get_text(separator=" ", strip=True) if parent else href)
                    )

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            if _should_skip_non_accounting(doc_kind, mm_num, year, href, title):
                continue

            documents.append(
                DiscoveredDocument(
                    ust_code=ust_code,
                    municipality_slug=slug,
                    title=title,
                    doc_url=full_url,
                    page_url=page_url,
                    doc_kind=doc_kind,
                    published_date=parse_swiss_italian_date(full_url),
                    fiscal_year=year,
                    mm_number=mm_num,
                    contains_personal_data=has_personal,
                    selector_relocated=relocated,
                    metadata={"is_direct_pdf": is_pdf},
                )
            )

        return documents

    @classmethod
    def resolve_post_page(
        cls,
        post_html: str,
        parent_doc: DiscoveredDocument,
    ) -> list[DiscoveredDocument]:
        """
        Risolve una pagina articolo di 2° livello (es. Centovalli `/2026/05/11/mm296-.../`):
        - Estrae il Fit-Markdown pulito della delibera e la data di pubblicazione;
        - Verifica se nel testo completo della delibera emergono dati personali nLPD;
        - Restituisce i documenti PDF allegati ereditando MM, anno e titolo dall'articolo padre.
        """
        extracted = extract_civic_page(post_html, parent_doc.doc_url)
        deep_personal = parent_doc.contains_personal_data or contains_personal_data(
            extracted.clean_markdown
        )
        pub_date = extracted.published_date or parent_doc.published_date

        if not extracted.pdf_links:
            return []

        resolved: list[DiscoveredDocument] = []
        generic_labels = {"scarica", "download", "allegato", "pdf", "messaggio", "apri", "documento"}

        for pdf_url, label in extracted.pdf_links:
            clean_label = label.strip()
            if (
                not clean_label
                or len(clean_label) < 5
                or clean_label.lower() in generic_labels
            ):
                final_title = parent_doc.title
            elif parent_doc.mm_number and parent_doc.mm_number.lower() not in clean_label.lower():
                final_title = f"{parent_doc.title} — {clean_label}"
            else:
                final_title = clean_label

            kind = classify_doc_kind(final_title)
            if kind == "ALTRO" and parent_doc.doc_kind != "ALTRO":
                kind = parent_doc.doc_kind

            year, mm_num = extract_year_and_mm(final_title)
            final_year = year or parent_doc.fiscal_year
            final_mm = mm_num or parent_doc.mm_number
            has_personal = deep_personal or contains_personal_data(final_title)

            resolved.append(
                DiscoveredDocument(
                    ust_code=parent_doc.ust_code,
                    municipality_slug=parent_doc.municipality_slug,
                    title=final_title,
                    doc_url=pdf_url,
                    page_url=parent_doc.doc_url,
                    doc_kind=kind,
                    published_date=pub_date,
                    mm_number=final_mm,
                    fiscal_year=final_year,
                    contains_personal_data=has_personal,
                    summary_md=extracted.clean_markdown or None,
                    selector_relocated=parent_doc.selector_relocated,
                    metadata={"is_direct_pdf": True, "resolved_from_post": parent_doc.doc_url},
                )
            )

        return resolved

    @classmethod
    def parse_wp_rest_posts(
        cls,
        posts_json: list[dict[str, Any]],
        media_items: list[dict[str, Any]] | None,
        site_url: str,
        ust_code: int,
        slug: str,
    ) -> list[DiscoveredDocument]:
        """
        Estrae `DiscoveredDocument` dalla risposta JSON di `/wp-json/wp/v2/posts`
        (ed eventuale `/wp-json/wp/v2/media`).
        """
        media_by_post: dict[int, list[str]] = {}
        if media_items:
            for m in media_items:
                if not isinstance(m, dict):
                    continue
                src_url = str(m.get("source_url", "")).strip()
                mime = str(m.get("mime_type", "")).lower()
                parent_id = m.get("post")
                if src_url and (mime == "application/pdf" or src_url.lower().endswith(".pdf")) and isinstance(parent_id, int):
                    media_by_post.setdefault(parent_id, []).append(src_url)

        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for post in posts_json:
            if not isinstance(post, dict):
                continue
            post_id = post.get("id")
            post_link = str(post.get("link") or site_url)
            raw_title_html = str((post.get("title") or {}).get("rendered") or "")
            title = BeautifulSoup(raw_title_html, "html.parser").get_text(" ", strip=True)
            raw_content_html = str((post.get("content") or {}).get("rendered") or "")

            civic = extract_civic_page(raw_content_html, post_link)
            pub_date = parse_swiss_italian_date(str(post.get("date", ""))) or civic.published_date

            # Unisce gli allegati PDF trovati nei media WP e nel contenuto HTML del post
            pdf_urls: list[tuple[str, str]] = list(civic.pdf_links)
            if isinstance(post_id, int) and post_id in media_by_post:
                for m_url in media_by_post[post_id]:
                    pdf_urls.append((m_url, title))

            deep_personal = contains_personal_data(title) or contains_personal_data(civic.clean_markdown)
            base_kind = classify_doc_kind(title)
            base_year, base_mm = extract_year_and_mm(title)

            if pdf_urls:
                for pdf_url, label in pdf_urls:
                    full_pdf = urljoin(post_link, pdf_url)
                    if full_pdf in seen_urls:
                        continue
                    seen_urls.add(full_pdf)

                    doc_title = title or label or full_pdf
                    kind = classify_doc_kind(doc_title)
                    if kind == "ALTRO" and base_kind != "ALTRO":
                        kind = base_kind
                    year, mm_num = extract_year_and_mm(doc_title)

                    documents.append(
                        DiscoveredDocument(
                            ust_code=ust_code,
                            municipality_slug=slug,
                            title=doc_title,
                            doc_url=full_pdf,
                            page_url=post_link,
                            doc_kind=kind,
                            published_date=pub_date,
                            mm_number=mm_num or base_mm,
                            fiscal_year=year or base_year,
                            contains_personal_data=deep_personal or contains_personal_data(doc_title),
                            summary_md=civic.clean_markdown or None,
                            metadata={"is_direct_pdf": True, "source": "wp_rest"},
                        )
                    )
            elif (base_kind != "ALTRO" or base_mm is not None) and post_link not in seen_urls:
                seen_urls.add(post_link)
                documents.append(
                    DiscoveredDocument(
                        ust_code=ust_code,
                        municipality_slug=slug,
                        title=title,
                        doc_url=post_link,
                        page_url=site_url,
                        doc_kind=base_kind,
                        published_date=pub_date,
                        mm_number=base_mm,
                        fiscal_year=base_year,
                        contains_personal_data=deep_personal,
                        summary_md=civic.clean_markdown or None,
                        metadata={"is_direct_pdf": False, "source": "wp_rest"},
                    )
                )

        return documents


class JoomlaConnector:
    """
    Connettore per Lavertezzo (Joomla con jDownloads).
    Riconosce gli endpoint di invio file /send/{cat_id}-{slug}/{doc_id}-{slug}.
    """

    @staticmethod
    def _is_valid_joomla_href(href: str) -> bool:
        low_href = href.lower()
        if "/images/" in low_href or "/media/" in low_href:
            return False
        return "/send/" in low_href or "/download/" in low_href or low_href.endswith(".pdf")

    @classmethod
    def parse_index(
        cls,
        html_content: str,
        page_url: str,
        ust_code: int = 5112,
        slug: str = "lavertezzo",
        *,
        css_selector: str = "a[href]",
        adaptive_storage_file: Path | None = None,
    ) -> list[DiscoveredDocument]:
        soup = BeautifulSoup(html_content, "html.parser")
        dom = AdaptiveDOM(html_content, page_url, storage_file=adaptive_storage_file)
        _, relocated = dom.select_links(
            css_selector,
            identifier=f"joomla_{slug}_links",
            href_validator=cls._is_valid_joomla_href,
        )

        documents: list[DiscoveredDocument] = []
        seen_urls: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if not cls._is_valid_joomla_href(href):
                continue

            full_url = urljoin(page_url, href)
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            title = a.get_text(separator=" ", strip=True)
            generic_titles = {"scarica", "download", "leggi", "apri", "allegato", "pdf", "file"}
            parent = a.find_parent(["div", "tr", "li"])
            if not title or len(title) < 5 or title.lower() in generic_titles:
                heading = parent.find(["h1", "h2", "h3", "h4", "strong"]) if parent else None
                if heading and len(heading.get_text(strip=True)) > 4:
                    title = heading.get_text(strip=True)
                else:
                    slug_part = urlparse(full_url).path.split("/")[-1]
                    clean_slug = re.sub(r"^\d+-", "", slug_part).replace("-", " ").replace("_", " ")
                    title = (
                        clean_slug
                        if len(clean_slug) > 4
                        else (parent.get_text(separator=" ", strip=True) if parent else href)
                    )

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            if _should_skip_non_accounting(doc_kind, mm_num, year, href, title):
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
                    selector_relocated=relocated,
                )
            )

        return documents


class OrselinaConnector:
    """
    Connettore per Orselina (Custom PHP con token dinamico &rif=).
    Estrae il token crittografico HMAC dalla pagina per costruire URL validi di downdoc.php
    ed espone l'auto-bootstrap dalla homepage `/` se il token statico in comuni.yaml scade (Fix C-03a).
    """

    _RIF_RE = re.compile(r"[?&]rif=([0-9a-zA-Z]{6,32})", re.IGNORECASE)

    @classmethod
    def discover_signed_nodes_from_home(cls, home_html: str, home_url: str) -> list[str]:
        """
        Estrae dalla homepage di Orselina gli URL firmati (`index.php?node=...&rif=...`)
        pertinenti a Messaggi Municipali / Albo / Conti comunali (Fix C-03a).
        """
        soup = BeautifulSoup(home_html, "html.parser")
        signed_Nodes: list[str] = []
        seen: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if "rif=" not in href.lower():
                continue
            full = urljoin(home_url, href)
            if full in seen:
                continue
            label = a.get_text(" ", strip=True).lower()
            if any(
                kw in label or kw in href.lower()
                for kw in ("messagg", "albo", "conti", "consuntiv", "preventiv", "node=329", "node=326")
            ):
                seen.add(full)
                signed_Nodes.append(full)

        # Fallback: qualsiasi node= firmato se non ci sono keyword esplicite nel menu
        if not signed_Nodes:
            for a in soup.find_all("a", href=True):
                href = _clean_href(a)
                if "node=" in href.lower() and "rif=" in href.lower():
                    full = urljoin(home_url, href)
                    if full not in seen:
                        seen.add(full)
                        signed_Nodes.append(full)

        return signed_Nodes

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

        rif_match = cls._RIF_RE.search(page_url) or cls._RIF_RE.search(html_content)
        active_rif = rif_match.group(1) if rif_match else None

        for a in soup.find_all("a", href=True):
            href = _clean_href(a)
            if "downdoc.php" not in href and "id_doc=" not in href and not href.lower().endswith(".pdf"):
                continue

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
                    titolo_cell = parent.find(
                        ["td", "th"], class_=re.compile(r"titolo|descrizion", re.IGNORECASE)
                    )
                    if titolo_cell:
                        title = titolo_cell.get_text(separator=" ", strip=True)
                    else:
                        title = parent.get_text(separator=" ", strip=True)
                else:
                    title = href

            doc_kind = classify_doc_kind(title)
            year, mm_num = extract_year_and_mm(title)
            has_personal = contains_personal_data(title)

            if _should_skip_non_accounting(doc_kind, mm_num, year, href, title):
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
            if not (
                low_href.endswith(".pdf")
                or "messaggi-municipali" in low_href
                or "finanze" in low_href
            ):
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

            if _should_skip_non_accounting(doc_kind, mm_num, year, href, title):
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
