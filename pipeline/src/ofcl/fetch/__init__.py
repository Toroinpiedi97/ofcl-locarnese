"""
Modulo di acquisizione e crawling cortese dei 19 Comuni del Locarnese.
"""

from ofcl.fetch.connectors import (
    AssoloConnector,
    JoomlaConnector,
    LocarnoConnector,
    OrselinaConnector,
    WordPressConnector,
)
from ofcl.fetch.crawler import CorteseCrawler
from ofcl.fetch.models import DiscoveredDocument, DocKind
from ofcl.fetch.privacy_filter import contains_personal_data

__all__ = [
    "AssoloConnector",
    "CorteseCrawler",
    "DiscoveredDocument",
    "DocKind",
    "JoomlaConnector",
    "LocarnoConnector",
    "OrselinaConnector",
    "WordPressConnector",
    "contains_personal_data",
]
