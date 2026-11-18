"""
Sincronizzazione HTTPS verso `/api/internal/crawl-ingest` su Vercel/Next.js.

Risolve il limite infrastrutturale dei runner GitHub Actions (solo IPv4) rispetto
all'host diretto `db.<ref>.supabase.co` (IPv6-only): trasmette documenti, versioni,
classificazioni, righe contabili, validazioni e bozze social attraverso il gateway
HTTPS autenticato con `REVALIDATE_SECRET`.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from ofcl.seed_ref import enforce_corfin_guardrail


def _resolve_ingest_target(
    site_url: str | None = None,
    secret: str | None = None,
) -> tuple[str, str] | None:
    enforce_corfin_guardrail()
    resolved_site = (site_url or os.environ.get("SITE_URL") or "").strip().rstrip("/")
    resolved_secret = (secret or os.environ.get("REVALIDATE_SECRET") or "").strip()
    if not resolved_site or not resolved_secret:
        return None
    if not resolved_site.startswith(("https://", "http://")):
        return None
    return resolved_site, resolved_secret


def serialize_crawl_item_for_ingest(item: dict[str, Any]) -> dict[str, Any]:
    """Converte un elemento di `report['results']` nello schema atteso da `/api/internal/crawl-ingest`."""
    ust_code = int(item["ust_code"])
    origin_url = str(item["url"])
    status = item.get("status")
    sha256 = item.get("sha256")
    size_bytes = int(item.get("size_bytes") or 0)
    storage_path = item.get("r2_key") or (
        f"pdf/{ust_code}/{sha256}.pdf" if sha256 else None
    )

    doc_payload: dict[str, Any] = {
        "ust_code": ust_code,
        "origin_url": origin_url,
        "title_raw": item.get("title"),
        "published_on": item.get("published_date"),
        "acquisition": "CRAWLER",
        "contains_personal_data": status == "SKIPPED_PRIVACY",
    }

    if (
        status in ("DOWNLOADED", "CACHED")
        and sha256
        and size_bytes > 0
        and storage_path
    ):
        doc_payload["version"] = {
            "sha256": sha256,
            "storage_path": storage_path,
            "bytes": size_bytes,
            "mime": "application/pdf",
            "pages": item.get("pages"),
            "has_text_layer": item.get("has_text_layer"),
            "status": item.get("extracted_status") or "DOWNLOADED",
        }
        if item.get("classification"):
            doc_payload["classification"] = item["classification"]
        if item.get("ledger_rows"):
            doc_payload["ledger_rows"] = item["ledger_rows"]
        if item.get("validation_results"):
            doc_payload["validation_results"] = item["validation_results"]
        if item.get("credit_items"):
            doc_payload["credit_items"] = item["credit_items"]

    return doc_payload


def _compact_report_summary(report: dict[str, Any]) -> dict[str, Any]:
    """Summary compatto per `raw.pipeline_run.report` senza duplicare array giganteschi."""
    return {
        "started_at": report.get("started_at"),
        "finished_at": report.get("finished_at"),
        "duration_seconds": report.get("duration_seconds"),
        "dry_run": report.get("dry_run", False),
        "target_municipalities_count": report.get("target_municipalities_count"),
        "total_discovered_docs": report.get("total_discovered_docs"),
        "sources_scanned": report.get("sources_scanned"),
        "sources_failed": report.get("sources_failed"),
        "uploads_failed": report.get("uploads_failed"),
        "robots_denied": report.get("robots_denied"),
        "status_counts": report.get("status_counts"),
        "total_bytes_downloaded": report.get("total_bytes_downloaded"),
        "enrichment_stats": report.get("enrichment_stats"),
        "canary_checks": report.get("canary_checks", []),
    }


def push_crawl_ingest_http(
    *,
    stage: str,
    git_sha: str,
    report: dict[str, Any],
    chunk_size: int = 20,
    site_url: str | None = None,
    secret: str | None = None,
) -> dict[str, Any]:
    """Invia run e documenti a `/api/internal/crawl-ingest` in batch compatibili con Vercel."""
    target = _resolve_ingest_target(site_url=site_url, secret=secret)
    if not target:
        raise RuntimeError(
            "SITE_URL o REVALIDATE_SECRET non configurati: impossibile eseguire ingest HTTPS."
        )

    base_url, bearer = target
    endpoint = f"{base_url}/api/internal/crawl-ingest"
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Type": "application/json",
    }

    run_status = "OK"
    if (
        report.get("sources_scanned", 0) > 0
        and report.get("sources_failed", 0) >= report.get("sources_scanned", 0)
    ):
        run_status = "FAILED"
    elif (
        report.get("status_counts", {}).get("ERROR", 0) > 0
        or report.get("sources_failed", 0) > 0
    ):
        run_status = "PARTIAL"

    docs = [
        serialize_crawl_item_for_ingest(item)
        for item in report.get("results", [])
    ]
    compact_report = _compact_report_summary(report)

    totals: dict[str, Any] = {
        "run_id": None,
        "docs_upserted": 0,
        "versions_upserted": 0,
        "classifications_upserted": 0,
        "ledger_rows_inserted": 0,
        "validation_rows_inserted": 0,
        "credit_rows_upserted": 0,
        "warnings": [],
    }

    batches = [docs[i : i + chunk_size] for i in range(0, len(docs), chunk_size)] or [[]]

    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        for idx, batch in enumerate(batches):
            is_last = idx == len(batches) - 1
            run_payload: dict[str, Any] = {
                "stage": stage,
                "git_sha": git_sha,
                "started_at": report.get("started_at"),
                "status": run_status if is_last else "RUNNING",
            }
            if totals["run_id"]:
                run_payload["run_id"] = totals["run_id"]
            if is_last:
                run_payload["finished_at"] = report.get("finished_at")
                run_payload["report"] = compact_report

            payload = {
                "run": run_payload,
                "documents": batch,
            }

            resp = client.post(endpoint, headers=headers, json=payload)
            if resp.status_code >= 400:
                raise RuntimeError(
                    f"HTTP {resp.status_code} su {endpoint}: {resp.text[:400]}"
                )
            body = resp.json()
            if not body.get("ok"):
                raise RuntimeError(f"Ingest rifiutato dal server: {body}")

            if body.get("runId") and not totals["run_id"]:
                totals["run_id"] = body["runId"]
            totals["docs_upserted"] += int(body.get("docsUpserted") or 0)
            totals["versions_upserted"] += int(body.get("versionsUpserted") or 0)
            totals["classifications_upserted"] += int(
                body.get("classificationsUpserted") or 0
            )
            totals["ledger_rows_inserted"] += int(body.get("ledgerRowsInserted") or 0)
            totals["validation_rows_inserted"] += int(
                body.get("validationRowsInserted") or 0
            )
            totals["credit_rows_upserted"] += int(body.get("creditRowsUpserted") or 0)
            totals["warnings"].extend(body.get("warnings") or [])

    return totals


def push_social_drafts_http(
    drafts: list[Any],
    *,
    site_url: str | None = None,
    secret: str | None = None,
) -> int:
    """Invia le bozze social generate da `ofcl insights` a `/api/internal/crawl-ingest`."""
    if not drafts:
        return 0
    target = _resolve_ingest_target(site_url=site_url, secret=secret)
    if not target:
        raise RuntimeError(
            "SITE_URL o REVALIDATE_SECRET non configurati: impossibile inviare bozze social."
        )

    base_url, bearer = target
    endpoint = f"{base_url}/api/internal/crawl-ingest"
    headers = {
        "Authorization": f"Bearer {bearer}",
        "Content-Type": "application/json",
    }

    serialized = [d.to_dict() if hasattr(d, "to_dict") else dict(d) for d in drafts]
    inserted = 0
    with httpx.Client(timeout=45.0, follow_redirects=True) as client:
        for i in range(0, len(serialized), 20):
            batch = serialized[i : i + 20]
            resp = client.post(
                endpoint,
                headers=headers,
                json={"social_drafts": batch},
            )
            if resp.status_code >= 400:
                raise RuntimeError(
                    f"HTTP {resp.status_code} su {endpoint}: {resp.text[:400]}"
                )
            body = resp.json()
            inserted += int(body.get("socialDraftsInserted") or 0)

    return inserted
