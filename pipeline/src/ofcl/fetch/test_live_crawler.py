"""
Test live del CorteseCrawler su 3 Comuni del Locarnese con famiglie CMS distinte:
- Ascona (UST 5091, Assolo.net)
- Brissago (UST 5097, WordPress)
- Lavertezzo (UST 5112, Joomla jDownloads)
"""

import asyncio
from pathlib import Path

import httpx

from ofcl.fetch.crawler import USER_AGENT, CorteseCrawler
from ofcl.seed_ref import enforce_corfin_guardrail


async def main() -> None:
    enforce_corfin_guardrail()
    repo_root = Path(__file__).resolve().parents[4]
    registry_path = repo_root / "registry" / "comuni.yaml"
    raw_pdf_dir = repo_root / "data" / "raw_pdfs"

    crawler = CorteseCrawler(registry_path, raw_pdf_dir)
    target_slugs = {"ascona", "brissago", "lavertezzo"}
    targets = [m for m in crawler.municipalities if m["slug"] in target_slugs]

    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
        for m in targets:
            print(f"\n[CRAWL LIVE] Scansione Comune di {m['name']} (UST {m['ust_code']}, CMS {m['cms_family']})...")
            docs = await crawler.scan_municipality(m, client, max_docs_per_source=5)
            print(f"  -> Trovati {len(docs)} documenti candidati:")
            for d in docs[:4]:
                priv_flag = " [⚠️ nLPD ESCLUSO]" if d.contains_personal_data else ""
                print(f"     - [{d.doc_kind}] {d.title[:65]}... (Anno: {d.fiscal_year}, MM: {d.mm_number}){priv_flag}")
                print(f"       URL: {d.doc_url}")


if __name__ == "__main__":
    asyncio.run(main())
