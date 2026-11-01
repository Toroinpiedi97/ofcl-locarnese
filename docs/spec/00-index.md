# 00 · Indice Master & Glossario — Specifica A→Z Osservatorio Finanze Comunali del Locarnese (OFCL)

**Versione Specifica**: `1.0.0` · **Data**: `2026-10-31` · **Perimetro**: Distretto di Locarno (UST `2104`, 19 Comuni `5091–5399`)
**Natura Progetto**: Repository autonomo (`21.dashboard-`) completamente isolato dal gestionale Corfin · Portale civico pubblico di trasparenza + Open Data certificati MCA2.

---

## 1. Mappa Completa dei Documenti di Specifica (`00` → `14` + Piano Esecutivo)

| # | Documento | Contenuto chiave | Ruolo primario (`AGENTS.md`) |
|---|---|---|---|
| **PLAN** | [implementation_plan.md](../../implementation_plan.md) | **Piano di Implementazione Master (`/plan`)**: decisioni utente, architettura A→Z, componenti da creare e piano di verifica | Tutti |
| **00** | [00-index.md](./00-index.md) | Indice navigabile, guida per ruolo e Glossario ufficiale MCA2 / LOC / RGFCC | Tutti |
| **01** | [01-prd.md](./01-prd.md) | **Product Requirements Document**: visione, 5 personas, User Stories `US1–US8`, edge cases, `FR-001..042`, `NFR-01..10`, `SC-001..005` | Domain & UX |
| **02** | [02-criticita-rischi.md](./02-criticita-rischi.md) | **Registro Criticità (`C-01..C-24`)**: 4 blocchi rossi verificati (DB Corfin, `robots.txt` Locarno, errori doc sorgente, nLPD/LDA) + mitigazioni | Tutti (Lettura prioritaria!) |
| **03** | [03-architettura.md](./03-architettura.md) | **Architettura Tecnica & ADR (`ADR-01..10`)**: Python 3.12 + Supabase Postgres + Next.js 15 + GitHub Actions, sicurezza e costi (`2–50 CHF/mese`) | Architect & Backend |
| **04** | [04-data-model.md](./04-data-model.md) | **Modello Dati Relazionale MCA2**: ERD, DDL SQL completo (`ref`, `raw`, `core`, `api`, `audit`), vista `api.ledger_golden` e RLS | Architect & Backend |
| **05** | [05-fonti-connettori.md](./05-fonti-connettori.md) | **Mappatura 19 Portali & 5 Connettori**: esito probe live 31.10.2026, firma `&rif=` Orselina, `Crawl-delay`, `comuni.yaml` e fonti SEL/USTAT | Architect & Backend |
| **06** | [06-estrazione-pdf.md](./06-estrazione-pdf.md) | **Classificazione & Parsing PDF**: sezioni art. 22 RGFCC, template YAML geometrici, `parse_chf` (al centesimo `0.01 CHF`), OCR e guardrail LLM | Architect & Domain |
| **07** | [07-validation-engine.md](./07-validation-engine.md) | **Motore di Riconciliazione (`V01–V12`) & 8 Indicatori SEL**: quadrature bloccanti, segnali `S01–S04` e scale ufficiali SEL | Domain & QA |
| **08** | [08-crediti-cespiti-lifecycle.md](./08-crediti-cespiti-lifecycle.md) | **Controllo Crediti (Allegato f) & Cespiti (Allegato e)**: ciclo giuridico LOC, Lordo vs Netto/IVA/PALoc, Entity Resolution multi-anno, onda ammortamenti | Domain Expert |
| **09** | [09-ux-portale-admin-opendata.md](./09-ux-portale-admin-opendata.md) | **UX Portale, Swiss Design System (Alpine Glass, Bento Grid), Split-View Curatore, API v1 & Open Data**: wireframe ASCII, regola 30s, WCAG AA, doppia pipeline Desktop/Mobile, OpenAPI e Frictionless CSV Excel-CH (`;`) | Frontend & UX |
| **10** | [10-mcp-evaluation.md](./10-mcp-evaluation.md) | **Valutazione MCP Server & Plugin**: audit dei 9 MCP locali, guardrail anti-Corfin, verdetto Marketplace e design `@ofcl/mcp-server` pubblico | Architect |
| **11** | [11-testing-qa-goldenset.md](./11-testing-qa-goldenset.md) | **Strategia QA & Golden Set**: 5 livelli di test (`Hypothesis`, fixture HTML, 25 PDF reali a errore `0.00 CHF`, RLS negative tests, Playwright) | QA & SDD Verifier |
| **12** | [12-legal-compliance.md](./12-legal-compliance.md) | **Quadro Legale Svizzero/Ticinese**: art. 5 LDA, LPSt stemmi, nLPD/LPDP, art. 192 LOC, LIT + **Template A (Locarno)** e **Template B (LIT)** | Domain & Legal |
| **13** | [13-operations-runbook.md](./13-operations-runbook.md) | **CI/CD, Calendario Fiscale & Runbook**: workflow GitHub Actions, picchi ott/mag, canary anti-drift HTML e Disaster Recovery riproducibile | Architect & Ops |
| **14** | [14-tasks-build-roadmap.md](./14-tasks-build-roadmap.md) | **Roadmap di Build A→Z (`T001–T060` + sotto-task UI/DB)**: 8 fasi con stato QA verificato, doppia pipeline Desktop/Mobile, Civic Deep Dive e Civic Ticket | Tutti |

