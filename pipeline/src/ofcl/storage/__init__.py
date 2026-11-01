"""Modulo di storage immutabile per OFCL (Cloudflare R2)."""

from ofcl.storage.r2 import (
    get_r2_client,
    list_r2_bucket_objects,
    upload_pdf_to_r2,
)

__all__ = [
    "get_r2_client",
    "list_r2_bucket_objects",
    "upload_pdf_to_r2",
]
