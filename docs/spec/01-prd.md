# 01 · PRD — Osservatorio Finanze Comunali del Locarnese (OFCL)

**Feature Branch**: `001-ofcl-mvp` · **Creato**: 2026-10-31 · **Stato**: Draft v1.0 (in attesa di approvazione)
**Input**: documento *Pipeline Dati Finanziari MCA2, Preventivi, Consuntivi e Controllo Crediti d'Investimento dei 19 Comuni del Locarnese* + decisioni utente (progetto nuovo e separato dal CRM Corfin; portale pubblico di trasparenza con open data).

---

## 1. Visione

Un **portale pubblico, gratuito e verificabile** che trasforma i PDF contabili MCA2 pubblicati dai 19 Comuni del Distretto di Locarno (UST 2104) in **dati strutturati, confrontabili e scaricabili**, dove **ogni cifra è tracciabile** fino alla pagina del documento ufficiale da cui proviene.

> Principio guida: *"Nessun numero senza fonte. Nessuna fonte senza verifica."*

## 2. Problema

| Oggi | Con OFCL |
|---|---|
| Dati sparsi su 19 siti con 5 CMS diversi | Un unico punto di accesso |
| PDF fino a 80 MB, tabulati illeggibili per il cittadino | Schede comunali leggibili + grafici |
| Confronto tra Comuni impossibile senza ore di lavoro manuale | Confronti e classifiche su indicatori ufficiali MCA2 |
| Sorpassi di credito d'investimento nascosti negli allegati | Tracker crediti con evidenza dei sorpassi |
| Nessun open data contabile comunale strutturato in Ticino | CSV / Parquet / API con licenza aperta |

## 3. Personas

| ID | Persona | Bisogno primario | Frequenza |
|---|---|---|---|
| P-CIT | **Cittadino/contribuente** | "Il mio Comune è sano? Perché il moltiplicatore sale?" | Occasionale (picchi a ottobre e maggio) |
| P-CC | **Consigliere comunale / commissione della Gestione** | Confrontare il proprio Comune con i vicini prima della seduta; verificare crediti e sorpassi | Mensile, intenso prima delle sedute |
| P-GIO | **Giornalista** | Trovare storie (sorpassi, debito pro capite, investimenti record) con fonte citabile | Settimanale |
| P-RIC | **Ricercatore / analista / fiduciaria** | Scaricare serie storiche pulite | Occasionale, sessioni lunghe |
| P-ADM | **Curatore dati (tu)** | Validare estrazioni, risolvere anomalie, pubblicare | Settimanale |

## 4. User Stories (prioritizzate, testabili indipendentemente)

### US1 — Scheda finanziaria del Comune (P1) 🎯 MVP
Come **cittadino**, voglio aprire la pagina del mio Comune e vedere in 30 secondi risultato d'esercizio, investimenti, debito pro capite, moltiplicatore e indicatori SEL degli ultimi anni, con un giudizio a semaforo e il link al PDF originale.

**Perché P1**: è il valore minimo che giustifica il portale.
**Test indipendente**: caricare a mano 1 consuntivo verificato di 1 Comune → la scheda mostra i KPI e ogni KPI apre il PDF alla pagina corretta.

**Acceptance Scenarios**
1. **Given** il Consuntivo 2025 di Losone è stato estratto e validato, **When** apro `/comuni/losone`, **Then** vedo risultato d'esercizio, onere netto investimenti, autofinanziamento, debito pubblico netto pro capite e gli 8 indicatori con semaforo e anno.
2. **Given** un KPI visualizzato, **When** clicco l'icona "fonte", **Then** si apre il PDF ufficiale alla pagina esatta (`#page=N`) e vedo documento, MM, data di pubblicazione e data di estrazione.
3. **Given** un Comune senza dati validati per l'anno richiesto, **When** apro la scheda, **Then** vedo "Dato non ancora disponibile/validato" e mai un valore stimato non dichiarato.

