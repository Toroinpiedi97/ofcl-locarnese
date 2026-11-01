-- ==============================================================================
-- OFCL Migration 0004: Civic Deep Dive, Feedback Tickets, Full Curator RLS & Audit Trigger
-- Conforme a docs/spec/04-data-model.md, 09-ux §6.5 e 11-testing §L4
-- ==============================================================================

-- 1. TABELLE CIVIC DEEP DIVE (Quadranti A-E: Tasse, Tariffe, Famiglie, Terza Età, Mobilità, Sportello)
create table ref.civic_benefit_def (
  code            text primary key,
  quadrant        text not null check (quadrant in ('A_TARIFFE','B_FAMIGLIE','C_TERZA_ETA','D_CLIMA_MOBILITA','E_FISCO_SPORTELLO')),
  label_it        text not null,
  unit_hint       text not null,
  sort_order      smallint not null default 100
);

create table ref.municipal_civic_item (
  ust_code        smallint not null references ref.municipality,
  benefit_code    text not null references ref.civic_benefit_def,
  valid_year      smallint not null,
  status          text not null default 'UNVERIFIED' check (status in ('ACTIVE','NOT_APPLICABLE','UNVERIFIED')),
  value_display   text not null,
  amount_min_chf  numeric(12,2),
  amount_max_chf  numeric(12,2),
  pct_value       numeric(5,2),
  conditions_short text,
  ordinance_ref   text,
  source_url      text not null check (source_url ~ '^https?://'),
  verified_at     timestamptz,
  primary key (ust_code, benefit_code, valid_year)
);

-- 2. TABELLA SEGNALAZIONI CIVICHE (Civic Ticket Sandbox con sanitizzazione e salt nLPD)
create table audit.feedback_ticket (
  id              uuid primary key default gen_random_uuid(),
  ust_code        smallint references ref.municipality,
  version_id      uuid references raw.document_version,
  target_metric   text,
  page_path       text not null,
  message_clean   text not null check (char_length(message_clean) between 10 and 500),
  reporter_email  text check (reporter_email is null or char_length(reporter_email) <= 254),
  ip_hash         char(64) not null,
  status          text not null default 'NEW' check (status in ('NEW','IN_REVIEW','RESOLVED','DISMISSED')),
  resolution_note text,
  resolved_by     uuid,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

-- 3. VISTE PUBBLICHE API (security_invoker = true)

-- 3a. Guida Civica Comunale (Quadranti A-E con link ad atti ufficiali e verifica esplicita)
create view api.municipal_civic_guide with (security_invoker = true) as
select m.ust_code,
       m.slug as municipality_slug,
       m.name as municipality_name,
       cbd.code as benefit_code,
       cbd.quadrant,
       cbd.label_it,
       cbd.unit_hint,
       cbd.sort_order,
       mci.valid_year,
       mci.status,
       mci.value_display,
       mci.amount_min_chf,
       mci.amount_max_chf,
       mci.pct_value,
       mci.conditions_short,
       mci.ordinance_ref,
       mci.source_url,
       mci.verified_at
from ref.municipal_civic_item mci
join ref.civic_benefit_def cbd on cbd.code = mci.benefit_code
join ref.municipality m on m.ust_code = mci.ust_code
where mci.verified_at is not null
  and m.active = true;

-- 3b. Elenco Comuni & indicatori correnti per la Bento Grid (Regola dei 30 Secondi)
create view api.municipalities with (security_invoker = true) as
select m.ust_code,
       m.slug,
       m.name,
       m.circle,
       m.seat,
       m.active,
       pop.residents as latest_population,
       pop.year as latest_population_year,
       tax.pf_pct as tax_multiplier_pf,
       tax.pg_pct as tax_multiplier_pg,
       tax.year as tax_multiplier_year,
       coalesce(doc_stats.consuntivo_count, 0) as consuntivo_count,
       coalesce(doc_stats.preventivo_count, 0) as preventivo_count,
       doc_stats.latest_consuntivo_year,
       doc_stats.latest_preventivo_year
from ref.municipality m
left join lateral (
  select p.residents, p.year
  from ref.population p
  where p.ust_code = m.ust_code
  order by p.year desc
  limit 1
) pop on true
left join lateral (
  select t.pf_pct, t.pg_pct, t.year
  from ref.tax_multiplier t
  where t.ust_code = m.ust_code
  order by t.year desc
  limit 1
) tax on true
left join lateral (
  select count(*) filter (where c.doc_type = 'CONSUNTIVO') as consuntivo_count,
         count(*) filter (where c.doc_type = 'PREVENTIVO') as preventivo_count,
         max(c.fiscal_year) filter (where c.doc_type = 'CONSUNTIVO') as latest_consuntivo_year,
         max(c.fiscal_year) filter (where c.doc_type = 'PREVENTIVO') as latest_preventivo_year
  from raw.document_version v
  join core.classification c on c.version_id = v.id
  join raw.document d on d.id = v.document_id
  where v.status = 'PUBLISHED'
    and d.contains_personal_data = false
    and d.ust_code = m.ust_code
) doc_stats on true;

-- 3c. Sintesi di Bilancio Annuale per Conto Economico e Investimenti (da api.ledger_golden)
create view api.summary_by_year with (security_invoker = true) as
select lg.entity_id,
       e.ust_code,
       m.name as municipality_name,
       e.kind as entity_kind,
       e.name as entity_name,
       lg.ref_year,
       lg.value_kind,
       -- Conto Economico
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'SPESA' and lg.account_code in ('30','31','33','35','36','37')), 0) as spese_operative,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'RICAVO' and lg.account_code in ('40','41','42','43','45','46')), 0) as ricavi_operativi,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'SPESA' and lg.account_code = '34'), 0) as spese_finanziarie_34,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'RICAVO' and lg.account_code = '44'), 0) as ricavi_finanziari_44,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'SPESA' and lg.account_code = '38'), 0) as spese_straordinarie_38,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'RICAVO' and lg.account_code = '48'), 0) as ricavi_straordinari_48,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'SPESA' and lg.account_code = '39'), 0) as addebiti_interni_39,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CE' and lg.side = 'RICAVO' and lg.account_code = '49'), 0) as accrediti_interni_49,
       -- Investimenti Beni Amministrativi
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CI' and lg.side = 'SPESA' and lg.account_code in ('50','51','52','54','55','56','57','58')), 0) as uscite_investimenti_ba,
       coalesce(sum(lg.amount_chf) filter (where lg.statement = 'CI' and lg.side = 'RICAVO' and lg.account_code in ('60','61','62','63','64','66','68')), 0) as entrate_investimenti_ba
