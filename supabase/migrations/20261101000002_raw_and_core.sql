-- =========================================================
-- OFCL Migration 0002: Raw Acquisition & Core Ledger Tables
-- Gestione Documentale Immutabile SHA-256 e Dati Contabili MCA2
-- Precisione centesimo esatto: NUMERIC(16,2)
-- =========================================================

-- Fonti di crawling degli albi comunali
create table raw.source (
  id              uuid primary key default gen_random_uuid(),
  ust_code        smallint not null references ref.municipality,
  kind            text not null check (kind in ('MM_INDEX','CONTI_INDEX','ALBO','SESSION_INDEX','WP_CATEGORY','MANUAL')),
  url             text not null unique,
  robots_allowed  boolean,
  crawl_delay_s   integer,
  last_checked_at timestamptz,
  last_ok_at      timestamptz,
  active          boolean not null default true
);

-- Esecuzioni della pipeline di ingestion
create table raw.pipeline_run (
  id              uuid primary key default gen_random_uuid(),
  stage           text not null check (stage in ('CRAWL','EXTRACT','VALIDATE','PUBLISH','EXPORT')),
  git_sha         text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'RUNNING' check (status in ('RUNNING','OK','PARTIAL','FAILED')),
  report          jsonb
);

-- Documento logico tracciato (atto comunale o fascicolo conti)
create table raw.document (
  id              uuid primary key default gen_random_uuid(),
  ust_code        smallint not null references ref.municipality,
  source_id       uuid references raw.source,
  origin_url      text not null,
  title_raw       text,
  published_on    date,                                  -- se dichiarata all'albo
  first_seen_at   timestamptz not null default now(),
  offline_since   timestamptz,
  acquisition     text not null default 'CRAWLER' check (acquisition in ('CRAWLER','MANUAL_UPLOAD','LIT_REQUEST')),
  contains_personal_data boolean not null default false, -- Guardrail privacy nLPD
  unique (ust_code, origin_url)
);

-- Versioni fisiche immutabili (deduplicazione crittografica per SHA-256)
create table raw.document_version (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references raw.document on delete restrict,
  sha256          char(64) not null unique,
  storage_path    text not null,                         -- pdf/{ust}/{sha256}.pdf (in Cloudflare R2 / Object Storage)
  bytes           bigint not null check (bytes > 0),
  mime            text not null,
  pages           integer,
  has_text_layer  boolean,
  http_etag       text,
  http_last_modified timestamptz,
  fetched_at      timestamptz not null default now(),
  status          text not null default 'DOWNLOADED' check (status in
                    ('DOWNLOADED','CLASSIFIED','EXTRACTED','VALIDATED','NEEDS_REVIEW','APPROVED','PUBLISHED','REJECTED','SUPERSEDED'))
);

-- =========================================================
-- CORE: Dati estratti e normalizzati MCA2
-- =========================================================

-- Classificazione del documento
create table core.classification (
  version_id      uuid primary key references raw.document_version,
  doc_type        text not null check (doc_type in ('PREVENTIVO','CONSUNTIVO','PIANO_FINANZIARIO','CREDITO_INVESTIMENTO','RAPPORTO_COMMISSIONE','ALTRO')),
  doc_subtype     text check (doc_subtype in ('CREDITO_QUADRO','SUPPLETORIO','A_POSTERIORE','REVOCA','LIQUIDAZIONE')),
  fiscal_year     smallint,                              -- anno dell'esercizio
  pf_from_year    smallint, pf_to_year smallint,         -- orizzonte piani finanziari
  entity_id       uuid references ref.entity,
  mm_number       text,                                  -- es. 'MM 08/2026'
  budget_stage    text check (budget_stage in ('PROPOSTA','EMENDATO','APPROVATO')),
  layout_family   text,                                  -- 'GECOTI_V3','CRYSTAL','UNKNOWN'
  method          text not null check (method in ('RULES','CONTENT','MANUAL')),
  confidence      numeric(4,3) not null check (confidence between 0 and 1)
);

