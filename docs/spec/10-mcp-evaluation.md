# 10 · Valutazione Strategica MCP (Model Context Protocol) & Plugin

> **Principio cardine**: gli MCP Server sono acceleratori potentissimi **in fase di sviluppo, design, migrazione DB, audit e deploy** (Developer/Agent Plane), ma **NON devono mai trovarsi nel percorso critico di runtime della pipeline batch o del portale pubblico** (Production Data Plane), che deve girare in modo deterministico e autonomo su GitHub Actions + Supabase + Vercel.

---

## 1. Audit completo degli MCP presenti nel tuo ambiente

Ho ispezionato gli MCP attivi e presenti nella tua installazione Antigravity (`C:\Users\nicol\.gemini\antigravity\mcp`). Ecco la valutazione puntuale per ciascuno rispetto a OFCL:

| MCP Server | Stato attuale | Ruolo in OFCL | Giudizio | Vincoli & Guardrail di Sicurezza |
|---|---|---|---|---|
| **`supabase`** | Attivo (**⚠️ punta a Corfin `vrqnbdcsavgpdgijpiic`!**) | Creazione migrazioni, ispezione tabelle/RLS (`get_advisors`), generazione tipi TS (`generate_typescript_types`), debug query | **ESSENZIALE** (dopo riconfigurazione!) | 🔴 **BLOCCO C-01**: NON usare finché non crei il nuovo progetto `ofcl-prod` e riconfiguri il project-ref. Verifica obbligatoria `get_project_url` ad inizio sessione |
| **`github`** | Attivo (lazy) | Creazione repo separato `ofcl-locarnese`, gestione issue per anomalie Comuni, PR per layout templates, controllo workflow Actions | **MOLTO UTILE** | Usare esclusivamente sul nuovo repository dedicato; mai committare PDF con dati personali o `.env` |
| **`vercel`** | Attivo (lazy) | Creazione progetto Vercel separato per `web/`, ispezione `get_deployment_build_logs`, promozione release | **MOLTO UTILE** | Progetto Vercel distinto da `crm-ticino-ch-web`; zero variabili condivise |
| **`cloudflare`** | Attivo (lazy: `r2_*`, `worker_*`) | Gestione bucket privato **Cloudflare R2 `ofcl-raw-pdfs`** (`r2_create_bucket`, `r2_list_objects`) per l'archivio immutabile PDF `SHA-256` a egress zero | **ATTIVO & OPERATIVO** | Bucket `ofcl-raw-pdfs` già creato e testato; mantenerlo privato (accesso curatore solo via Presigned URL 15 min) |
| **`stitch`** | Attivo (lazy: `create_design_system`, `generate_screen_from_text`) | Prototipazione rapida ad alta fedeltà della **Scheda Comune**, del **Comparatore** e dello **Split-View Curatore** prima di scrivere React | **CONSIGLIATO (Fase 4 UI)** | Usare in apertura della Fase 4 per fissare design system civico/istituzionale (`DESIGN.md`) |
| **`postgres`** | Attivo (lazy: `query`) | Query analitiche dirette su istanza Postgres **locale Docker** (`supabase start`) durante lo sviluppo del motore di validazione V01–V12 | **UTILE IN LOCALE** | Puntare solo a `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (stack Supabase CLI locale) |
| **`sequential-thinking`** | Attivo (lazy) | Scomposizione casi contabili complessi MCA2 (riconciliazione flussi liquidità metodo indiretto, raccordi post-aggregazione) | **SUPPORTO** | Solo ragionamento di progettazione |
| **`chrome_devtools`** | Presente in `mcp/chrome_devtools` (disabilitato in sessione) | Ispezione DOM/Network dei 3 portali con lista dinamica a 0 link statici (**C-07**: Losone, Brione s/M, Centovalli) per trovare i parametri XHR/form senza usare browser pesanti a runtime | **UTILE IN FASE 1** | Già presente nella tua cartella MCP: basta abilitarlo quando faremo il reverse-engineering pulito delle paginazioni Assolo |
| **`notebooklm`** | Presente in `mcp/notebooklm` (disabilitato in sessione) | Caricare il *Manuale MCA2 SEL* e il *RGFCC* per interrogazioni normative rapide con citazione | **OPZIONALE** | Non necessario per la pipeline automatica |

---

## 2. Valutazione Marketplace: serve installare nuovi MCP/Plugin?

Ho interrogato il catalogo Antigravity Marketplace (`scraping`, `pdf`, `crawl`, `browser`, `devtools`, `cloudflare`):
1. **Estrazione PDF e Crawling**: **NON esiste (e non serve) un MCP per il parsing MCA2**. Le tabelle contabili Ge.Co.Ti. Web / Crystal Reports richiedono estrazione geometrica delle coordinate (`x0, y0, x1, y1`) tramite libreria Python nativa (`pdfplumber` + `PyMuPDF` + `ocrmypdf`). Delegare il parsing di tabulati da 60 pagine a un tool MCP generico introdurrebbe troncamenti di contesto, costi token elevati e perdita di determinismo.
2. **Navigazione siti dinamici (C-07)**: hai già `chrome_devtools` nella cartella MCP locale (da abilitare all'occorrenza) e Playwright già noto nel tuo stack. Un cloud browser esterno come *Browserbase* sarebbe sovradimensionato perché i 19 portali comunali non usano protezioni anti-bot enterprise (Cloudflare Turnstile/DataDome), bensì semplice CMS Assolo/WordPress con `Crawl-delay: 30`.

**Verdetto Marketplace**: **0 plugin esterni obbligatori da installare**. Tutto ciò che serve è già presente nel tuo ecosistema, riducendo la superficie d'attacco e le dipendenze da terze parti.

---

## 3. Protocollo Operativo "Zero Contaminazione" per gli MCP (Regola Salvavita C-01)

Prima di eseguire **qualsiasi** comando MCP infrastrutturale nelle fasi di build, l'agente deve rispettare questa checklist bloccante:

```mermaid
flowchart LR
    A["Inizio sessione Build OFCL"] --> B["Chiama supabase.get_project_url"]
    B --> C{"URL == vrqnbdcsavgpdgijpiic?"}
    C -- "SI (DB Corfin!)" --> D["STOP IMMEDIATO: usa solo Supabase CLI locale (127.0.0.1:54322)"]
    C -- "NO (Nuovo DB ofcl)" --> E["Verifica project_ref == ofcl-*"]
    E --> F["Procedi con migrazioni controllate"]