from api.ledger_golden lg
join ref.entity e on e.id = lg.entity_id
join ref.municipality m on m.ust_code = e.ust_code
group by lg.entity_id, e.ust_code, m.name, e.kind, e.name, lg.ref_year, lg.value_kind;

-- 3d. Vista 8 Indicatori Finanziari SEL con fasce cromatiche
create view api.indicators with (security_invoker = true) as
select iv.id,
       iv.version_id,
       c.doc_type,
       c.fiscal_year,
       iv.entity_id,
       e.ust_code,
       m.name as municipality_name,
       iv.indicator_code,
       idef.label_it as indicator_label,
       idef.unit,
       idef.formula_text,
       idef.higher_is_better,
       iv.reported_value,
       iv.computed_value,
       iv.diff_value,
       iv.source_page,
       isc.label_it as band_label,
       isc.color_token as band_color
from core.indicator_value iv
join raw.document_version v on v.id = iv.version_id and v.status = 'PUBLISHED'
join core.classification c on c.version_id = v.id
join raw.document d on d.id = v.document_id and d.contains_personal_data = false
join ref.indicator_def idef on idef.code = iv.indicator_code
join ref.entity e on e.id = iv.entity_id
join ref.municipality m on m.ust_code = e.ust_code
left join lateral (
  select s.label_it, s.color_token
  from ref.indicator_scale s
  where s.indicator_code = iv.indicator_code
    and s.valid_from <= make_date(c.fiscal_year, 1, 1)
    and (s.lower_bound is null or coalesce(iv.computed_value, iv.reported_value) >= s.lower_bound)
    and (s.upper_bound is null or coalesce(iv.computed_value, iv.reported_value) <= s.upper_bound)
  order by s.valid_from desc, s.band_order asc
  limit 1
) isc on true;

