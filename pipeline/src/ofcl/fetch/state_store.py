"""
Persistenza dello stato di crawling (ETag, Last-Modified, SHA-256, Resume) e HTTP Disk Cache.

Ispirato a HttpCacheMiddleware e JOBDIR di Scrapy:
1. CrawlStateStore memorizza ETag, Last-Modified e SHA-256 per inviare richieste condizionali
   reali (If-None-Match / If-Modified-Since) ed evitare riscaricamenti inutili dei PDF.
2. HttpDiskCache memorizza su disco le pagine HTML degli indici durante lo sviluppo/debug.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass
class UrlState:
    """Stato noto di un URL documento."""

    url: str
    ust_code: int
    etag: str | None = None
    last_modified: str | None = None
    sha256: str | None = None
    size_bytes: int = 0
    status: str = "DISCOVERED"
    last_checked_at: str = ""


class CrawlStateStore:
    """Archivio persistente (JSON atomico) degli URL già acquisiti e dei Comuni completati."""

    def __init__(self, state_file: Path | None = None) -> None:
        self.state_file = state_file
        self.urls: dict[str, UrlState] = {}
        self.completed_usts: set[int] = set()
        if self.state_file and self.state_file.exists():
            self.load()

    def load(self) -> None:
        if not self.state_file or not self.state_file.exists():
            return
        try:
            raw = json.loads(self.state_file.read_text(encoding="utf-8"))
            for url, entry in raw.get("urls", {}).items():
                self.urls[url] = UrlState(
                    url=url,
                    ust_code=int(entry.get("ust_code", 0)),
                    etag=entry.get("etag"),
                    last_modified=entry.get("last_modified"),
                    sha256=entry.get("sha256"),
                    size_bytes=int(entry.get("size_bytes", 0)),
                    status=str(entry.get("status", "DISCOVERED")),
                    last_checked_at=str(entry.get("last_checked_at", "")),
                )
            self.completed_usts = {int(u) for u in raw.get("completed_usts", [])}
        except Exception:  # noqa: BLE001, S110
            pass

    def save(self) -> None:
        if not self.state_file:
            return
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.state_file.with_suffix(".tmp")
        payload = {
            "updated_at": datetime.now(UTC).isoformat(),
            "completed_usts": sorted(self.completed_usts),
            "urls": {u: asdict(st) for u, st in self.urls.items()},
        }
        tmp_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp_path.replace(self.state_file)

    def get(self, url: str) -> UrlState | None:
        return self.urls.get(url)

    def update_url(
        self,
        url: str,
        ust_code: int,
        *,
        etag: str | None = None,
        last_modified: str | None = None,
        sha256: str | None = None,
        size_bytes: int | None = None,
        status: str = "DOWNLOADED",
    ) -> UrlState:
        existing = self.urls.get(url)
        state = UrlState(
            url=url,
            ust_code=ust_code,
            etag=etag if etag is not None else (existing.etag if existing else None),
            last_modified=(
                last_modified
                if last_modified is not None
                else (existing.last_modified if existing else None)
            ),
            sha256=sha256 if sha256 is not None else (existing.sha256 if existing else None),
            size_bytes=(
                size_bytes
                if size_bytes is not None
                else (existing.size_bytes if existing else 0)
            ),
            status=status,
            last_checked_at=datetime.now(UTC).isoformat(),
        )
        self.urls[url] = state
        return state

    def mark_municipality_completed(self, ust_code: int) -> None:
        self.completed_usts.add(ust_code)
        self.save()

    def is_municipality_completed(self, ust_code: int) -> bool:
        return ust_code in self.completed_usts

    def reset_completed_usts(self) -> None:
        self.completed_usts.clear()
        self.save()


class HttpDiskCache:
    """Cache disco su file per risposte HTML/JSON durante lo sviluppo e i test riproducibili."""

    def __init__(self, cache_dir: Path | None = None, *, enabled: bool = False) -> None:
        self.cache_dir = cache_dir
        self.enabled = enabled and cache_dir is not None
        if self.enabled and self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _key_path(self, url: str) -> Path | None:
        if not self.enabled or not self.cache_dir:
            return None
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.json"

    def get(self, url: str) -> dict[str, Any] | None:
        path = self._key_path(url)
        if not path or not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "text" in data:
                return data
        except Exception:  # noqa: BLE001, S110
            pass
        return None

    def put(self, url: str, status_code: int, text: str, final_url: str | None = None) -> None:
        path = self._key_path(url)
        if not path:
            return
        try:
            payload = {
                "url": url,
                "final_url": final_url or url,
                "status_code": status_code,
                "cached_at": datetime.now(UTC).isoformat(),
                "text": text,
            }
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except Exception:  # noqa: BLE001, S110
            pass