### US2 — Confronto tra Comuni (P1)
Come **consigliere comunale**, voglio confrontare fino a 19 Comuni su un indicatore (es. debito pro capite 2025) in tabella e grafico, ordinabile, con la scala di valutazione SEL.

**Test indipendente**: con i dati di ≥3 Comuni validati, la pagina `/confronta` produce tabella ordinabile + grafico + export CSV coerente con i valori visualizzati.

1. **Given** dati validati per 3+ Comuni, **When** scelgo indicatore e anno, **Then** vedo valori, fascia SEL, popolazione usata e data dei dati.
2. **Given** un Comune con dati mancanti, **When** confronto, **Then** è mostrato in fondo con "n.d." e motivazione (non pubblicato / non estratto / non validato).

### US3 — Tracker crediti d'investimento (P2)
Come **giornalista**, voglio vedere per ogni Comune i crediti votati (MM, data, importo), quanto è stato speso e i **sorpassi** (credito residuo < 0), con la storia anno per anno.

1. **Given** l'Allegato f di un consuntivo estratto, **When** apro `/comuni/{slug}/crediti`, **Then** vedo per ogni credito: conto, MM, data voto, credito votato, utilizzato 01.01, uscite anno, uscite totali, residuo, stato.
2. **Given** un credito con uscite totali > credito votato, **When** visualizzo l'elenco, **Then** la riga è marcata "Sorpasso" con importo e % di sorpasso.
3. **Given** lo stesso credito su due consuntivi consecutivi, **When** apro il dettaglio, **Then** vedo la serie e un avviso se `utilizzato_01_01(T) ≠ uscite_totali(T-1)`.

### US4 — Open data e API (P2)
Come **ricercatore**, voglio scaricare tutti i dati in CSV/Parquet con dizionario dati, licenza e versione, oppure interrogarli via API REST.

1. **Given** una release dati, **When** apro `/open-data`, **Then** scarico ZIP con CSV + Parquet + `datapackage.json` (Frictionless) + `LICENSE` + `CHANGELOG`.
2. **Given** l'API pubblica, **When** chiamo `GET /api/v1/indicatori?comune=5115&anno=2025`, **Then** ricevo JSON con valori, unità, fonte (documento + pagina) e stato di validazione.

### US5 — Biblioteca documenti (P2)
Come **consigliere**, voglio una lista unificata di tutti i Messaggi Municipali finanziari dei 19 Comuni (preventivi, consuntivi, piani finanziari, crediti), filtrabile, con link all'originale e copia d'archivio.

### US6 — Coda di revisione del curatore (P1, interno)
Come **curatore**, voglio una coda delle estrazioni con esito dei controlli (BLOCKING/WARNING), il PDF affiancato ai valori estratti e i pulsanti *Approva / Correggi / Scarta*, così che nulla venga pubblicato senza verifica.

**Test indipendente**: un'estrazione con controllo BLOCKING fallito non compare sul portale pubblico finché non viene corretta e approvata.

### US7 — Avvisi e novità (P3)
Come **cittadino**, voglio un feed RSS/Atom (e in futuro email) per "nuovo preventivo pubblicato", "nuovo sorpasso rilevato", "indicatore oltre soglia".

### US8 — Piani finanziari e sopravvenienze (P3)
Proiezioni dei Piani Finanziari quadriennali e monitoraggio sopravvenienze d'imposta (conto 990.4000.101 / tabelle di emissione partite fiscali).

### US9 — Guida Civica Comunale: Tasse, Tariffe, Famiglie & Sussidi (P2)
Come **famiglia o residente del Locarnese**, voglio consultare nella scheda del mio Comune (e confrontare tra Comuni) i costi pratici annuali (tassa base e sacco rifiuti, acqua potabile, imposta immobiliare, tassa cani, parcheggi residenti) e i sussidi comunali attivi (bonus nascita, rette nidi e mense, contributi sport/musica giovani, agevolazioni AVS terza età, incentivi fotovoltaico/e-bike e abbonamento Arcobaleno), sempre con link all'ordinanza o regolamento ufficiale.

