"""
Modulo di Classificazione Atti e Normalizzazione MCA2 per OFCL (Task T030).
"""

from ofcl.classify.classifier import (
    DocumentClassification,
    canonical_mm,
    classify_document,
    classify_text_metadata,
    inspect_and_classify_pdf,
)

__all__ = [
    "DocumentClassification",
    "canonical_mm",
    "classify_document",
    "classify_text_metadata",
    "inspect_and_classify_pdf",
]
