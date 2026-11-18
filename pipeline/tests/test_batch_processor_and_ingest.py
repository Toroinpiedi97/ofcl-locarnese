"""
Test unitari per:
1. `ofcl.extract.batch_processor` (classificazione deterministica ed enrichment report crawler)
2. `ofcl.load.http_ingest` (serializzazione payload e sync HTTPS chunked con Bearer token)
3. `ofcl.cli._fetch_insights_via_http` e `cmd_insights --ingest-http`
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from ofcl.cli import _fetch_insights_via_http, cmd_insights
from ofcl.extract.batch_processor import (
    classify_document_metadata,
    enrich_crawl_report_with_extractions,
)
from ofcl.extract.pdf_inspector import PdfInspectionReport
from ofcl.load.http_ingest import (
    push_crawl_ingest_http,
    push_social_drafts_http,
    serialize_crawl_item_for_ingest,
)


def test_classify_document_metadata_detects_types_mm_and_year() -> None:
    cls_cons = classify_document_metadata(
        title="MM n. 14/2025 Consuntivo 2024 Comune di Locarno",
        url="https://www.locarno.ch/docs/consuntivo-2024.pdf",
        crawler_kind=None,
        crawler_year=None,
        mm_number=None,
        sections={"lett_a": [3], "lett_o": [18]},
        layout_family="GECOTI_V3",
    )
    assert cls_cons["doc_type"] == "CONSUNTIVO"
    assert cls_cons["fiscal_year"] == 2024
    assert cls_cons["mm_number"] == "MM 14/2025"
    assert cls_cons["method"] == "CONTENT"
    assert cls_cons["confidence"] >= 0.95

    cls_prev = classify_document_metadata(
        title="Messaggio Municipale 570 - Preventivo 2026",
        url="https://www.brione.ch/preventivo_2026.pdf",
        crawler_kind="ALTRO",
        crawler_year=2026,
        mm_number="MM 570",
        sections={},
        layout_family="GECOTI_V2",
    )
    assert cls_prev["doc_type"] == "PREVENTIVO"
    assert cls_prev["fiscal_year"] == 2026
    assert cls_prev["mm_number"] == "MM 570"
    assert cls_prev["method"] == "RULES"

    cls_cred = classify_document_metadata(
        title="Richiesta di credito per risanamento strada comunale",
        url="https://www.ascona.ch/credito-strada-2025.pdf",
        crawler_kind=None,
        crawler_year=None,
        mm_number=None,
        sections={},
        layout_family="UNKNOWN",
    )
    assert cls_cred["doc_type"] == "CREDITO_INVESTIMENTO"
    assert cls_cred["fiscal_year"] == 2025


def test_enrich_crawl_report_with_extractions_populates_bundle(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    ust_dir = tmp_path / "5096"
    ust_dir.mkdir(parents=True)
    sha = "a" * 64
    pdf_file = ust_dir / f"{sha}.pdf"
    pdf_file.write_bytes(b"%PDF-1.4\n%%EOF")

    fake_inspection = PdfInspectionReport(
        pdf_path=pdf_file,
        sha256=sha,
        page_count=12,
        has_text_layer=True,
        layout_family="GECOTI_V3",
        sections={"lett_a": [2], "lett_c": [4]},
        metadata={"title_hint": "MM 566 Consuntivo 2025"},
    )
    monkeypatch.setattr(
        "ofcl.extract.batch_processor.inspect_pdf", lambda _: fake_inspection
    )
    monkeypatch.setattr(
        "ofcl.extract.batch_processor._extract_financial_bundle",
        lambda *_args, **_kwargs: {
            "extracted_status": "NEEDS_REVIEW",
            "ledger_rows": [
                {
                    "statement": "CE",
                    "view_kind": "RIASSUNTO",
                    "function_code": None,
                    "account_code": "spese_operative",
                    "detail_code": None,
                    "label_raw": "Spese operative",
                    "column_role": "CURRENT",
                    "ref_year": 2025,
                    "value_kind": "ACTUAL",
                    "side": "SPESA",
                    "amount_chf": 1234567.89,
                    "amount_raw": "1'234'567.89",
                    "page": 2,
                    "bbox": [10.0, 20.0, 100.0, 35.0],
                    "method": "DETERMINISTIC",
                    "parser_version": "gecoti_v3",
                }
            ],
            "validation_results": [
                {
                    "rule_code": "V01",
                    "severity": "BLOCKING",
                    "passed": False,
                    "expected": 100.0,
                    "actual": 90.0,
                    "delta": 10.0,
                    "message": "Delta di 10.00 CHF su CE",
                }
            ],
            "credit_items": [],
        },
    )

    report: dict[str, Any] = {
        "results": [
            {
                "ust_code": 5096,
                "url": "https://www.brione.ch/mm566.pdf",
                "title": "Consuntivo 2025",
                "status": "DOWNLOADED",
                "sha256": sha,
                "size_bytes": 4096,
            },
            {
                "ust_code": 5096,
                "url": "https://www.brione.ch/naturalizzazione.pdf",
                "title": "Attinenza privata",
                "status": "SKIPPED_PRIVACY",
                "sha256": None,
                "size_bytes": 0,
            },
        ]
    }

    stats = enrich_crawl_report_with_extractions(report, tmp_path)
    assert stats == {
        "inspected": 1,
        "classified": 1,
        "extracted": 1,
        "validated": 0,
        "needs_review": 1,
    }
    first = report["results"][0]
    assert first["pages"] == 12
    assert first["has_text_layer"] is True
    assert first["extracted_status"] == "NEEDS_REVIEW"
    assert first["classification"]["doc_type"] == "CONSUNTIVO"
    assert len(first["ledger_rows"]) == 1
    assert len(first["validation_results"]) == 1


def test_serialize_crawl_item_for_ingest_handles_downloaded_and_privacy() -> None:
    downloaded = serialize_crawl_item_for_ingest(
        {
            "ust_code": 5113,
            "url": "https://www.locarno.ch/consuntivo2025.pdf",
            "title": "Consuntivo 2025",
            "published_date": "2026-04-15",
            "status": "DOWNLOADED",
            "sha256": "b" * 64,
            "size_bytes": 2048,
            "pages": 40,
            "has_text_layer": True,
            "extracted_status": "VALIDATED",
            "classification": {"doc_type": "CONSUNTIVO", "fiscal_year": 2025},
            "ledger_rows": [{"statement": "CE", "amount_chf": 100.0}],
            "validation_results": [{"rule_code": "V01", "passed": True}],
            "credit_items": [{"account_code": "501.01", "voted_credit": 50000.0}],
        }
    )
    assert downloaded["ust_code"] == 5113
    assert downloaded["contains_personal_data"] is False
    assert downloaded["version"]["storage_path"] == f"pdf/5113/{'b' * 64}.pdf"
    assert downloaded["version"]["status"] == "VALIDATED"
    assert downloaded["classification"]["doc_type"] == "CONSUNTIVO"
    assert len(downloaded["ledger_rows"]) == 1

    privacy = serialize_crawl_item_for_ingest(
        {
            "ust_code": 5113,
            "url": "https://www.locarno.ch/priv.pdf",
            "title": "Messaggio riservato",
            "status": "SKIPPED_PRIVACY",
            "size_bytes": 0,
        }
    )
    assert privacy["contains_personal_data"] is True
    assert "version" not in privacy


def test_push_crawl_ingest_http_chunks_runs_and_chaining(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_requests: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers.get("Authorization") == "Bearer super-secret"
        assert request.url.path == "/api/internal/crawl-ingest"
        body = json.loads(request.content.decode("utf-8"))
        captured_requests.append(body)
        return httpx.Response(
            200,
            json={
                "ok": True,
                "runId": "run-uuid-001",
                "docsUpserted": len(body.get("documents", [])),
                "versionsUpserted": len(body.get("documents", [])),
                "classificationsUpserted": 0,
                "ledgerRowsInserted": 0,
                "validationRowsInserted": 0,
                "creditRowsUpserted": 0,
                "warnings": [],
            },
        )

    transport = httpx.MockTransport(handler)
    real_client = httpx.Client
    monkeypatch.setattr(
        "ofcl.load.http_ingest.httpx.Client",
        lambda **kwargs: real_client(transport=transport, **kwargs),
    )

    report = {
        "started_at": "2026-11-18T03:00:00Z",
        "finished_at": "2026-11-18T03:01:00Z",
        "duration_seconds": 60.0,
        "sources_scanned": 19,
        "sources_failed": 1,
        "status_counts": {"DOWNLOADED": 3},
        "results": [
            {
                "ust_code": 5096 + i,
                "url": f"https://comune{i}.ch/doc.pdf",
                "status": "DOWNLOADED",
                "sha256": f"{i}" * 64,
                "size_bytes": 1024,
            }
            for i in range(3)
        ],
    }

    res = push_crawl_ingest_http(
        stage="CRAWL",
        git_sha="abc1234",
        report=report,
        chunk_size=2,
        site_url="https://ofcl.example.ch",
        secret="super-secret",
    )

    assert len(captured_requests) == 2
    assert captured_requests[0]["run"]["status"] == "RUNNING"
    assert "run_id" not in captured_requests[0]["run"]
    assert captured_requests[1]["run"]["run_id"] == "run-uuid-001"
    assert captured_requests[1]["run"]["status"] == "PARTIAL"
    assert "report" in captured_requests[1]["run"]
    assert res["run_id"] == "run-uuid-001"
    assert res["docs_upserted"] == 3


def test_push_crawl_ingest_http_raises_on_http_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "Non autorizzato"})

    transport = httpx.MockTransport(handler)
    real_client = httpx.Client
    monkeypatch.setattr(
        "ofcl.load.http_ingest.httpx.Client",
        lambda **kwargs: real_client(transport=transport, **kwargs),
    )

    with pytest.raises(RuntimeError, match="HTTP 401"):
        push_crawl_ingest_http(
            stage="CRAWL",
            git_sha="abc1234",
            report={"results": [], "status_counts": {}},
            site_url="https://ofcl.example.ch",
            secret="wrong",
        )


def test_push_social_drafts_http_and_fetch_insights_via_http(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.url.path == "/api/v1/comuni":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "ust_code": 5096,
                            "name": "Brione sopra Minusio",
                            "tax_multiplier_pf": 75,
                            "tax_multiplier_pg": 75,
                            "civic_tariffs": {"waste_fee_yearly_chf": 120},
                            "summary_30s": {"per_capita_operating_chf": 4500},
                        },
                        {
                            "ust_code": 5113,
                            "name": "Comune Incompleto",
                            "tax_multiplier_pf": None,
                            "tax_multiplier_pg": None,
                        },
                    ]
                },
            )
        if request.url.path == "/api/v1/crediti":
            return httpx.Response(200, json={"data": []})
        if request.url.path == "/api/internal/crawl-ingest":
            assert request.headers.get("Authorization") == "Bearer reval-secret"
            payload = json.loads(request.content.decode("utf-8"))
            return httpx.Response(
                200,
                json={"ok": True, "socialDraftsInserted": len(payload["social_drafts"])},
            )
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    real_client = httpx.Client
    monkeypatch.setattr(
        "ofcl.load.http_ingest.httpx.Client",
        lambda **kwargs: real_client(transport=transport, **kwargs),
    )
    monkeypatch.setattr(
        "httpx.Client",
        lambda **kwargs: real_client(transport=transport, **kwargs),
    )
    monkeypatch.setenv("SITE_URL", "https://ofcl.example.ch")
    monkeypatch.setenv("REVALIDATE_SECRET", "reval-secret")

    muns, creds = _fetch_insights_via_http("https://ofcl.example.ch")
    assert len(muns) == 2
    assert creds == []

    inserted = push_social_drafts_http(
        [{"signal_code": "S07", "title": "Test", "hook": "Hook"}]
    )
    assert inserted == 1

    # cmd_insights con --db --ingest-http non deve andare in crash sui moltiplicatori None
    out_file = Path("/tmp/test_insights_http_out.json")
    args = argparse.Namespace(
        year=2026,
        input_json=None,
        output_json=str(out_file),
        db=True,
        polish_ai=False,
        ingest_http=True,
    )
    exit_code = cmd_insights(args)
    assert exit_code == 0
    if out_file.exists():
        out_file.unlink()
