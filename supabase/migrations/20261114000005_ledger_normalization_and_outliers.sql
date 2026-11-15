-- ==============================================================================
-- OFCL Migration 0005: Normalizzazione MCA2, Confronti Peer & Divergenze Budget
-- Fase B: Criteri di omogeneità perimetro (COMUNE), esclusione 39/49,
-- scala pro capite STATPOP, fasce demografiche e statistiche outlier.
-- ==============================================================================

-- 1. Indice di supporto alle viste analitiche e sostituzione idempotente
create index if not exists idx_ledger_value_norm_lookup
  on core.ledger_value (version_id, entity_id, ref_year, view_kind, value_kind, statement);

-- 2. Vista Normalizzata Pubblica (solo PUBLISHED, no PII, solo perimetro COMUNE, no 39/49)
create or replace view api.ledger_normalized as
select lg.id,
       lg.version_id,
       lg.entity_id,
       e.ust_code,
       m.slug as municipality_slug,
       m.name as municipality_name,
       m.circle,
       lg.statement,
       lg.view_kind,
       lg.function_code,
       fm.label_it as function_label,
       lg.account_code,
       am.label_it as account_label,
       lg.detail_code,
       coalesce(am.label_it, fm.label_it, lg.label_raw) as canonical_label,
       lg.label_raw,
       case
         when lg.view_kind = 'NATURA' then char_length(coalesce(lg.account_code, ''))
         when lg.view_kind = 'FUNZIONE' then char_length(coalesce(lg.function_code, ''))
         else 0
       end as code_level,
       lg.column_role,
       lg.ref_year,
       lg.value_kind,
       lg.side,
       lg.amount_chf,
       lg.amount_raw,
       pop.residents as population_used,
       pop.year as population_year,
       case
         when pop.residents < 1000 then 'MICRO'
         when pop.residents < 4000 then 'MEDIO'
         else 'GRANDE'
       end as population_band,
       case
         when pop.residents > 0 and lg.amount_chf is not null
           then round((lg.amount_chf / pop.residents)::numeric, 2)
         else null
       end as amount_per_capita,
       coalesce(ent_flags.has_aap_entity, false) as has_aap_entity,
       coalesce(ent_flags.has_ae_entity, false) as has_ae_entity,
       case
         when lg.view_kind = 'FUNZIONE' and left(coalesce(lg.function_code, ''), 2) = '71' and not coalesce(ent_flags.has_aap_entity, false)
           then 'Acqua potabile integrata nel bilancio comunale (perimetro non omogeneo con AAP autonome)'
         when lg.view_kind = 'FUNZIONE' and left(coalesce(lg.function_code, ''), 2) = '79' and not coalesce(ent_flags.has_ae_entity, false)
           then 'Possibile integrazione servizi energetici nel bilancio comunale'
         else null
       end as perimeter_note,
       lg.page,
       lg.bbox,
       lg.doc_type,
       lg.mm_number,
       lg.origin_url
from api.ledger_golden lg
join ref.entity e on e.id = lg.entity_id and e.kind = 'COMUNE'
join ref.municipality m on m.ust_code = e.ust_code and m.active = true
left join ref.account_mca2 am on am.code = lg.account_code
left join ref.function_mca2 fm on fm.code = lg.function_code
left join lateral (
  select p.residents, p.year
  from ref.population p
  where p.ust_code = e.ust_code
  order by (p.year = lg.ref_year) desc,
           (p.year <= lg.ref_year) desc,
           abs(p.year - lg.ref_year) asc,
           p.year desc
  limit 1
) pop on true
left join lateral (
  select bool_or(e2.kind = 'AAP') as has_aap_entity,
         bool_or(e2.kind = 'AE') as has_ae_entity
  from ref.entity e2
  where e2.ust_code = e.ust_code
) ent_flags on true
where (
  lg.account_code is null
  or (lg.account_code not like '39%' and lg.account_code not like '49%')
);

