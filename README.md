# Osservatorio Finanze Comunali del Locarnese (OFCL) 🇨🇭

> **Portale civico pubblico di trasparenza, analisi comparata MCA2 e Open Data certificati sui 19 Comuni del Distretto di Locarno (UST `2104`, codici `5091–5399`).**
> *"Nessun numero senza fonte. Nessuna fonte senza verifica."*

---

## 🧭 Punto di Ingresso Rapido

- 📋 **[Piano di Implementazione Master A→Z (`implementation_plan.md`)](./implementation_plan.md)** — Sintesi esecutiva, architettura, decisioni critiche e piano di verifica.
- 🗂️ **[Indice Master Specifiche & Glossario MCA2 (`docs/spec/00-index.md`)](./docs/spec/00-index.md)** — Punto di accesso ai **15 documenti tecnici, contabili e legali**.
- ✅ **[Checklist Esecutiva di Build `T001–T059` (`docs/spec/14-tasks-build-roadmap.md`)](./docs/spec/14-tasks-build-roadmap.md)** — Roadmap operativa in 8 fasi dalla A alla Z.

---

## 📚 Indice Completo della Documentazione (`docs/spec/`)

| # | File | Contenuto |
|---|---|---|
| **00** | [`00-index.md`](./docs/spec/00-index.md) | Indice navigabile per ruolo e Glossario ufficiale MCA2 / LOC / RGFCC |
| **01** | [`01-prd.md`](./docs/spec/01-prd.md) | **PRD**: visione, personas, User Stories `US1–US8`, `FR-001..042`, `NFR-01..10`, `SC-001..005` |
| **02** | [`02-criticita-rischi.md`](./docs/spec/02-criticita-rischi.md) | **Registro Criticità (`C-01..C-24`)**: audit rischi bloccanti, `robots.txt` live e incoerenze documento iniziale |
| **03** | [`03-architettura.md`](./docs/spec/03-architettura.md) | **Architettura & ADR (`ADR-01..10`)**: Python 3.12 (`uv`) + PostgreSQL/Supabase + Next.js 15 + GitHub Actions |
| **04** | [`04-data-model.md`](./docs/spec/04-data-model.md) | **Modello Dati SQL**: schemi `ref`, `raw`, `core`, `api`, `audit`, vista `api.ledger_golden` e policy RLS |
| **05** | [`05-fonti-connettori.md`](./docs/spec/05-fonti-connettori.md) | **19 Portali & 5 Connettori**: esito probe HTTP live 31.10.2026, firma `&rif=` Orselina, `comuni.yaml` |
| **06** | [`06-estrazione-pdf.md`](./docs/spec/06-estrazione-pdf.md) | **Classificazione & Parsing PDF**: sezioni art. 22 RGFCC, layout YAML, `parse_chf` (`0.01 CHF`), OCR e LLM |
| **07** | [`07-validation-engine.md`](./docs/spec/07-validation-engine.md) | **Motore di Validazione (`V01–V12`) & 8 Indicatori SEL**: quadrature bloccanti e segnali `S01–S04` |
| **08** | [`08-crediti-cespiti-lifecycle.md`](./docs/spec/08-crediti-cespiti-lifecycle.md) | **Crediti d'Investimento (Allegato f) & Cespiti (Allegato e)**: ciclo LOC, IVA/PALoc, Entity Resolution |
| **09** | [`09-ux-portale-admin-opendata.md`](./docs/spec/09-ux-portale-admin-opendata.md) | **UX Portale, Split-View Curatore (`/admin`), API v1 & Open Data**: wireframe, WCAG AA, CSV Excel-CH |
| **10** | [`10-mcp-evaluation.md`](./docs/spec/10-mcp-evaluation.md) | **Valutazione MCP Server**: audit dei 9 MCP locali, guardrail anti-Corfin e design `@ofcl/mcp-server` |
| **11** | [`11-testing-qa-goldenset.md`](./docs/spec/11-testing-qa-goldenset.md) | **Testing & Golden Set**: `Hypothesis`, fixture HTML, 25 PDF reali a errore `0.00 CHF`, RLS e Playwright |
| **12** | [`12-legal-compliance.md`](./docs/spec/12-legal-compliance.md) | **Quadro Legale**: LDA art. 5, LPSt stemmi, nLPD/LPDP, art. 192 LOC, LIT + **Template A & B pronti** |
| **13** | [`13-operations-runbook.md`](./docs/spec/13-operations-runbook.md) | **CI/CD & Runbook**: calendario fiscale ticinese (ott/mag), canary anti-drift HTML e Disaster Recovery |
| **14** | [`14-tasks-build-roadmap.md`](./docs/spec/14-tasks-build-roadmap.md) | **Piano di Build A→Z (`T001–T059`)**: 8 fasi sequenziali con gate di qualità SDD |

---

## 📂 Struttura Attuale del Workspace

```text
21.dashboard-/
├── AGENTS.md                                                 # Regole ADHD-friendly + 4 ruoli specializzati MCA2/OFCL
├── README.md                                                 # Questo documento
├── implementation_plan.md                                    # Piano esecutivo Master A->Z
├── docs/
│   ├── spec/                                                 # Specifica completa in 15 moduli (00..14)
│   └── ricerca-iniziale/
│       ├── media/                                            # 4 infografiche/grafici PNG estratti dal documento originale
│       ├── ricerca-mca2-19-comuni-locarnese.docx             # Ricerca di partenza caricata
│       └── ricerca-mca2-19-comuni-locarnese.txt              # Estrazione testuale integrale
└── scripts/
    └── probe-portali-19-comuni.ps1                           # Script verifica live HTTP & robots.txt dei 19 Comuni
```

---

## ⚠️ Regola Salvavita Infrastrutturale (`C-01`)

Questo progetto è **completamente separato dal gestionale CRM Corfin** (`20.sito-corfin`).
Prima di qualsiasi operazione su Supabase remoto, assicurarsi che l'MCP `supabase` **non** punti a `vrqnbdcsavgpdgijpiic.supabase.co` (usare Supabase CLI locale `127.0.0.1:54322` o il nuovo progetto dedicato `ofcl-prod`).