### US10 — Segnalazione Civica & Rettifica Rapida ("Civic Ticket Sandbox") (P1)
Come **cittadino, consigliere o funzionario comunale**, voglio poter segnalare in meno di 30 secondi un dato dubbio o un refuso tramite una finestra sicura (solo testo semplice ≤ 500 caratteri), così che il curatore riceva notifica immediata e verifichi sul PDF originale entro 24 ore.

### US11 — Simulatore Istantaneo d'Impatto Fiscale Comunale PF/PG (P2)
Come **contribuente o piccola impresa del Locarnese**, voglio inserire (o selezionare con uno slider) la mia *imposta cantonale base* e vedere istantaneamente al centesimo (`0.01 CHF`) quanto pago d'imposta comunale nel mio Comune rispetto alla media distrettuale e agli altri 18 Comuni (sia come Persona Fisica `PF` sia come Persona Giuridica `PG`), senza che alcun dato personale lasci mai il mio browser.

### Edge Cases (obbligatori da gestire)
- Preventivo **emendato** dal Consiglio comunale dopo la pubblicazione (Terre di Pedemonte, Lavertezzo, Ronco s/A) → due versioni dello stesso preventivo; il portale mostra la versione *approvata* e conserva quella iniziale.
- Preventivo approvato **dopo** l'inizio dell'esercizio (es. Ronco s/A: preventivo 2025 approvato il 20.01.2025).
- **Fascicolo unico** vs **fascicolo sdoppiato** (Messaggio + Allegato conti).
- PDF **scansionato** (immagine) senza testo → OCR.
- Documento **sostituito** sul sito con lo stesso URL (hash del contenuto cambia).
- Documento **rimosso** dal sito comunale → resta in archivio con stato "non più online".
- **Aziende municipalizzate** nello stesso PDF del Comune (Ascona AE/AAP, Ronco ACAP/APONA, Locarno LEA/San Carlo).
- **Fusioni**: Verzasca opera dal 2021; serie pre-fusione non confrontabili.
- Valori con formati ticinesi: `15'432'147.41`, `15’432’147.41`, `1'200.--`, `./. 35'000`, negativi tra parentesi o con `-` finale.
- Messaggi Municipali con **dati personali** (naturalizzazioni, espropri, nomi di privati) → esclusi dall'archivio pubblico.

## 5. Requisiti Funzionali

### Acquisizione
- **FR-001** Il sistema DEVE mantenere un **registro dei 19 Comuni** (codice UST, nome, circolo, CMS, URL sorgenti, enti contabili) versionato in repository (`registry/comuni.yaml`).
- **FR-002** Il sistema DEVE scansionare le sorgenti con un **connettore per famiglia CMS** (Assolo/eGov, WordPress, Joomla/jDownloads, PHP Orselina, Città di Locarno) rispettando `robots.txt`, `Crawl-delay` e un rate limit per host.
- **FR-003** Il sistema DEVE scaricare ogni nuovo documento, calcolarne lo **SHA-256**, archiviarlo in object storage immutabile e registrare URL d'origine, data di scoperta, `Last-Modified`/`ETag`, dimensione, titolo.
- **FR-004** Il sistema DEVE **classificare** i documenti in: `PREVENTIVO`, `CONSUNTIVO`, `PIANO_FINANZIARIO`, `CREDITO_INVESTIMENTO` (+ sottotipi `SUPPLETORIO`, `A_POSTERIORE`, `REVOCA`, `CREDITO_QUADRO`), `RAPPORTO_COMMISSIONE`, `ALTRO`; e per ente (`COMUNE`, `AAP/ACAP`, `AE`, `PORTO`, `CASA_ANZIANI`, …).
- **FR-005** Il sistema DEVE escludere dall'archivio pubblico i documenti classificati come contenenti dati personali sensibili (naturalizzazioni, espropri, contenziosi nominativi).

