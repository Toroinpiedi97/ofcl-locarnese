-- =========================================================
-- OFCL Migration 0001: Schemas and Reference Data Tables
-- Cantone Ticino / Distretto di Locarno (UST 2104)
-- Conforme a MCA2 / RGFCC
-- =========================================================

-- Schemi di isolamento
create schema if not exists ref;
create schema if not exists raw;
create schema if not exists core;
create schema if not exists api;
create schema if not exists audit;

-- Anagrafica dei 19 Comuni del Locarnese
create table ref.municipality (
  ust_code        smallint primary key check (ust_code between 5001 and 5999),
  slug            text not null unique,                 -- es. 'losone', 'locarno'
  name            text not null,
  seat            text,                                 -- sede cancelleria
  circle          text not null,                        -- circolo (Locarno, Isole, Navegna, Gambarogno, Melezza, Onsernone, Verzasca)
  district_code   smallint not null default 2104,       -- Distretto di Locarno
  cms_family      text not null check (cms_family in ('ASSOLO','WORDPRESS','JOOMLA','CUSTOM_PHP','CITY_LOCARNO','UNKNOWN')),
  valid_from      date,                                 -- fusioni (Verzasca 2020-10-18)
  valid_to        date,
  merger_note     text,
  verified_at     timestamptz,                          -- C-03: null = non verificato
  created_at      timestamptz not null default now()
);

-- Perimetri contabili ed Enti/Aziende municipalizzate
create table ref.entity (
  id              uuid primary key default gen_random_uuid(),
  ust_code        smallint not null references ref.municipality,
  kind            text not null check (kind in ('COMUNE','AAP','AE','PORTO','CASA_ANZIANI','ENTE_AUTONOMO','ALTRO')),
  name            text not null,                         -- 'Azienda acqua potabile (AAP)', 'Istituto San Carlo'
  aliases         text[] not null default '{}',          -- 'AAP','ACAP','LEA'
  unique (ust_code, kind, name)
);

-- Piano dei conti MCA2 per natura (Genere di conto)
create table ref.account_mca2 (
  code            text primary key,                      -- es. '3010', '30', '301'
  level           smallint not null check (level between 1 and 4),
  parent_code     text references ref.account_mca2,
  label_it        text not null,
  statement       text not null check (statement in ('CE','CI','BIL')),
  source_url      text not null
);

-- Classificazione funzionale MCA2 (Dicasteri)
create table ref.function_mca2 (
  code            text primary key,                      -- es. '0', '02', '021'
  level           smallint not null,
  parent_code     text references ref.function_mca2,
  label_it        text not null
);

-- Popolazione residente permanente (STATPOP / USTAT)
create table ref.population (
  ust_code        smallint references ref.municipality,
  year            smallint not null,
  residents       integer not null check (residents > 0),
  definition      text not null default 'STATPOP_RESIDENTE_PERMANENTE_31_12',
  source_url      text not null,
  primary key (ust_code, year, definition)
);

-- Moltiplicatori d'imposta comunali (PF e PG)
create table ref.tax_multiplier (
  ust_code        smallint references ref.municipality,
  year            smallint not null,
  pf_pct          numeric(5,2) not null,
  pg_pct          numeric(5,2) not null,
  source_document uuid,                                  -- MM del preventivo
  source_url      text,
  verification    text not null default 'UNVERIFIED' check (verification in ('UNVERIFIED','VERIFIED')),
  primary key (ust_code, year)
);

-- Definizioni degli 8 indicatori finanziari ufficiali SEL
create table ref.indicator_def (
  code            text primary key,                      -- 'NET_DEBT_RATIO', 'SELF_FINANCING_DEGREE'
  label_it        text not null,
  formula_text    text not null,
  unit            text not null check (unit in ('PCT','CHF','CHF_PER_CAPITA')),
  higher_is_better boolean
);

-- Scale di valutazione ufficiali SEL
create table ref.indicator_scale (
  indicator_code  text references ref.indicator_def,
  valid_from      date not null,
  valid_to        date,
  band_order      smallint not null,
  lower_bound     numeric,                               -- estremo inferiore (incluso)
  upper_bound     numeric,                               -- estremo superiore (escluso)
  label_it        text not null,                         -- 'Buono', 'Accettabile', 'Eccessivo'
  color_token     text not null,                         -- 'good','ok','warn','bad'
  source_url      text not null,
  primary key (indicator_code, valid_from, band_order)
);