-- 3. Vista Outlier Costi Bassi vs Costi Alti (Confronto pro capite tra Comuni omogenei)
create or replace view api.peer_cost_outliers as
with base as (
  select *
  from api.ledger_normalized
  where value_kind = 'ACTUAL'
    and view_kind in ('NATURA', 'FUNZIONE')
    and code_level > 0
    and amount_per_capita is not null
),
stats as (
  select b.*,
         count(*) over (
           partition by b.ref_year, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ) as district_peer_count,
         round((percentile_cont(0.5) within group (order by b.amount_per_capita) over (
           partition by b.ref_year, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ))::numeric, 2) as district_median_pc,
         count(*) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ) as band_peer_count,
         round((percentile_cont(0.25) within group (order by b.amount_per_capita) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ))::numeric, 2) as band_p25_pc,
         round((percentile_cont(0.5) within group (order by b.amount_per_capita) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ))::numeric, 2) as band_median_pc,
         round((percentile_cont(0.75) within group (order by b.amount_per_capita) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ))::numeric, 2) as band_p75_pc,
         min(b.amount_per_capita) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ) as band_min_pc,
         max(b.amount_per_capita) over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
         ) as band_max_pc,
         dense_rank() over (
           partition by b.ref_year, b.population_band, b.view_kind, b.statement,
                        coalesce(b.function_code, ''), coalesce(b.account_code, ''),
                        b.side, b.code_level
           order by b.amount_per_capita desc
         ) as rank_in_band_desc
  from base b
)
select s.ust_code,
       s.municipality_slug,
       s.municipality_name,
       s.population_used,
       s.population_band,
       s.ref_year,
       s.statement,
       s.view_kind,
       s.function_code,
       s.account_code,
       s.code_level,
       s.canonical_label,
       s.side,
       s.amount_chf,
       s.amount_per_capita,
       s.district_peer_count,
       s.district_median_pc,
       s.band_peer_count,
       s.band_min_pc,
       s.band_p25_pc,
       s.band_median_pc,
       s.band_p75_pc,
       s.band_max_pc,
       s.rank_in_band_desc,
       round((s.amount_per_capita - s.band_median_pc)::numeric, 2) as delta_vs_band_median_pc,
       case
         when s.band_median_pc <> 0
           then round((((s.amount_per_capita - s.band_median_pc) / abs(s.band_median_pc)) * 100)::numeric, 2)
         else null
       end as delta_vs_band_median_pct,
       case
         when s.district_median_pc <> 0
           then round((((s.amount_per_capita - s.district_median_pc) / abs(s.district_median_pc)) * 100)::numeric, 2)
         else null
       end as delta_vs_district_median_pct,
       case
         when s.band_peer_count < 3 then 'INSUFFICIENT_PEERS'
         when s.amount_per_capita > (s.band_p75_pc + 1.5 * (s.band_p75_pc - s.band_p25_pc))
           or (s.band_median_pc > 0 and ((s.amount_per_capita - s.band_median_pc) / s.band_median_pc) >= 0.35)
           then 'HIGH'
         when s.amount_per_capita < (s.band_p25_pc - 1.5 * (s.band_p75_pc - s.band_p25_pc))
           or (s.band_median_pc > 0 and ((s.amount_per_capita - s.band_median_pc) / s.band_median_pc) <= -0.35)
           then 'LOW'
         else 'NORMAL'
       end as outlier_direction,
       s.perimeter_note,
       s.mm_number,
       s.page,
       s.origin_url
from stats s;

-- 4. Vista Divergenze Preventivo vs Consuntivo (stesso Comune, stesso esercizio)
create or replace view api.budget_vs_actual_divergences as
select a.ust_code,
       a.municipality_slug,
       a.municipality_name,
       a.population_used,
       a.population_band,
       a.ref_year,
       a.statement,
       a.view_kind,
       a.function_code,
       a.account_code,
       a.detail_code,
       a.code_level,
       a.canonical_label,
       a.side,
       b.amount_chf as budget_chf,
       a.amount_chf as actual_chf,
       round((a.amount_chf - b.amount_chf)::numeric, 2) as delta_chf,
       case
         when b.amount_chf <> 0
           then round((((a.amount_chf - b.amount_chf) / abs(b.amount_chf)) * 100)::numeric, 2)
         else null
       end as delta_pct,
       case
         when a.population_used > 0
           then round(((a.amount_chf - b.amount_chf) / a.population_used)::numeric, 2)
         else null
       end as delta_per_capita,
       (
         b.amount_chf <> 0
         and abs((a.amount_chf - b.amount_chf) / abs(b.amount_chf)) >= 0.15
         and abs(a.amount_chf - b.amount_chf) >= 5000.00
       ) as is_significant_divergence,
       a.mm_number as actual_mm_number,
       a.page as actual_page,
       a.origin_url as actual_origin_url,
       b.mm_number as budget_mm_number,
       b.page as budget_page,
       b.origin_url as budget_origin_url
from api.ledger_normalized a
join api.ledger_normalized b
  on b.entity_id = a.entity_id
 and b.ref_year = a.ref_year
 and b.statement = a.statement
 and b.view_kind = a.view_kind
 and coalesce(b.function_code, '') = coalesce(a.function_code, '')
 and coalesce(b.account_code, '') = coalesce(a.account_code, '')
 and coalesce(b.detail_code, '') = coalesce(a.detail_code, '')
 and b.side = a.side
where a.value_kind = 'ACTUAL'
  and b.value_kind = 'BUDGET'
  and a.amount_chf is not null
  and b.amount_chf is not null;

-- 5. Permessi di sola lettura per visitatori anonimi e utenti autenticati
grant select on api.ledger_normalized to anon, authenticated;
grant select on api.peer_cost_outliers to anon, authenticated;
grant select on api.budget_vs_actual_divergences to anon, authenticated;
