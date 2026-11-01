# 13 · Operatività Continua, CI/CD, Calendario Fiscale & Runbook

## 1. Calendario Operativo Annuale (Ciclo Contabile Comunale Ticinese)

La pipeline adatta automaticamente la propria cadenza alle scadenze fissate dalla **LOC** e dal **RGFCC**:

| Finestra temporale | Evento istituzionale nei 19 Comuni | Schedulazione Cron | Focus operativo Curatore |
|---|---|---|---|
| **Tutto l'anno (Standard)** | Scansione massiva e cortese dei 19 albi comunali | **Lun 04:00 CET** (settimanale) | Verifica nuovi PDF caricati su R2, controllo canarini e coda `NEEDS_REVIEW` |
| **15 ott – 15 dic** | Sessione Preventivi (termine 31.10) e moltiplicatori | **Lun 04:00 CET** (+ dispatch manuale post sedute CC) | Validazione Preventivi e sdoppiamento aliquote PF/PG approvate dai Consigli Comunali |
| **15 mar – 30 giu** | Sessione Consuntivi + Allegati `a–p` (art. 22 RGFCC) | **Lun 04:00 CET** (+ dispatch manuale post sedute CC) | Chiusura consuntivi anno precedente, ricalcolo 8 indicatori SEL e rilascio Open Data |

---

## 2. Architettura dei Workflow GitHub Actions (`.github/workflows/`)

Tutti i job girano su runner `ubuntu-latest` con `uv` cache abilitata e **concurrency lock** (`cancel-in-progress: false` per i job dati, così da non interrompere mai un download a metà):

1. **`ci.yml` (su ogni Push / PR)**:
   - Python: `ruff check`, `mypy --strict`, `pytest tests/unit tests/connectors tests/golden`.
   - Database: `supabase db start` → applica migrazioni → esegue `supabase test db` (RLS negative suite) → verifica zero drift tipi TS (`supabase gen types typescript` == `web/src/lib/supabase/database.types.ts`).
   - Web: `pnpm --filter web lint`, `pnpm --filter web build`, `playwright test` su mock seed.
2. **`crawl-scheduled.yml` (`cron` + `workflow_dispatch` con input `ust_code` opzionale)**:
   - Esegue i 19 host **in parallelo controllato** (`asyncio.Semaphore(6)` tra domini diversi, ma **1 singola coda sequenziale per dominio** con rispetto rigoroso di `Crawl-delay: 30s`).
   - Timeout job: `90 minuti` per scansione incrementale; per il **backfill storico iniziale** (`--backfill`), un matrix job dedicato per singolo `ust_code` evita il limite di 6 ore e salva checkpoint dopo ogni pagina.
   - Se trova nuovi PDF → carica su Supabase Storage privato (`pdf/{ust}/{sha256}.pdf`) → innesca `extract-validate.yml`.
3. **`extract-validate.yml`**:
   - Preleva tutti i `raw.document_version` in stato `DOWNLOADED`.
   - Esegue classificazione → estrazione → controlli `V01`–`V12` → calcolo indicatori `COMPUTED`.
   - Se emergono `NEEDS_REVIEW` o nuovi documenti `VALIDATED` pronti per l'approvazione, apre/aggiorna automaticamente una **GitHub Issue riepilogativa** etichettata `curator-queue` con link diretto a `/admin/queue`.
4. **`release-opendata.yml` (su tag `data-vYYYY.MM.P` o pulsante admin)**:
   - Esporta viste `api.*` in CSV standard, CSV Excel-CH (`;` + BOM) e Parquet, valida `datapackage.json` con `frictionless validate`, calcola `SHA256SUMS.txt` e pubblica la **GitHub Release** + webhook ISR verso Vercel (`/api/revalidate`).

---

## 3. Monitoraggio Salute Connettori & Runbook Incidenti

### Rilevamento automatico di "Silent Connector Drift" (Mitigazione C-13)
Un sito comunale che cambia template HTML raramente restituisce HTTP 500: spesso restituisce **HTTP 200 con 0 documenti estratti**. Per questo ogni connettore applica 3 invarianti:
- **Canary Document Check**: per ciascun Comune, `registry/comuni.yaml` registra 1 URL/titolo storico noto ("canarino"). Se la scansione dell'indice principale non vede più la struttura attesa o trova `0 candidati` su una pagina che storicamente ne aveva `> 5`, lo stato della sorgente passa a `DEGRADED` e apre un alert automatico, **senza marcare offline i documenti esistenti**.

### Runbook Rapido in 4 Scenari

| Scenario | Sintomo | Procedura di ripristino (< 15 min) |
|---|---|---|
| **1. Redesign sito comunale** | Alert `ConnectorCanaryError` su un Comune (es. passaggio da WordPress ad Assolo) | 1. Imposta `active: false` sul vecchio source in `comuni.yaml`. 2. Ispeziona nuovo URL + `robots.txt`. 3. Salva fixture HTML in `tests/fixtures/html/`. 4. Associa la strategia esistente (es. `assolo_list`) e lancia `workflow_dispatch` per quel solo `ust_code`. |
| **2. Nuovo formato tabulato PDF** | Documento finisce in `NEEDS_REVIEW` con `layout_family = UNKNOWN` o `V01` fallito | 1. Scarica il PDF dal bucket curatore. 2. Verifica header e coordinate colonne con `ofcl inspect-pdf <file>`. 3. Crea/aggiorna YAML in `registry/layouts/` e aggiungi il PDF al Golden Set. 4. Rilancia `ofcl reextract --version-id <uuid>`. |
| **3. Segnalazione errore da Comune / giornalista** | Segnalazione su cifra o sorpasso | 1. Da `/admin/review/[versionId]` clicca `Sospendi pubblicazione` (immediato via ISR revalidate). 2. Verifica PDF originale. 3. Correggi con motivazione in `audit.curator_action`, riesegui `V01–V12`, ripubblica → riga automatica in `/changelog-dati`. |
| **4. Disaster Recovery DB** | Corruzione accidentale o perdita istanza | **Riproducibilità totale (NFR-10)**: (a) schema ricreato da `supabase/migrations/`; (b) seed `ref.*` da git; (c) archivio PDF in bucket con backup periodico cifrato locale/R2; (d) dump `audit.curator_action` esportato ad ogni release permette di riapplicare deterministicamente tutte le rettifiche umane sopra la ri-estrazione batch. |
