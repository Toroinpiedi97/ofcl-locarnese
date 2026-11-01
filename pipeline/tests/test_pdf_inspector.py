"""
Test per PdfInspector (Task T032).
Verifica:
1. Rilevamento layout family (GECOTI_V3, SCAN_IMAGE, etc.).
2. Indicizzazione sezioni art. 22 RGFCC (lett. a, lett. c, lett. f, lett. o).
3. Estrazione metadati (moltiplicatore d'imposta, timestamp Ge.Co.Ti.).
"""

from pathlib import Path

import pytest

from ofcl.extract.pdf_inspector import PdfInspector, inspect_pdf

BRIONE_PDF_PATH = Path("../data/raw_pdfs/5096/168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf")


@pytest.mark.skipif(not BRIONE_PDF_PATH.exists(), reason="PDF reale Brione non presente localmente")
def test_inspect_real_brione_consuntivo_2025() -> None:
    report = inspect_pdf(BRIONE_PDF_PATH)
    assert report.page_count == 152
    assert report.has_text_layer is True
    assert report.layout_family == "GECOTI_V3"
    assert report.sha256 == "168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee"

    # Sezioni canoniche art. 22 RGFCC
    assert 5 in report.sections["lett_a"]
    assert 12 in report.sections["lett_o"]
    assert 98 in report.sections["lett_c"]
    assert 126 in report.sections["lett_f"]
    assert 127 in report.sections["lett_f"]

    # Metadati
    assert report.metadata.get("tax_multiplier_pct") == 78.0
    assert "20.08.2026" in report.metadata.get("generation_timestamp", "")


def test_inspector_empty_or_nonexistent(tmp_path: Path) -> None:
    fake_pdf = tmp_path / "empty.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4\n%%EOF")
    inspector = PdfInspector(fake_pdf)
    report = inspector.inspect()
    assert report.has_text_layer is False
    assert report.layout_family == "SCAN_IMAGE"