-- 3e. Biblioteca Documenti Pubblica (esclusione PII e solo PUBLISHED)
create view api.documents with (security_invoker = true) as
select v.id as version_id,
       d.id as document_id,
       d.ust_code,
       m.name as municipality_name,
       m.slug as municipality_slug,
       c.doc_type,
       c.fiscal_year,
       c.mm_number,
       c.budget_stage,
       d.title_raw,
       d.origin_url,
       d.published_on,
       d.acquisition,
       v.sha256,
       v.file_size_bytes,
       v.page_count,
       v.fetched_at,
       v.published_at,
       v.status
from raw.document_version v
join raw.document d on d.id = v.document_id
join ref.municipality m on m.ust_code = d.ust_code
left join core.classification c on c.version_id = v.id
where v.status = 'PUBLISHED'
  and d.contains_personal_data = false;

-- 3f. Matrice di Copertura Pubblica (Comune × Anno × Tipo)
create view api.coverage with (security_invoker = true) as
select m.ust_code,
       m.slug as municipality_slug,
       m.name as municipality_name,
       c.fiscal_year,
       c.doc_type,
       v.status as version_status,
       count(distinct v.id) as published_versions_count,
       max(v.published_at) as last_published_at
from ref.municipality m
join raw.document d on d.ust_code = m.ust_code and d.contains_personal_data = false
join raw.document_version v on v.document_id = d.id and v.status = 'PUBLISHED'
join core.classification c on c.version_id = v.id
group by m.ust_code, m.slug, m.name, c.fiscal_year, c.doc_type, v.status;

-- 3g. Alias per compatibilità route api.credits
create or replace view api.credits with (security_invoker = true) as
select * from api.investment_credits_overview;

-- 4. COMPLETAMENTO ROW LEVEL SECURITY (RLS) SU TUTTE LE TABELLE APPLICATIVE
alter table ref.civic_benefit_def enable row level security;
alter table ref.municipal_civic_item enable row level security;
alter table audit.feedback_ticket enable row level security;

-- Policy di lettura pubblica per il Civic Deep Dive
create policy public_read_civic_def on ref.civic_benefit_def for select using (true);
create policy public_read_civic_item on ref.municipal_civic_item for select using (verified_at is not null);

-- Policy Curator (CRUD completo su TUTTE le tabelle dei dati grezzi, elaborati, civici e audit)
create policy curator_all_civic_def on ref.civic_benefit_def for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_civic_item on ref.municipal_civic_item for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_raw_pipeline on raw.pipeline_run for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_raw_document on raw.document for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_raw_version on raw.document_version for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_core_classification on core.classification for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_core_credit_snapshot on core.credit_snapshot for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_core_asset_snapshot on core.asset_snapshot for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_core_indicator on core.indicator_value for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_core_validation on core.validation_result for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_feedback_ticket on audit.feedback_ticket for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

-- 5. TRIGGER TRANSAZIONALE D'AUDIT SULLE RETTIFICHE (Constitution §L4.3)
-- Impedisce a qualsiasi curatore di rettificare valori numerici in core.ledger_value
-- senza aver inserito una riga tracciata in audit.curator_action con reason >= 10 caratteri
create or replace function core.fn_audit_ledger_correction()
returns trigger as $$
declare
  v_has_audit boolean;
begin
  -- Controllo solo per sessioni interattive autenticate
  if auth.uid() is not null then
    select exists (
      select 1
      from audit.curator_action
      where target_table = 'core.ledger_value'
        and target_id = OLD.id::text
        and actor = auth.uid()
        and at >= (now() - interval '10 seconds')
        and length(reason) >= 10
    ) into v_has_audit;

    if not v_has_audit then
      raise exception 'Rettifica bloccata: ogni modifica a core.ledger_value deve essere accompagnata da una riga contestuale in audit.curator_action con reason >= 10 caratteri.';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_audit_ledger_correction on core.ledger_value;
create trigger tr_audit_ledger_correction
before update on core.ledger_value
for each row
execute function core.fn_audit_ledger_correction();

-- 6. PERMESSI POSTGREST SULLE VISTE PUBBLICHE
grant select on api.municipal_civic_guide to anon, authenticated;
grant select on api.municipalities to anon, authenticated;
grant select on api.summary_by_year to anon, authenticated;
grant select on api.indicators to anon, authenticated;
grant select on api.documents to anon, authenticated;
grant select on api.coverage to anon, authenticated;
grant select on api.credits to anon, authenticated;

grant select on ref.civic_benefit_def to anon, authenticated;
grant select on ref.municipal_civic_item to anon, authenticated;
