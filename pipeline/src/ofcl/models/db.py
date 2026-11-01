"""
Modelli Pydantic v2 per le tabelle relazionali Supabase di OFCL:
- Schemi: ref, raw, core, audit
- Allineato con le migrazioni SQL 0001, 0002, 0003, 0004
- Conforme a precisione MCA2 al centesimo (Decimal con 2 decimali)
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl

# =========================================================
# SCHEMA: ref
# =========================================================

class MunicipalityRecord(BaseModel):
    ust_code: int = Field(ge=5091, le=5399)
    slug: str
    name: str
    seat: str
    circle: str
    district_code: int = 2104
    cms_family: Literal["ASSOLO", "WORDPRESS", "JOOMLA", "CUSTOM_PHP", "CITY_LOCARNO"]
    valid_from: date | None = None
    merger_note: str | None = None
    active: bool = True


class EntityRecord(BaseModel):
    id: int | None = None
    ust_code: int
    kind: Literal["COMUNE", "AAP", "AE", "PORTO", "CASA_ANZIANI", "ENTE_AUTONOMO", "ALTRO"]
    name: str
    aliases: list[str] = Field(default_factory=list)
    is_default: bool = False
    valid_from: date | None = None
    valid_to: date | None = None


class AccountMCA2Record(BaseModel):
    code: str
    level: int = Field(ge=1, le=4)
    parent_code: str | None = None
    label_it: str
    statement: Literal["CE", "CI", "BI"]
    source_url: str


class FunctionMCA2Record(BaseModel):
    code: str
    level: int = Field(ge=1, le=3)
    parent_code: str | None = None
    label_it: str


class PopulationRecord(BaseModel):
    ust_code: int
    year: int = Field(ge=2019, le=2050)
    residents: int = Field(gt=0)
    definition: str = "STATPOP_RESIDENTE_PERMANENTE_31_12"
    source_url: str


class TaxMultiplierRecord(BaseModel):
    ust_code: int
    year: int = Field(ge=2019, le=2050)
    pf_pct: Decimal = Field(ge=0, le=200)
    pg_pct: Decimal = Field(ge=0, le=200)
    source_url: str
    verification: Literal["VERIFIED", "SEED_UNCONFIRMED"] = "VERIFIED"


class IndicatorDefRecord(BaseModel):
    code: str
    label_it: str
    formula_text: str
    unit: Literal["PCT", "CHF_PER_CAPITA", "INDEX"]
    higher_is_better: bool


class IndicatorScaleRecord(BaseModel):
    id: int | None = None
    indicator_code: str
    valid_from: date
    band_order: int
    lower_bound: Decimal | None = None
    upper_bound: Decimal | None = None
    label_it: str
    color_token: Literal["good", "warning", "critical"]
    source_url: str


class CivicBenefitDefRecord(BaseModel):
    code: str
    quadrant: Literal["A_TARIFFE", "B_FAMIGLIE", "C_TERZA_ETA", "D_CLIMA_MOBILITA", "E_FISCO_SPORTELLO"]
    label_it: str
    unit_hint: str
    sort_order: int = 100


class MunicipalCivicItemRecord(BaseModel):
    ust_code: int
    benefit_code: str
    valid_year: int
    status: Literal["ACTIVE", "NOT_APPLICABLE", "UNVERIFIED"] = "UNVERIFIED"
    value_display: str
    amount_min_chf: Decimal | None = None
    amount_max_chf: Decimal | None = None
    pct_value: Decimal | None = None
    conditions_short: str | None = None
    ordinance_ref: str | None = None
    source_url: HttpUrl
    verified_at: datetime | None = None


# =========================================================
# SCHEMA: raw
# =========================================================

class RawSourceRecord(BaseModel):
    id: UUID | None = None
    ust_code: int
    kind: Literal["MM_INDEX", "CONTI_INDEX", "ALBO", "SESSION_INDEX", "WP_CATEGORY", "MANUAL"]
    url: str
    robots_allowed: bool | None = None
    crawl_delay_s: int | None = None
    last_checked_at: datetime | None = None
    last_ok_at: datetime | None = None
    active: bool = True


class RawPipelineRunRecord(BaseModel):
    id: UUID | None = None
    stage: Literal["CRAWL", "EXTRACT", "VALIDATE", "PUBLISH", "EXPORT"]
    git_sha: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    status: Literal["RUNNING", "OK", "PARTIAL", "FAILED"] = "RUNNING"
    report: dict[str, Any] | None = None


class RawDocumentRecord(BaseModel):
    id: UUID | None = None
    ust_code: int
    source_id: UUID | None = None
    origin_url: str
    title_raw: str | None = None
    published_on: date | None = None
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    offline_since: datetime | None = None
    acquisition: Literal["CRAWLER", "MANUAL_UPLOAD", "LIT_REQUEST"] = "CRAWLER"
    contains_personal_data: bool = False


class RawDocumentVersionRecord(BaseModel):
    id: UUID | None = None
    document_id: UUID
    sha256: str = Field(min_length=64, max_length=64)
    file_size_bytes: int = Field(gt=0)
    page_count: int = Field(gt=0)
    storage_path: str
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: datetime | None = None
    status: Literal["DOWNLOADED", "CLASSIFIED", "EXTRACTED", "VALIDATED", "NEEDS_REVIEW", "APPROVED", "PUBLISHED", "SUPERSEDED", "REJECTED"] = "DOWNLOADED"


# =========================================================
# SCHEMA: core
# =========================================================

class CoreClassificationRecord(BaseModel):
    version_id: UUID
    doc_type: Literal["PREVENTIVO", "CONSUNTIVO", "PIANO_FINANZIARIO", "CREDITO_OPERA", "REGOLAMENTO", "ALTRO"]
    fiscal_year: int
    mm_number: str | None = None
    budget_stage: Literal["PROPOSTA", "EMENDATO", "APPROVATO"] | None = None
    detected_layout_family: str | None = None
    confidence: Decimal = Field(ge=0, le=1)
    classified_by: Literal["RULES", "OCR_RULES", "CURATOR"] = "RULES"


class CoreLedgerValueRecord(BaseModel):
    id: int | None = None
    version_id: UUID
    entity_id: int
    statement: Literal["CE", "CI", "BI"]
    view_kind: Literal["NATURE", "FUNCTION"]
    function_code: str | None = None
    account_code: str | None = None
    detail_code: str | None = None
    label_raw: str
    column_role: Literal["CURRENT", "PRIOR_BUDGET", "PRIOR_ACTUAL"]
    ref_year: int
    value_kind: Literal["ACTUAL", "BUDGET", "PLAN"]
    side: Literal["SPESA", "RICAVO", "ATTIVO", "PASSIVO"]
    amount_chf: Decimal
    amount_raw: str
    page: int
    bbox: list[float] | None = None
    method: Literal["GEOMETRIC_PDF", "OCR", "MANUAL_ENTRY"] = "GEOMETRIC_PDF"
    parser_version: str


class CoreInvestmentCreditRecord(BaseModel):
    id: UUID | None = None
    ust_code: int
    mm_number: str | None = None
    account_full: str
    title: str
    vote_date: date | None = None
    authorization_kind: Literal["CC", "LEGAL_DELEGATION", "URGENCY"] = "CC"
    amount_voted: Decimal
    net_expected: Decimal | None = None
    status: Literal["VOTED", "IN_PROGRESS", "CLOSED", "REVOKED"] = "IN_PROGRESS"


class CoreCreditSnapshotRecord(BaseModel):
    id: int | None = None
    credit_id: UUID
    version_id: UUID
    fiscal_year: int
    used_at_0101: Decimal
    spent_year: Decimal
    spent_total: Decimal
    residual: Decimal
    overrun: Decimal | None = None
    page: int
    bbox: list[float] | None = None


# =========================================================
# SCHEMA: audit
# =========================================================

class AuditCuratorActionRecord(BaseModel):
    id: int | None = None
    actor: UUID
    action: Literal["APPROVE", "REJECT", "CORRECT_VALUE", "OVERRIDE_BLOCKING", "PUBLISH", "UNPUBLISH", "MARK_PERSONAL_DATA"]
    target_table: str
    target_id: str
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    reason: str = Field(min_length=10)
    at: datetime = Field(default_factory=datetime.utcnow)


class AuditFeedbackTicketRecord(BaseModel):
    id: UUID | None = None
    ust_code: int | None = None
    version_id: UUID | None = None
    target_metric: str | None = None
    page_path: str
    message_clean: str = Field(min_length=10, max_length=500)
    reporter_email: str | None = Field(default=None, max_length=254)
    ip_hash: str = Field(min_length=64, max_length=64)
    status: Literal["NEW", "IN_REVIEW", "RESOLVED", "DISMISSED"] = "NEW"
    resolution_note: str | None = None
    resolved_by: UUID | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: datetime | None = None