---

## 2. Glossario Essenziale Finanza Pubblica Ticinese (MCA2)

| Sigla / Termine | Significato tecnico e normativo |
|---|---|
| **MCA2 (HRM2)** | *Modello contabile armonizzato di seconda generazione* dei Cantoni e Comuni svizzeri, obbligatorio per tutti i Comuni ticinesi dal 2022 (contabilità economico-patrimoniale ispirata agli IPSAS, precisione al centesimo `0.01 CHF`). |
| **LOC & RGFCC** | *Legge organica comunale* (RL 181.100) e *Regolamento sulla gestione finanziaria e sulla contabilità dei comuni* (RL 181.150, rev. 01.04.2022 con 15 allegati obbligatori `a–p`, stralciato `k`). |
| **SEL** | *Sezione degli enti locali* del Dipartimento delle istituzioni (Bellinzona): autorità cantonale di vigilanza amministrativa e finanziaria sui Comuni. |
| **MM** | *Messaggio Municipale*: proposta formale sottoposta dal Municipio (Esecutivo) al Consiglio comunale (Legislativo). |
| **BA vs BP** | *Beni Amministrativi* (classe `14`, vincolati a compiti pubblici, ammortizzati linearmente ex Allegati 1–2 art. 17 RGFCC) vs *Beni Patrimoniali* (classe `10`, realizzabili senza ledere compiti pubblici; dedotti dal capitale terzi per calcolare il Debito pubblico netto). |
| **Autofinanziamento** | Flusso finanziario generato dalla gestione corrente disponibile per finanziare gli investimenti senza nuovo debito (Risultato d'esercizio + ammortamenti `33` ± movimenti finanziamenti speciali `35/45` ± rettifiche). |
| **Moltiplicatore PF / PG** | Percentuale comunale applicata all'imposta cantonale base; dal 2025–2026 differenziabile in Ticino tra *Persone Fisiche* e *Persone Giuridiche* (es. Locarno 90/97%, Gambarogno 85/100%, Centovalli 95/120%). |
| **Sopravvenienze (`4000.101`)** | Maggiori (o minori) gettiti d'imposta relativi ad anni precedenti accertati al momento dell'emissione definitiva delle tassazioni da parte del Cantone. |
| **AAP / ACAP / LEA / APONA** | Aziende municipalizzate o enti autonomi comunali con contabilità separata conforme MCA2 (*Azienda Acqua Potabile*, *Locarnese Ente Acqua*, *Azienda Porto Natanti*). |
| **PALoc** | *Programma d'agglomerato del Locarnese* (opere di mobilità lenta/trasporto pubblico cofinanziate da Confederazione e Cantone tramite la CIT). |
