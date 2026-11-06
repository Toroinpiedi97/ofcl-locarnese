"""
Motore DOM Auto-Adattivo (Self-Healing) basato su Scrapling v0.5.1 Selector.

Risolve il rischio C-13 (drift HTML dei portali comunali):
1. Quando i selettori CSS primari trovano elementi validi, salva l'impronta strutturale
   in `registry/adaptive_selectors.sqlite` (`auto_save=True`).
2. Se un Comune aggiorna il tema o rinomina le classi CSS e il selettore primario restituisce 0
   elementi, attiva la rilocazione adattiva (`adaptive=True`) + `find_similar()` e verifica
   ogni candidato con una funzione invariante (`href_validator`), segnalando `relocated=True`.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from scrapling.parser import Selector


def get_default_adaptive_db_path() -> Path:
    """Restituisce il percorso canonico del DB SQLite delle impronte adattive in registry/."""
    repo_root = Path(__file__).resolve().parents[4]
    registry_dir = repo_root / "registry"
    registry_dir.mkdir(parents=True, exist_ok=True)
    return registry_dir / "adaptive_selectors.sqlite"


class AdaptiveDOM:
    """Wrapper su Scrapling Selector v0.5 con persistenza SQLite e verifica invarianti."""

    def __init__(
        self,
        html: str,
        page_url: str,
        *,
        storage_file: Path | None = None,
    ) -> None:
        self.html = html
        self.page_url = page_url
        parsed = urlparse(page_url)
        self.domain = (parsed.netloc or "default").lower()
        db_path = storage_file or get_default_adaptive_db_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)

        self.selector = Selector(
            html,
            url=self.domain,
            adaptive=True,
            storage_args={"storage_file": str(db_path), "url": self.domain},
        )

    def select_links(
        self,
        css_query: str,
        *,
        identifier: str,
        href_validator: Callable[[str], bool],
        min_similarity: int = 35,
    ) -> tuple[list[Any], bool]:
        """
        Seleziona i nodi <a> validi usando il selettore primario (con auto_save=True)
        e passa alla rilocazione adattiva se il selettore primario non produce risultati validi.

        Restituisce `(elementi_validati, relocated)`.
        """
        # 1. Tentativo con selettore primario e salvataggio impronta
        try:
            primary_matches = self.selector.css(
                css_query,
                identifier=identifier,
                auto_save=True,
            )
        except Exception:  # noqa: BLE001
            primary_matches = self.selector.css(css_query)

        valid_primary = [
            el for el in primary_matches if href_validator(str(el.attrib.get("href", "")).strip())
        ]
        if valid_primary:
            return valid_primary, False

        # 2. Tentativo di rilocazione auto-adattiva (Self-Healing)
        candidates: list[Any] = []
        try:
            relocated = self.selector.css(
                css_query,
                identifier=identifier,
                adaptive=True,
                percentage=min_similarity,
            )
            if relocated:
                seen_hrefs: set[str] = set()
                for item in relocated:
                    h = str(item.attrib.get("href", "")).strip()
                    if h and h not in seen_hrefs:
                        seen_hrefs.add(h)
                        candidates.append(item)

                # Espande con elementi strutturalmente simili nella stessa pagina
                first_el = relocated[0]
                for sim in first_el.find_similar(similarity_threshold=0.25):
                    h = str(sim.attrib.get("href", "")).strip()
                    if h and h not in seen_hrefs:
                        seen_hrefs.add(h)
                        candidates.append(sim)
        except Exception:  # noqa: BLE001
            candidates = []

        valid_relocated = [
            el for el in candidates if href_validator(str(el.attrib.get("href", "")).strip())
        ]
        if valid_relocated:
            return valid_relocated, True

        return [], False