-- Righe contabili estratte (Conto Economico, Investimenti, Bilancio)
create table core.ledger_value (
  id              bigint generated always as identity primary key,
  version_id      uuid not null references raw.document_version on delete cascade,
  entity_id       uuid not null references ref.entity,
  statement       text not null check (statement in ('CE','CI','BIL')),
  view_kind       text not null check (view_kind in ('RIASSUNTO','NATURA','FUNZIONE','DETTAGLIO')),
  function_code   text,                                  -- '615' (null per vista natura pura)
  account_code    text,                                  -- '3010' / '5010'
  detail_code     text,                                  -- '100' / '011'
  label_raw       text not null,
  column_role     text not null check (column_role in ('CURRENT','PRIOR_BUDGET','PRIOR_ACTUAL','PF_YEAR')),
  ref_year        smallint not null,                     -- anno di competenza della cifra
  value_kind      text not null check (value_kind in ('BUDGET','ACTUAL','PLAN')),
  side            text not null check (side in ('SPESA','RICAVO','ATTIVO','PASSIVO','SALDO')),
  amount_chf      numeric(16,2),                         -- centesimo esatto 0.01 CHF
  amount_raw      text not null,                         -- stringa originale nel PDF per audit
  page            integer not null,                      -- pagina per deep linking (#page=N)
  bbox            numeric[] check (array_length(bbox,1) = 4), -- coordinate geometriche [x0, y0, x1, y1]
  method          text not null check (method in ('DETERMINISTIC','OCR','LLM_ASSISTED','MANUAL')),
  parser_version  text not null
);
create index on core.ledger_value (version_id);
create index on core.ledger_value (entity_id, ref_year, value_kind, statement);

-- Anagrafica stabile del credito d'investimento
create table core.investment_credit (
  id              uuid primary key default gen_random_uuid(),
  ust_code        smallint not null references ref.municipality,
  entity_id       uuid references ref.entity,
  account_full    text,                                  -- es. '615.5010.011'
  mm_number       text,
  title           text not null,
  vote_date       date,
  authorization   text check (authorization in ('CC_ORDINARIO','CREDITO_QUADRO','DELEGA_MUNICIPIO','A_POSTERIORE','SUPPLETORIO')),
  amount_voted    numeric(16,2),                         -- importo lordo votato
  net_expected    numeric(16,2),                         -- investimento netto previsto
  vat_included    boolean,
  status          text not null default 'IN_CORSO' check (status in ('PROPOSTO','IN_CORSO','LIQUIDATO','REVOCATO')),
  request_doc_version uuid references raw.document_version,
  unique nulls not distinct (ust_code, account_full, mm_number)
);

-- Snapshot annuale di avanzamento credito (Tabella Allegato f)
create table core.credit_snapshot (
  version_id      uuid not null references raw.document_version on delete cascade,
  credit_id       uuid not null references core.investment_credit,
  fiscal_year     smallint not null,
  used_at_0101    numeric(16,2),
  spent_year      numeric(16,2),
  spent_total     numeric(16,2),
  amount_voted    numeric(16,2),
  residual        numeric(16,2),
  overrun         boolean generated always as (residual < 0) stored,
  page            integer not null,
  method          text not null,
  primary key (version_id, credit_id)
);

-- Snapshot dei cespiti dei beni amministrativi (Tabella Allegato e)
create table core.asset_snapshot (
  version_id      uuid not null references raw.document_version on delete cascade,
  asset_code      text not null,                         -- es. '1401.009'
  description     text not null,
  acquisition_net numeric(16,2),
  book_value_0101 numeric(16,2),
  avg_rate_pct    numeric(6,3),
  depr_planned    numeric(16,2),                         -- ammortamento lineare ordinario
  depr_unplanned  numeric(16,2),                         -- ammortamento straordinario
  book_value_3112 numeric(16,2),
  page            integer not null,
  primary key (version_id, asset_code)
);

-- Indicatori finanziari storici e calcolati
create table core.indicator_value (
  entity_id       uuid not null references ref.entity,
  indicator_code  text not null references ref.indicator_def,
  year            smallint not null,
  value_kind      text not null check (value_kind in ('BUDGET','ACTUAL','PLAN')),
  source          text not null check (source in ('REPORTED','COMPUTED')),
  value           numeric(18,4),
  version_id      uuid references raw.document_version,
  inputs          jsonb,                                 -- formula inputs per trasparenza
  primary key (entity_id, indicator_code, year, value_kind, source)
);

-- Risultati dei controlli di quadratura contabile (V01-V12)
create table core.validation_result (
  id              bigint generated always as identity primary key,
  version_id      uuid not null references raw.document_version on delete cascade,
  rule_code       text not null,                         -- 'V01'..'V12'
  severity        text not null check (severity in ('BLOCKING','WARNING','INFO')),
  passed          boolean not null,
  expected        numeric(18,2),
  actual          numeric(18,2),
  delta           numeric(18,2),
  message         text not null,
  run_id          uuid references raw.pipeline_run,
  created_at      timestamptz not null default now()
);
