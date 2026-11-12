"""
Motore di Concorrenza per-Dominio, AutoThrottle basato su latenza EWMA e Retry con Retry-After.

Ispirato all'architettura AutoThrottle e Downloader Middleware di Scrapy:
- Massimo N Comuni scansionati in parallelo (default: 6).
- Massimo 1 richiesta attiva per singolo dominio (asyncio.Lock per host).
- Adattamento dinamico del delay in base alla latenza di risposta del server comunale.
- Retry esponenziale cortese su errori di rete e codici HTTP 429/500/502/503/504.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

RETRYABLE_STATUS_CODES: frozenset[int] = frozenset({429, 500, 502, 503, 504})


@dataclass
class HostStats:
    """Statistiche di latenza e throttling per singolo dominio comunale."""

    requests_count: int = 0
    retries_count: int = 0
    ewma_latency_s: float = 0.25
    last_request_finished_at: float = 0.0
    last_delay_applied_s: float = 0.0


class PerHostAutoThrottler:
    """Coordina l'accesso concorrente tra host distinti e serializza le chiamate per singolo host."""

    def __init__(
        self,
        *,
        max_concurrent_hosts: int = 6,
        fast_mode: bool = False,
        target_concurrency: float = 1.0,
        max_delay_s: float = 60.0,
        max_retries: int = 3,
        base_backoff_s: float = 1.5,
    ) -> None:
        self.max_concurrent_hosts = max(1, max_concurrent_hosts)
        self.fast_mode = fast_mode
        self.target_concurrency = max(0.5, target_concurrency)
        self.max_delay_s = max_delay_s
        self.max_retries = max(0, max_retries)
        self.base_backoff_s = base_backoff_s

        self._global_sem = asyncio.Semaphore(self.max_concurrent_hosts)
        self._host_locks: dict[str, asyncio.Lock] = {}
        self._host_stats: dict[str, HostStats] = {}

    def _get_lock(self, host: str) -> asyncio.Lock:
        if host not in self._host_locks:
            self._host_locks[host] = asyncio.Lock()
        return self._host_locks[host]

    def _get_stats(self, host: str) -> HostStats:
        if host not in self._host_stats:
            self._host_stats[host] = HostStats()
        return self._host_stats[host]

    def compute_delay(self, host: str, min_host_delay_s: float) -> float:
        """Calcola il delay AutoThrottle tra due richieste consecutive verso lo stesso host."""
        if self.fast_mode or min_host_delay_s <= 0:
            return 0.0
        stats = self._get_stats(host)
        # Come in Scrapy AutoThrottle: target_delay = latency / target_concurrency,
        # ma mai inferiore al min_host_delay_s dichiarato.
        adaptive_target = stats.ewma_latency_s / self.target_concurrency
        delay = max(float(min_host_delay_s), adaptive_target)
        return min(self.max_delay_s, delay)

    @staticmethod
    def _parse_retry_after(header_val: str | None, fallback_s: float) -> float:
        if not header_val:
            return fallback_s
        try:
            return max(0.1, min(60.0, float(header_val.strip())))
        except ValueError:
            return fallback_s

    async def acquire(self, host: str, min_delay_s: float = 2.0) -> None:
        """Attende il delay necessario prima di iniziare un'operazione verso un host."""
        required_delay = self.compute_delay(host, min_delay_s)
        stats = self._get_stats(host)
        if required_delay > 0 and stats.last_request_finished_at > 0:
            elapsed = time.monotonic() - stats.last_request_finished_at
            remaining = required_delay - elapsed
            if remaining > 0:
                await asyncio.sleep(remaining)
                stats.last_delay_applied_s = remaining

    async def request(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        *,
        min_delay_s: float = 2.0,
        headers: dict[str, str] | None = None,
        timeout: float = 30.0,
        **kwargs: Any,
    ) -> httpx.Response:
        """Esegue una richiesta HTTP rispettando il lock per-host, AutoThrottle e Retry."""
        host = urlparse(url).netloc.lower() or "default"
        host_lock = self._get_lock(host)
        stats = self._get_stats(host)

        async with self._global_sem, host_lock:
            await self.acquire(host, min_delay_s)

            last_exc: Exception | None = None
            req_kwargs = {"follow_redirects": True, **kwargs}
            for attempt in range(self.max_retries + 1):
                t0 = time.monotonic()
                try:
                    resp = await client.request(
                        method,
                        url,
                        headers=headers,
                        timeout=timeout,
                        **req_kwargs,
                    )
                    latency = max(0.001, time.monotonic() - t0)
                    stats.requests_count += 1
                    stats.ewma_latency_s = (stats.ewma_latency_s * 0.7) + (latency * 0.3)
                    stats.last_request_finished_at = time.monotonic()

                    if resp.status_code in RETRYABLE_STATUS_CODES and attempt < self.max_retries:
                        stats.retries_count += 1
                        backoff = self.base_backoff_s * (2**attempt)
                        wait_s = self._parse_retry_after(resp.headers.get("Retry-After"), backoff)
                        if self.fast_mode:
                            wait_s = min(wait_s, 0.05)
                        await asyncio.sleep(wait_s)
                        continue

                    return resp

                except (httpx.TimeoutException, httpx.TransportError) as exc:
                    last_exc = exc
                    stats.last_request_finished_at = time.monotonic()
                    if attempt < self.max_retries:
                        stats.retries_count += 1
                        wait_s = 0.05 if self.fast_mode else self.base_backoff_s * (2**attempt)
                        await asyncio.sleep(wait_s)
                        continue
                    raise

            if last_exc:
                raise last_exc
            raise httpx.RequestError(f"Richiesta fallita dopo {self.max_retries} tentativi: {url}")

    def get_metrics_summary(self) -> dict[str, dict[str, Any]]:
        """Restituisce le metriche di latenza e retry per ciascun host visitato."""
        return {
            host: {
                "requests_count": st.requests_count,
                "retries_count": st.retries_count,
                "ewma_latency_ms": round(st.ewma_latency_s * 1000, 2),
                "last_delay_applied_s": round(st.last_delay_applied_s, 2),
            }
            for host, st in sorted(self._host_stats.items())
        }
