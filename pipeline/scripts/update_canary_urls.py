"""
Script di verifica puntuale e assegnazione canary_url per i 19 Comuni del Locarnese (Task T009).
Esegue la scansione live con CorteseCrawler, identifica il documento canarino e aggiorna registry/comuni.yaml.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

from ofcl.fetch.crawler import USER_AGENT, CorteseCrawler
from ofcl.seed_ref import enforce_corfin_guardrail


async def run_audit_and_update() -> None:
    enforce_corfin_guardrail()
    repo_root = Path(__file__).resolve().parents[2]
    registry_path = repo_root / "registry" / "comuni.yaml"
    raw_pdf_dir = repo_root / "data" / "raw_pdfs"

    crawler = CorteseCrawler(registry_path, raw_pdf_dir)
    raw_data: list[dict[str, Any]] = yaml.safe_load(registry_path.read_text(encoding="utf-8"))

    now_iso = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    headers = {"User-Agent": USER_AGENT}

    print(f"[AUDIT LIVE T009] Inizio scansione puntuale sui {len(raw_data)} Comuni...")

    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        for m in raw_data:
            ust = m["ust_code"]
            name = m["name"]
            cms = m["cms_family"]

            docs = await crawler.scan_municipality(m, client, max_docs_per_source=10)
            if docs:
                canary = docs[0].doc_url
                print(
                    f"  -> {ust} {name:22} [{cms:12}] OK: {len(docs)} docs trovati | Canary: {canary}"
                )
            else:
                # Fallback: primo URL della fonte principale
                canary = m["sources"][0]["url"]
                print(
                    f"  -> {ust} {name:22} [{cms:12}] WARN: 0 docs trovati | Canary fallback: {canary}"
                )

            m["verified_at"] = now_iso
            m["canary_url"] = canary

    # Salva il file comuni.yaml aggiornato
    registry_path.write_text(
        yaml.dump(raw_data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )
    print(
        f"\n[AUDIT OK] Aggiornato {registry_path} per {len(raw_data)}/19 Comuni con verified_at={now_iso}"
    )


if __name__ == "__main__":
    asyncio.run(run_audit_and_update())
