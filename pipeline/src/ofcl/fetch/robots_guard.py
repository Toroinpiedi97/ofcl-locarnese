"""
Guardia robots.txt basata su Protego con cache 24h e rispetto rigoroso di NFR-04 e C-02.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx
from protego import Protego

DEFAULT_USER_AGENT = "OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)"
CACHE_TTL_SECONDS = 24 * 3600  # 24 ore


class RobotsGuard:
    """Interpreta e memorizza in cache (memoria + disco opzionale) i file robots.txt dei Comuni."""

    def __init__(
        self,
        *,
        user_agent: str = DEFAULT_USER_AGENT,
        cache_dir: Path | None = None,
        obey_robots: bool = True,
    ) -> None:
        self.user_agent = user_agent
        self.cache_dir = cache_dir
        self.obey_robots = obey_robots
        self._mem_cache: dict[str, tuple[float, Protego | None]] = {}
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _origin(url: str) -> str:
        parsed = urlparse(url)
        scheme = parsed.scheme or "https"
        netloc = parsed.netloc
        return f"{scheme}://{netloc}"

    def _disk_cache_path(self, origin: str) -> Path | None:
        if not self.cache_dir:
            return None
        safe_host = urlparse(origin).netloc.replace(":", "_")
        return self.cache_dir / f"robots_{safe_host}.json"

    async def _get_parser(self, url: str, client: httpx.AsyncClient) -> Protego | None:
        origin = self._origin(url)
        now = time.time()

        if origin in self._mem_cache:
            ts, parser = self._mem_cache[origin]
            if now - ts < CACHE_TTL_SECONDS:
                return parser

        disk_path = self._disk_cache_path(origin)
        if disk_path and disk_path.exists():
            try:
                payload = json.loads(disk_path.read_text(encoding="utf-8"))
                ts = float(payload.get("fetched_at", 0))
                txt = payload.get("content")
                if now - ts < CACHE_TTL_SECONDS and isinstance(txt, str):
                    parser = Protego.parse(txt)
                    self._mem_cache[origin] = (ts, parser)
                    return parser
            except Exception:  # noqa: BLE001, S110
                pass

        robots_url = f"{origin}/robots.txt"
        try:
            resp = await client.get(
                robots_url,
                headers={"User-Agent": self.user_agent},
                timeout=10.0,
                follow_redirects=True,
            )
            if resp.status_code == 200 and resp.text:
                parser = Protego.parse(resp.text)
                self._mem_cache[origin] = (now, parser)
                if disk_path:
                    try:
                        disk_path.write_text(
                            json.dumps({"fetched_at": now, "content": resp.text}),
                            encoding="utf-8",
                        )
                    except Exception:  # noqa: BLE001, S110
                        pass
                return parser
            if resp.status_code in (404, 410):
                # Nessun robots.txt presente -> tutto consentito tranne i guardrail espliciti
                empty_parser = Protego.parse("")
                self._mem_cache[origin] = (now, empty_parser)
                return empty_parser
        except Exception:  # noqa: BLE001, S110
            pass

        # In caso di errore transitorio o mock transport senza /robots.txt registrato,
        # restituiamo None (fallback sulle regole dichiarate in comuni.yaml).
        self._mem_cache[origin] = (now, None)
        return None

    async def can_fetch(self, url: str, client: httpx.AsyncClient) -> bool:
        """Verifica se l'URL è consentito da robots.txt e dai guardrail legali (C-02)."""
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        path = parsed.path or "/"

        # Guardrail C-02 inviolabile: Locarno vieta /files/ in robots.txt
        if "locarno.ch" in host and path.lower().startswith("/files/"):
            return False

        # Guardrail Lavertezzo T025: vietato /images/PDF/
        if "lavertezzo.ch" in host and "/images/" in path.lower():
            return False

        if not self.obey_robots:
            return True

        parser = await self._get_parser(url, client)
        if parser is None:
            return True

        return bool(parser.can_fetch(url, self.user_agent))

    async def get_effective_delay(
        self,
        url: str,
        configured_delay_s: float,
        client: httpx.AsyncClient,
    ) -> float:
        """Restituisce max(configured_delay_s, crawl_delay da robots.txt, 2.0s)."""
        base = max(float(configured_delay_s), 2.0)
        if not self.obey_robots:
            return base

        parser = await self._get_parser(url, client)
        if parser is None:
            return base

        robots_delay = parser.crawl_delay(self.user_agent) or parser.crawl_delay("*")
        if robots_delay is not None:
            try:
                return max(base, float(robots_delay))
            except (TypeError, ValueError):
                return base
        return base
