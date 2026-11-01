"""
Modulo di interazione con Cloudflare R2 Object Storage (compatibile S3).

Conserva i PDF ufficiali dei 19 Comuni del Locarnese con:
1. Deduplicazione crittografica tramite hash SHA-256.
2. Percorso normalizzato: pdf/{ust_code}/{sha256}.pdf.
3. Zero costi di traffico in uscita (egress) per la consultazione pubblica.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config

from ofcl.seed_ref import enforce_corfin_guardrail


def load_env_local(env_path: Path | None = None) -> None:
    """Carica le variabili da .env.local se presenti."""
    if env_path is None:
        repo_root = Path(__file__).resolve().parents[4]
        env_path = repo_root / ".env.local"

    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)


def get_r2_client() -> tuple[Any, str]:
    """Inizializza e restituisce il client boto3 configurato per Cloudflare R2."""
    enforce_corfin_guardrail()
    load_env_local()

    endpoint_url = os.environ.get("R2_ENDPOINT_URL")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    bucket_name = os.environ.get("R2_BUCKET_NAME", "ofcl-raw-pdfs")

    if not (endpoint_url and access_key and secret_key):
        raise ValueError(
            "Credenziali Cloudflare R2 mancanti in .env.local. "
            "Verifica R2_ENDPOINT_URL, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY."
        )

    client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return client, bucket_name


def upload_pdf_to_r2(pdf_path: Path, ust_code: int, sha256: str) -> str:
    """Carica un file PDF su Cloudflare R2 e restituisce la storage key."""
    client, bucket = get_r2_client()
    key = f"pdf/{ust_code}/{sha256}.pdf"

    with open(pdf_path, "rb") as f:
        client.upload_fileobj(
            f,
            bucket,
            key,
            ExtraArgs={
                "ContentType": "application/pdf",
                "Metadata": {
                    "ust-code": str(ust_code),
                    "sha256": sha256,
                },
            },
        )
    return key


def list_r2_bucket_objects(prefix: str = "pdf/") -> list[dict[str, Any]]:
    """Elenca gli oggetti archiviati nel bucket R2."""
    client, bucket = get_r2_client()
    resp = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
    contents = resp.get("Contents", [])
    return [
        {
            "key": obj["Key"],
            "size_bytes": obj["Size"],
            "last_modified": str(obj["LastModified"]),
        }
        for obj in contents
    ]
