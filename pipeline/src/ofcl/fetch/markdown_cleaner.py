"""
Estrattore Fit-Markdown e Boilerplate Pruning per le pagine deliberative comunali.

Ispirato all'architettura Fit-Markdown di Crawl4AI ma implementato in modo 100% deterministico
e senza dipendenze browser su lxml:
1. Rimuove menu, header, footer, script, cookie banner ed elementi nascosti.
2. Estrae un sommario Markdown pulito della pagina trattanda/articolo albo (per verifica nLPD
   profonda sul testo deliberativo e metadati).
3. Riconosce le date in formato svizzero-italiano (es. '11 maggio 2026', '11.05.2026', ISO).
4. Estrae tutti gli allegati PDF presenti nel corpo dell'atto.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Comment

_ITALIAN_MONTHS: dict[str, int] = {
    "gennaio": 1,
    "febbraio": 2,
    "marzo": 3,
    "aprile": 4,
    "maggio": 5,
    "giugno": 6,
    "luglio": 7,
    "agosto": 8,
    "settembre": 9,
    "ottobre": 10,
    "novembre": 11,
    "dicembre": 12,
}

_ISO_DATE_RE = re.compile(r"\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?=\b|T|\s)")
_SWISS_DOT_DATE_RE = re.compile(r"\b(0?[1-9]|[12]\d|3[01])\.(0?[1-9]|1[0-2])\.(20\d{2})\b")
_ITALIAN_TEXT_DATE_RE = re.compile(
    r"\b([0-3]?\d)\s*(?:°|º)?\s+"
    r"(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)"
    r"\s+(20\d{2})\b",
    re.IGNORECASE,
)

_NOISE_TAGS = (
    "script",
    "style",
    "noscript",
    "svg",
    "iframe",
    "nav",
    "footer",
    "header",
    "aside",
    "form",
)
_NOISE_CLASS_ID_RE = re.compile(
    r"cookie|banner|menu|navbar|sidebar|breadcrumb|social|share|widget|search|login",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class CivicPageExtract:
    """Risultato dell'estrazione semantica da una pagina albo/articolo di 2° livello."""

    title: str
    clean_markdown: str
    published_date: date | None
    pdf_links: list[tuple[str, str]]  # [(full_url, label), ...]


def parse_swiss_italian_date(text: str | None) -> date | None:
    """Estrae una data da stringhe ISO (YYYY-MM-DD), svizzere (dd.mm.yyyy) o italiane ('11 maggio 2026')."""
    if not text:
        return None

    m_iso = _ISO_DATE_RE.search(text)
    if m_iso:
        try:
            return date(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)))
        except ValueError:
            pass

    m_dot = _SWISS_DOT_DATE_RE.search(text)
    if m_dot:
        try:
            return date(int(m_dot.group(3)), int(m_dot.group(2)), int(m_dot.group(1)))
        except ValueError:
            pass

    m_it = _ITALIAN_TEXT_DATE_RE.search(text)
    if m_it:
        day_num = int(m_it.group(1))
        month_num = _ITALIAN_MONTHS.get(m_it.group(2).lower(), 0)
        year_num = int(m_it.group(3))
        if month_num > 0:
            try:
                return date(year_num, month_num, day_num)
            except ValueError:
                pass

    return None


def extract_civic_page(
    html_content: str,
    page_url: str,
    *,
    max_markdown_chars: int = 1500,
) -> CivicPageExtract:
    """
    Pulisce una pagina HTML comunale dal boilerplate ed estrae:
    - titolo principale
    - data di pubblicazione
    - sommario Fit-Markdown pulito
    - elenco dei link a file PDF o endpoint di scaricamento presenti nel contenuto
    """
    soup = BeautifulSoup(html_content, "html.parser")

    # 1. Estrazione data prima della potatura (es. <time datetime="..."> o meta tag)
    pub_date: date | None = None
    time_tag = soup.find("time")
    if time_tag:
        dt_attr = time_tag.get("datetime")
        pub_date = parse_swiss_italian_date(
            str(dt_attr) if dt_attr else time_tag.get_text(" ", strip=True)
        )
    if pub_date is None:
        pub_date = parse_swiss_italian_date(page_url)

    # 2. Rimozione commenti HTML, tag di rumore ed elementi nascosti
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    for tag in soup.find_all(_NOISE_TAGS):
        tag.decompose()

    for el in list(soup.find_all(True)):
        if el.attrs is None:
            continue
        if el.get("aria-hidden") == "true" or el.has_attr("hidden"):
            el.decompose()
            continue
        style = str(el.get("style", "")).lower().replace(" ", "")
        if "display:none" in style or "visibility:hidden" in style:
            el.decompose()
            continue
        raw_cls = el.get("class")
        classes = (
            " ".join(str(c) for c in raw_cls) if isinstance(raw_cls, list) else str(raw_cls or "")
        )
        el_id = str(el.get("id") or "")
        if _NOISE_CLASS_ID_RE.search(f"{classes} {el_id}") and el.name not in (
            "body",
            "main",
            "article",
        ):
            el.decompose()

    # 3. Individuazione del contenitore principale
    container = (
        soup.find("article")
        or soup.find("main")
        or soup.find(
            "div", class_=re.compile(r"entry-content|post-content|contenuto|content", re.IGNORECASE)
        )
        or soup.body
        or soup
    )

    heading_tag = container.find(["h1", "h2", "h3"])
    title = heading_tag.get_text(" ", strip=True) if heading_tag else ""
    if not title and soup.title:
        title = soup.title.get_text(" ", strip=True)

    # 4. Raccolta link PDF/allegati nel contenitore
    pdf_links: list[tuple[str, str]] = []
    seen_pdfs: set[str] = set()
    for a in container.find_all("a", href=True):
        raw_href = a.get("href", "")
        href = " ".join(raw_href).strip() if isinstance(raw_href, list) else str(raw_href).strip()
        low_href = href.lower()
        is_pdf = (
            low_href.endswith(".pdf")
            or ".pdf?" in low_href
            or "/wp-content/uploads/" in low_href
            or "/send/" in low_href
            or "downdoc.php" in low_href
        )
        if not is_pdf:
            continue
        full_url = urljoin(page_url, href)
        if full_url in seen_pdfs:
            continue
        seen_pdfs.add(full_url)
        label = a.get_text(" ", strip=True)
        pdf_links.append((full_url, label))

    # 5. Costruzione Fit-Markdown lineare
    md_lines: list[str] = []
    for node in container.find_all(["h1", "h2", "h3", "h4", "p", "li", "td"]):
        txt = node.get_text(" ", strip=True)
        if not txt or len(txt) < 3:
            continue
        if pub_date is None:
            pub_date = parse_swiss_italian_date(txt)
        if node.name in ("h1", "h2", "h3", "h4"):
            level = int(node.name[1])
            line = f"{'#' * level} {txt}"
        elif node.name == "li":
            line = f"- {txt}"
        else:
            line = txt
        if not md_lines or md_lines[-1] != line:
            md_lines.append(line)

    if not md_lines:
        raw_text = container.get_text(" ", strip=True)
        if raw_text:
            md_lines.append(raw_text)
            if pub_date is None:
                pub_date = parse_swiss_italian_date(raw_text)

    clean_md = "\n".join(md_lines).strip()
    if len(clean_md) > max_markdown_chars:
        clean_md = clean_md[:max_markdown_chars].rsplit(" ", 1)[0] + "..."

    return CivicPageExtract(
        title=title,
        clean_markdown=clean_md,
        published_date=pub_date,
        pdf_links=pdf_links,
    )