### Estrazione
- **FR-010** Il sistema DEVE estrarre dai fascicoli MCA2 almeno: Riassunto generale (art. 22 lett. a), Ricapitolazione per genere a 4 cifre (lett. c), Ricapitolazione per dicasteri (lett. d), Tabella controllo crediti (lett. f), Analisi finanziaria/indicatori (lett. o). *Fase 2*: dettaglio (lett. b), cespiti (lett. e), flussi di liquidità (lett. l).
- **FR-011** Ogni valore estratto DEVE avere **provenienza**: documento, pagina, bounding box, metodo di estrazione (`DETERMINISTIC`, `OCR`, `LLM_ASSISTED`, `MANUAL`), versione del parser.
- **FR-012** La normalizzazione numerica DEVE gestire apostrofi (`'` `’`), suffissi `.--`/`.-`, prefisso `./.`, parentesi, segno finale, e conservare il **testo grezzo** originale.
- **FR-013** Le estrazioni `LLM_ASSISTED` NON DEVONO MAI essere pubblicate senza approvazione manuale.

### Validazione
- **FR-020** Il sistema DEVE eseguire il motore di controlli definito in `07-validation-engine.md` (V01–V12) e assegnare a ogni documento uno stato: `EXTRACTED → VALIDATED | NEEDS_REVIEW → APPROVED → PUBLISHED` (o `REJECTED`).
- **FR-021** Un documento con almeno un controllo `BLOCKING` fallito NON DEVE essere pubblicato senza override motivato e registrato nell'audit log.
- **FR-022** Gli indicatori DEVONO essere sia **letti** dall'Allegato o (valore ufficiale del Comune) sia **ricalcolati**; scostamenti > tolleranza generano WARNING e sono visibili al pubblico.
- **FR-023** Le soglie di valutazione SEL DEVONO stare in una tabella di riferimento versionata con fonte, non nel codice.

