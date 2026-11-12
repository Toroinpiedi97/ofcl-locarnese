"""
Test per l'interfaccia a riga di comando (CLI) OFCL.
Verifica:
1. Validazione argomenti numerici (concurrency >= 1, max_pages >= 1).
2. Obbligatorietà di --version-id ed --entity-id con --db in extract.
3. Generazione corretta del report JSON in validate.
"""

import argparse
import json
from pathlib import Path
from typing import Any, Self

import pytest

from ofcl.cli import cmd_crawl, cmd_extract, cmd_validate
from ofcl.extract.pdf_inspector import PdfInspectionReport


def test_cli_crawl_validates_numeric_args() -> None:
    # Concurrency < 1
    args_bad_concurrency = argparse.Namespace(
        concurrency=0,
        max_pages=3,
        ust="all",
        dry_run=True,
        since=None,
        max_docs=10,
        no_r2=True,
        fast=True,
        resume=False,
        http_cache=False,
        output_json=None,
    )
    assert cmd_crawl(args_bad_concurrency) == 1

    # Max-pages < 1
    args_bad_pages = argparse.Namespace(
        concurrency=2,
        max_pages=0,
        ust="all",
        dry_run=True,
        since=None,
        max_docs=10,
        no_r2=True,
        fast=True,
        resume=False,
        http_cache=False,
        output_json=None,
    )
    assert cmd_crawl(args_bad_pages) == 1


def test_cli_extract_requires_uuids_when_db(tmp_path: Path) -> None:
    fake_pdf = tmp_path / "doc.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\n%%EOF")

    args = argparse.Namespace(
        pdf=str(fake_pdf),
        db=True,
        version_id=None,
        entity_id=None,
        output_json=None,
    )
    # Senza version_id ed entity_id restituisce 1
    assert cmd_extract(args) == 1


def test_cli_validate_missing_file() -> None:
    args = argparse.Namespace(pdf="/nonexistent/path/to/missing.pdf", output_json=None)
    assert cmd_validate(args) == 1


def test_cli_validate_json_output(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_pdf = tmp_path / "valid.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\n%%EOF")
    out_json = tmp_path / "validation_out.json"

    # Mock inspect_pdf per restituire un layout supportato
    inspection = PdfInspectionReport(
        pdf_path=fake_pdf,
        sha256="fake_sha256",
        page_count=1,
        has_text_layer=True,
        layout_family="GECOTI_V3",
        sections={"lett_a": [], "lett_o": [], "lett_f": []},
    )
    monkeypatch.setattr("ofcl.cli.inspect_pdf", lambda _: inspection)

    # Mock pdfplumber.open come context manager fittizio
    class MockPDF:
        def __init__(self) -> None:
            self.pages: list[Any] = []

        def __enter__(self) -> Self:
            return self

        def __exit__(self, *args: object) -> None:
            pass

    monkeypatch.setattr("pdfplumber.open", lambda _: MockPDF())

    args = argparse.Namespace(pdf=str(fake_pdf), output_json=str(out_json))
    cmd_validate(args)

    assert out_json.exists()
    data = json.loads(out_json.read_text(encoding="utf-8"))
    assert data["sha256"] == "fake_sha256"
    assert "checks" in data
    assert "signals" in data
    assert "status" in data
