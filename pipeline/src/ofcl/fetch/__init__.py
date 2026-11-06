"""
Modulo di acquisizione e crawling cortese dei 19 Comuni del Locarnese (v2).
"""

from __future__ import annotations

import os


def _sanitize_no_proxy_for_httpx() -> None:
    """
    Rimuove i letterali IPv6 (`[::1]`, `::1`) da NO_PROXY / no_proxy che causano
    `httpx.InvalidURL: Invalid port: ':1]'` in httpx 0.28.x quando istanziato senza transport.
    """
    for env_key in ("NO_PROXY", "no_proxy"):
        val = os.environ.get(env_key)
        if val and ("::1" in val or "[" in val):
            parts = [
                p.strip()
                for p in val.split(",")
                if p.strip() and "::1" not in p and "[" not in p
            ]
            os.environ[env_key] = ",".join(parts)


_sanitize_no_proxy_for_httpx()

from ofcl.fetch.adaptive_dom import AdaptiveDOM
from ofcl.fetch.connectors import (
    AssoloConnector,
    JoomlaConnector,
    LocarnoConnector,
    OrselinaConnector,
    WordPressConnector,
)
from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.markdown_cleaner import (
    CivicPageExtract,
    extract_civic_page,
    parse_swiss_italian_date,
)
from ofcl.fetch.models import DiscoveredDocument, DocKind, DownloadResult
from ofcl.fetch.privacy_filter import contains_personal_data
from ofcl.fetch.robots_guard import RobotsGuard
from ofcl.fetch.state_store import CrawlStateStore, HttpDiskCache, UrlState
from ofcl.fetch.throttler import PerHostAutoThrottler

__all__ = [
    "AdaptiveDOM",
    "AssoloConnector",
    "CivicPageExtract",
    "CorteseCrawler",
    "CrawlStateStore",
    "DiscoveredDocument",
    "DocKind",
    "DownloadResult",
    "HttpDiskCache",
    "JoomlaConnector",
    "LocarnoConnector",
    "OrselinaConnector",
    "PerHostAutoThrottler",
    "RobotsGuard",
    "UrlState",
    "WordPressConnector",
    "contains_personal_data",
    "extract_civic_page",
    "parse_swiss_italian_date",
]
