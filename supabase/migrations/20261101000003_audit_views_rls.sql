-- =========================================================
-- OFCL Migration 0003: Audit, Public Views & Row Level Security (RLS)
-- Tracciabilità del Curatore ex LOC e Protezione Dati
-- =========================================================

-- Tabella di audit immutabile per le azioni del curatore umano
create table audit.curator_action (
  id              bigint generated always as identity primary key,
  actor           uuid not null,                         -- auth.uid()
  action          text not null check (action in ('APPROVE','REJECT','CORRECT_VALUE','OVERRIDE_BLOCKING','PUBLISH','UNPUBLISH','MARK_PERSONAL_DATA')),
  target_table    text not null,
  target_id       text not null,
  before          jsonb,
  after           jsonb,
  reason          text not null check (length(reason) >= 10),
  at              timestamptz not null default now()
);

-- =========================================================
-- VISTE PUBBLICHE API (security_invoker = true)
-- =========================================================

-- Vista Golden: sceglie la versione autorevole del bilancio
create view api.ledger_golden with (security_invoker = true) as
select distinct on (lv.entity_id, lv.ref_year, lv.value_kind, lv.statement, lv.view_kind,
                    lv.function_code, lv.account_code, lv.detail_code, lv.side)
       lv.id,
       lv.version_id,
       lv.entity_id,
       lv.statement,
       lv.view_kind,
       lv.function_code,
       lv.account_code,
       lv.detail_code,
       lv.label_raw,
       lv.column_role,
       lv.ref_year,
       lv.value_kind,
       lv.side,
       lv.amount_chf,
       lv.amount_raw,
       lv.page,
       lv.bbox,
       lv.method,
       lv.parser_version,
       c.doc_type,
       c.mm_number,
       d.origin_url
from core.ledger_value lv
join raw.document_version v on v.id = lv.version_id and v.status = 'PUBLISHED'
join core.classification c on c.version_id = v.id
join raw.document d on d.id = v.document_id
where d.contains_personal_data = false
order by lv.entity_id, lv.ref_year, lv.value_kind, lv.statement, lv.view_kind,
         lv.function_code, lv.account_code, lv.detail_code, lv.side,
         (lv.column_role = 'CURRENT') desc,
         case c.budget_stage when 'APPROVATO' then 1 when 'EMENDATO' then 2 else 3 end,
         v.fetched_at desc;

-- Vista Crediti d'investimento pubblica con calcolo sorpassi
create view api.investment_credits_overview with (security_invoker = true) as
select ic.id,
       ic.ust_code,
       m.name as municipality_name,
       ic.mm_number,
       ic.account_full,
       ic.title,
       ic.vote_date,
       ic.authorization_kind as authorization,
       ic.amount_voted,
       ic.net_expected,
       ic.status,
       cs.fiscal_year as last_snapshot_year,
       cs.used_at_0101,
       cs.spent_year,
       cs.spent_total,
       cs.residual,
       cs.overrun,
       cs.page
from core.investment_credit ic
join ref.municipality m on m.ust_code = ic.ust_code
left join lateral (
  select cs.*
  from core.credit_snapshot cs
  join raw.document_version v on v.id = cs.version_id and v.status = 'PUBLISHED'
  where cs.credit_id = ic.id
  order by cs.fiscal_year desc
  limit 1
) cs on true;

-- =========================================================
-- SICUREZZA ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Abilitazione RLS Deny-By-Default su tutte le tabelle applicative
alter table raw.source enable row level security;
alter table raw.pipeline_run enable row level security;
alter table raw.document enable row level security;
alter table raw.document_version enable row level security;
alter table core.classification enable row level security;
alter table core.ledger_value enable row level security;
alter table core.investment_credit enable row level security;
alter table core.credit_snapshot enable row level security;
alter table core.asset_snapshot enable row level security;
alter table core.indicator_value enable row level security;
alter table core.validation_result enable row level security;
alter table audit.curator_action enable row level security;

-- Policy Curatore: lettura e scrittura completa solo per ruolo 'curator' autenticato
create policy curator_all_raw_source on raw.source for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_ledger on core.ledger_value for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_credits on core.investment_credit for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

create policy curator_all_audit on audit.curator_action for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');

-- Schemi di riferimento (ref.*) accessibili in sola lettura a tutti (anon e authenticated)
alter table ref.municipality enable row level security;
alter table ref.entity enable row level security;
alter table ref.account_mca2 enable row level security;
alter table ref.function_mca2 enable row level security;
alter table ref.population enable row level security;
alter table ref.tax_multiplier enable row level security;
alter table ref.indicator_def enable row level security;
alter table ref.indicator_scale enable row level security;

create policy public_read_municipality on ref.municipality for select using (true);
create policy public_read_entity on ref.entity for select using (true);
create policy public_read_account on ref.account_mca2 for select using (true);
create policy public_read_function on ref.function_mca2 for select using (true);
create policy public_read_population on ref.population for select using (true);
create policy public_read_tax on ref.tax_multiplier for select using (true);
create policy public_read_indicator on ref.indicator_def for select using (true);
create policy public_read_scale on ref.indicator_scale for select using (true);

-- Permessi schema API per i visitatori anonimi
grant usage on schema api to anon, authenticated;
grant select on api.ledger_golden to anon, authenticated;
grant select on api.investment_credits_overview to anon, authenticated;
grant usage on schema ref to anon, authenticated;
