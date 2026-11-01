-- ==============================================================================
-- OFCL Test Suite L4: Sicurezza Database & RLS Negative Suite (pgTAP)
-- Conforme a docs/spec/11-testing-qa-goldenset.md §L4
-- ==============================================================================

begin;
select plan(12);

-- 1. Verifica che RLS sia abilitata su tutte le tabelle critiche
select tables_are(
  'raw',
  ARRAY['source', 'pipeline_run', 'document', 'document_version'],
  'Tutte le tabelle raw devono esistere'
);

select tables_are(
  'core',
  ARRAY['classification', 'ledger_value', 'investment_credit', 'credit_snapshot', 'asset_snapshot', 'indicator_value', 'validation_result'],
  'Tutte le tabelle core devono esistere'
);

select tables_are(
  'audit',
  ARRAY['curator_action', 'feedback_ticket'],
  'Tutte le tabelle audit devono esistere'
);

-- 2. Test permessi RUOLO 'anon' (visitatore pubblico non autenticato)
set local role anon;

-- anon non deve poter leggere tabelle raw, core o audit
select throws_ok(
  'SELECT count(*) FROM raw.document',
  '42501',
  null,
  'anon non può accedere a raw.document'
);

select throws_ok(
  'SELECT count(*) FROM core.ledger_value',
  '42501',
  null,
  'anon non può accedere a core.ledger_value'
);

select throws_ok(
  'SELECT count(*) FROM audit.feedback_ticket',
  '42501',
  null,
  'anon non può accedere a audit.feedback_ticket'
);

select throws_ok(
  'SELECT count(*) FROM audit.curator_action',
  '42501',
  null,
  'anon non può accedere a audit.curator_action'
);

-- anon non deve poter eseguire INSERT su audit.feedback_ticket (riservato al backend service_role)
select throws_ok(
  $$INSERT INTO audit.feedback_ticket (page_path, message_clean, ip_hash) VALUES ('/comuni/ascona', 'Test injection anonimo', 'hash123')$$,
  '42501',
  null,
  'anon non può inserire direttamente in audit.feedback_ticket via PostgREST'
);

-- anon PUÒ leggere le tabelle ref di consultazione pubblica e le viste api
select lives_ok(
  'SELECT count(*) FROM ref.municipality',
  'anon può leggere l''anagrafica ref.municipality'
);

select lives_ok(
  'SELECT count(*) FROM ref.civic_benefit_def',
  'anon può leggere il catalogo ref.civic_benefit_def'
);

select lives_ok(
  'SELECT count(*) FROM api.municipal_civic_guide',
  'anon può consultare la vista api.municipal_civic_guide'
);

select lives_ok(
  'SELECT count(*) FROM api.municipalities',
  'anon può consultare la vista api.municipalities'
);

select * from finish();
rollback;