```

1. **Sviluppo quotidiano**: usare **Supabase CLI in locale** (`supabase start` su Docker) + migrazioni SQL in git (`supabase/migrations/*.sql`).
2. **Promozione in remoto**: usare `supabase` MCP (`apply_migration`, `get_advisors`, `generate_typescript_types`) **solo** dopo che il progetto `ofcl-prod` è attivo e verificato.

---

## 4. Opportunità Strategica Fase 3: Esporre OFCL come MCP Server Pubblico (`@ofcl/mcp-server`)

Una volta popolato il database verificato, OFCL può offrire — oltre a CSV/Parquet e API REST — un **piccolo MCP Server read-only open-source** (o endpoint SSE remoto su `/api/mcp`) dedicato a giornalisti, ricercatori, fiduciarie e consiglieri comunali che usano assistenti AI:

| Tool MCP esposto da OFCL | Input | Output garantito anti-allucinazione |
|---|---|---|
| `get_municipality_overview` | `comune`, `anno` | KPI ufficiali CE/CI/Bilancio + 8 indicatori SEL + link pagina PDF esatta |
| `compare_municipalities` | `indicatore`, `anno`, `comuni[]` | Classifica certificata con fascia SEL e note di perimetro (es. aziende separate) |
| `search_investment_credits` | `comune?`, `query?`, `only_overruns?` | Elenco crediti votati, speso cumulato, sorpassi e riferimento MM |
| `verify_figure_provenance` | `value_id` | SHA-256 del documento, URL albo, numero pagina, testo grezzo originale `amount_raw` |

**Valore**: trasforma l'Osservatorio nel **primo dataset civico svizzero "AI-ready" a zero allucinazioni**, dove qualsiasi risposta generata da un LLM sui conti del Locarnese riporta obbligatoriamente il Messaggio Municipale e la pagina del PDF.
