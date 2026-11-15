-- ==============================================================================
-- OFCL Migration 0006: Social Post Drafts Queue (Admin Human-in-the-Loop)
-- Tabella per bozze Instagram generate dai detector deterministici e revisionate
-- dal curatore su /admin/social. Accesso negato a anon (solo ruolo 'curator').
-- ==============================================================================

create table if not exists core.social_post_draft (
  id                       uuid primary key default gen_random_uuid(),
  signal_code              text not null check (
                             signal_code in (
                               'S05_CREDIT_OVERRUN',
                               'S06_TARIFF_GAP',
                               'S07_TAX_MULTIPLIER',
                               'S08_PEER_COST_OUTLIER',
                               'S09_BUDGET_DIVERGENCE',
                               'S10_FUN_FACT'
                             )
                           ),
  dedup_key                text not null unique,
  ust_code                 smallint references ref.municipality,
  ref_year                 smallint not null,
  title                    text not null,
  question_for_municipality text not null,
  verified_payload         jsonb not null,
  slides_json              jsonb not null,
  caption_draft            text not null,
  hashtags                 text[] not null default '{}',
  source_urls              text[] not null check (cardinality(source_urls) >= 1),
  generation_mode          text not null default 'DETERMINISTIC' check (
                             generation_mode in ('DETERMINISTIC', 'AI_ASSISTED', 'CURATOR_EDITED')
                           ),
  status                   text not null default 'DRAFT' check (
                             status in ('DRAFT', 'APPROVED', 'PUBLISHED', 'ARCHIVED')
                           ),
  reviewed_by              uuid,
  reviewed_at              timestamptz,
  review_note              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_social_post_draft_status_year
  on core.social_post_draft (status, ref_year desc, created_at desc);

alter table core.social_post_draft enable row level security;

drop policy if exists curator_all_social_draft on core.social_post_draft;
create policy curator_all_social_draft on core.social_post_draft for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'curator');