### Portale pubblico
- **FR-030** Pagine: Home (mappa + KPI distretto), Scheda Comune, Confronta, Crediti, Documenti, Open Data, Metodologia, Note legali, Changelog dati.
- **FR-031** Ogni cifra pubblica DEVE avere un link "fonte" verso il PDF (originale + copia d'archivio).
- **FR-032** Il portale DEVE essere **WCAG 2.1 AA**, mobile-first, utilizzabile senza JavaScript per i contenuti principali (SSR/SSG).
- **FR-033** Il portale DEVE mostrare in modo permanente nell'header e nel footer il micro-disclaimer istituzionale: *"Dati aggiornati settimanalmente (ogni lunedì alle 04:00 CET). Fanno fede gli atti esposti ex art. 192 LOC."*, affiancato dalla pagina integrale `/note-legali`.
- **FR-034** Area **curatore** protetta da autenticazione (Supabase Auth, MFA) con coda di revisione (US6) e gestione segnalazioni civiche.
- **FR-035** Il frontend DEVE adottare il sistema visivo **Alpine Frosted Glass & Bento Grid** (`09-ux-portale-admin-opendata.md` §6) con **doppia pipeline responsiva disaccoppiata** (`DashboardDesktop` master-detail a 2 colonne e `DashboardMobile` con Bottom Sheet scorrevole e tap target ≥ `44px`) e fallback automatico ad alta opacità per `prefers-reduced-transparency`.
- **FR-036** Il portale DEVE offrire un modulo **Civic Ticket Sandbox** (`POST /api/feedback`) protetto da sanitizzazione testo puro, limite rigido di `500` caratteri, honeypot e rate limit (`3 req/ora/IP`), con registrazione in `audit.feedback_ticket` e notifica email server-side (senza mai esporre l'indirizzo email del curatore nel bundle client).
- **FR-037** Ogni Scheda Comune DEVE esporre la sezione strutturata **"Vivere nel Comune: Tasse, Tariffe, Famiglie & Servizi"** (Quadranti A–E), dove ogni parametro pubblicato richiede obbligatoriamente `source_url` al regolamento/ordinanza comunale e stato di verifica esplicito.
- **FR-038** La Scheda Comune e la pagina `/confronta` DEVONO includere il componente **Simulatore d'Imposta Comunale (`TaxImpactSimulator`)** 100% client-side (zero invio dati al server per tutela nLPD), con aritmetica intera al centesimo (`0.01 CHF`), toggle `PF` (Persone Fisiche) / `PG` (Persone Giuridiche), confronto col range dei 19 Comuni e avvertenza ex art. 292 segg. LT / art. 192 LOC.

### Open data / API
- **FR-040** Release dati versionate (SemVer dati `YYYY.MM.patch`) in CSV (UTF-8, `;` opzionale per Excel CH), Parquet e `datapackage.json`.
- **FR-041** API REST read-only, paginata, con rate limit e CORS aperto; nessun endpoint di scrittura pubblico.
- **FR-042** Licenza dati: **CC BY 4.0** (proposta, da confermare — vedi `12-legal-compliance.md`).

## 6. Requisiti Non Funzionali

| ID | Requisito | Target misurabile |
|---|---|---|
| NFR-01 | Performance portale | LCP < 2.0 s su 4G, TTFB < 300 ms (pagine statiche/ISR) |
| NFR-02 | Disponibilità | 99.5% mensile (hosting gestito) |
| NFR-03 | Freschezza dati | Scansione massiva settimanale ogni **lunedì alle 04:00 CET** (≤ 7 giorni dalla pubblicazione + dispatch manuale post-sedute CC nei picchi ott–dic e mar–giu) |
| NFR-04 | Cortesia crawling | Rispetto 100% di robots.txt; max 1 richiesta / `crawl-delay` per host; User-Agent identificabile con email di contatto |
| NFR-05 | Accuratezza | 0 valori pubblicati che differiscono dal PDF (verifica a campione 5% per release) |
| NFR-06 | Tracciabilità | 100% dei valori pubblici con documento+pagina |
| NFR-07 | Sicurezza | RLS attiva su tutte le tabelle; anon solo SELECT su viste `api.*`; secrets solo in CI/hosting |
| NFR-08 | Costi | ≤ 50 CHF/mese a regime (vedi `03-architettura.md` §8) |
| NFR-09 | Accessibilità | Lighthouse Accessibility ≥ 95; contrasto AA; tabelle con header semantici |
| NFR-10 | Riproducibilità | Ogni release dati ricostruibile dai PDF archiviati + versione parser |

## 7. Success Criteria

- **SC-001** MVP: 19/19 Comuni con almeno 1 consuntivo e 1 preventivo validati e pubblicati (Comune, senza aziende).
- **SC-002** ≥ 95% dei consuntivi 2022–2025 estratti in modo `DETERMINISTIC` senza intervento manuale sul Riassunto generale.
- **SC-003** 100% dei documenti pubblicati supera V01 (quadratura interna) e V07 (risultato CE).
- **SC-004** Un cittadino trova risultato d'esercizio e debito pro capite del proprio Comune in < 30 s (test con 5 utenti).
- **SC-005** Nuovi preventivi di fine ottobre visibili sul portale entro 14 giorni (inclusa revisione).

## 8. Fuori perimetro (v1)

- Contabilità pre-MCA2 (MCA1) e raccordo serie pre-fusione → solo nota metodologica.
- Comuni fuori dal Distretto di Locarno (architettura però estendibile a tutto il Ticino).
- Analisi politiche/commenti editoriali: OFCL mostra dati, non giudizi oltre le scale ufficiali SEL.
- App mobile nativa.
- Integrazione con il CRM Corfin (esplicitamente esclusa).

## 9. Assunzioni

- I documenti MCA2 pubblicati online sono atti ufficiali non protetti dal diritto d'autore (art. 5 LDA) — **da confermare** (vedi `12-legal-compliance.md`).
- L'MVP copre gli esercizi **Consuntivo 2022–2025** e **Preventivo 2024–2027** (MCA2 pienamente adottato).
- Popolazione: residente permanente al 31.12 (UST STATPOP); la "popolazione finanziaria" eventualmente usata dalla SEL verrà documentata come differenza metodologica.
- Il curatore dedica ~2–4 h/settimana alla revisione (più nei picchi di ottobre e maggio).
