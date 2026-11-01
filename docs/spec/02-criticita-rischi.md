# 02 · Registro Criticità & Rischi

> Legenda gravità: 🔴 **BLOCCANTE** (va risolta prima del build o del go-live) · 🟠 **ALTA** (impatta qualità/tempi in modo serio) · 🟡 **MEDIA** (gestibile con mitigazione)
> Evidenza: ✅ verificata da me oggi (31.10.2026) · 📄 desunta dal documento sorgente · 🧠 valutazione professionale

---

## A. Criticità bloccanti 🔴

### C-01 · L'MCP Supabase punta al database di PRODUZIONE del CRM Corfin ✅
- **Evidenza**: `get_project_url` → `https://vrqnbdcsavgpdgijpiic.supabase.co`, identico a `NEXT_PUBLIC_SUPABASE_URL` in `20.sito-corfin/apps/web/.env.local`.
- **Rischio**: una `apply_migration` o `execute_sql` lanciata per OFCL creerebbe tabelle o romperebbe dati nel gestionale Corfin in produzione.
- **Mitigazione**:
  1. Creare un **nuovo progetto Supabase** dedicato (`ofcl-prod`, regione `eu-central-2` Zurigo).
  2. Riconfigurare l'MCP Supabase con `--project-ref=<nuovo>` e **`--read-only`** di default; scrittura solo durante le finestre di migrazione.
  3. Prima di ogni migrazione: controllo automatico che `get_project_url` ≠ URL Corfin (guard in `tasks.md` T0xx).
- **Chi**: tu (azione nel dashboard Supabase / config MCP). **Io non toccherò mai il DB tramite MCP finché non è fatto.**

### C-02 · Città di Locarno vieta `/files/` in robots.txt — proprio dove stanno i PDF ✅
- **Evidenza**: `https://www.locarno.ch/robots.txt` → `User-agent: * / Disallow: /files/`. I conti sono in `/files/documenti/...` (es. `MM20_Consuntivi_2024_2.pdf`).
- **Rischio**: scaricarli automaticamente viola la policy dichiarata del sito → rischio reputazionale/legale per un portale di *trasparenza*.
- **Mitigazione** (in ordine):
  1. Email formale alla Cancelleria / Servizio finanze della Città chiedendo autorizzazione o un canale dati (template in `12-legal-compliance.md`).
  2. Nel frattempo: **acquisizione manuale** (upload del curatore) con stesso flusso di provenienza (`acquisition_method = MANUAL_UPLOAD`).
  3. Il crawler indicizza solo le pagine HTML consentite (titoli/URL), **non** scarica i PDF di `/files/`.

### C-03 · Il documento sorgente non è verificato e contiene errori/incoerenze 📄✅
Il report sembra prodotto da una ricerca automatica (deep research): utile come mappa, **non** come fonte dati. Incoerenze trovate:

| # | Incoerenza | Dove |
|---|---|---|
| a | **Orselina**: l'URL troncato `index.php?node=326&lng=1` risponde **404** perché il sito usa un motore Assolo legacy con firma anti-manomissione obbligatoria (`&vis=2&rif=b07ebc24cc`); senza `rif` valido ogni `node=` o `downdoc.php` viene rifiutato (impossibile enumerare `id_doc` in sequenza) | ✅ probe homepage |
| b | Locarno **MM 42** citato due volte con date e oggetti diversi (27.10.2026 Stadio Lido; 27.07.2026 credito quadro strade) | Registro crediti |
| c | Terre di Pedemonte: "3.45% di 15'807'468.47 = 546'136.10" → in realtà fa **545'357.66** | Benchmark §4 |
| d | Terre di Pedemonte: gruppo 33 = 533'867.75 **inferiore** agli ammortamenti pianificati 546'136.10 (dovrebbe includerli) | Benchmark §4 |
| e | Hash Assolo identici su Comuni diversi (`Messaggi-861f7d00` per Mergoscia, Onsernone, Pedemonte, Gambarogno; `Albo-comunale-04399800` per 3 Comuni) → probabili ID di template, non di pagina: **non usarli come chiavi** | Tabella master |
| f | Bibliografia Terre di Pedemonte punta a `ecommdevel.assolo.net` (host di **sviluppo** del CMS) | Bibliografia |
| g | Scale "Quota interessi": 0–4% / 4–9% / **>10%** → buco 9–10% | Tabella indicatori |
| h | Grado di autofinanziamento: il doc usa soglia **80%**, altre fonti comunali ticinesi usano **70%** | Tabella indicatori + ricerca web |
| i | "Parsing deterministico Ge.Co.Ti. Web" — ma in bibliografia compare un PDF di Lavertezzo generato con **"Seagate Crystal Reports"** → i layout **non** sono uniformi | Bibliografia |
| j | Dati "ultimi atti" molto disomogenei: Gordola fermo al Prev. **2022**, Orselina al Cons. **2022–2023** → copertura reale da verificare | Tabella master |
| k | Moltiplicatori 2019–2026 tratti da un opuscolo di una fiduciaria privata (non fonte ufficiale) | §3 |

- **Mitigazione**: **Fase 0 "Censimento verificato"** — ogni URL, moltiplicatore, soglia SEL e software contabile viene riverificato su fonte primaria prima di entrare nel registro (`registry/comuni.yaml` con campo `verified_at` + `source_url`). I dati del report entrano solo come `seed` marcati `UNVERIFIED`.

### C-04 · Quadro legale non ancora validato (portale pubblico) 🧠
- **Diritto d'autore**: gli atti ufficiali non sono protetti (art. 5 cpv. 1 lett. a/c LDA) → probabile OK per *dati* e *ripubblicazione dei PDF*, ma va confermato per i rapporti allegati e per gli stemmi/loghi comunali (no loghi!).
- **Protezione dati (nLPD)**: alcuni MM contengono **dati personali** (naturalizzazioni, espropri, nominativi in crediti a posteriori, contenziosi) → l'archivio pubblico di PDF integrali è il punto più delicato.
- **Responsabilità**: un errore di estrazione pubblicato ("sorpasso di 2 mio" che non esiste) può danneggiare un Municipio → serve processo di rettifica rapido + disclaimer.
- **Mitigazione**: vedi `12-legal-compliance.md`; decisione proposta: **v1 pubblica i dati estratti + link all'originale sul sito comunale**; la copia d'archivio dei PDF resta **privata** (solo curatore) finché non c'è un parere.

---

## B. Criticità alte 🟠

### C-05 · Estrazione PDF: il vero rischio tecnico del progetto 🧠📄
- Layout diversi per software (Ge.Co.Ti. Web, Crystal Reports, altri gestionali certificati MCA2), versioni, Comuni.
- Tabelle multi-colonna (3 coppie Spese/Ricavi), righe spezzate su più linee, totali intermedi, pagine ruotate, PDF fino a **82 MB**, possibili scansioni.
- **Mitigazione**: architettura a **template per famiglia di layout** + *golden set* di 20–30 PDF annotati a mano + regressione automatica; fallback OCR; fallback LLM **solo** come suggerimento in revisione (mai auto-pubblicato). Obiettivo realistico: Riassunto generale e Allegato f deterministici; il dettaglio completo (lett. b) in Fase 2.

### C-06 · Crawl-delay 30 s sui 13 siti Assolo ✅
- **Evidenza**: `robots.txt` Assolo → `User-agent: * / Allow: / / Crawl-delay: 30`.
- **Impatto**: backfill iniziale lento (es. Minusio ~346 MM → ~3 ore solo per un host). Una scansione settimanale incrementale resta fattibile (host in parallelo).
- **Mitigazione**: crawler **asincrono per host** (1 coda per dominio), richieste condizionali (`If-None-Match`/`If-Modified-Since`), backfill a lotti ripresi da checkpoint, job su GitHub Actions (limite 6 h/job → backfill spezzato per Comune).

### C-07 · Pagine indice senza link statici (rendering dinamico o a 2 livelli) ✅
- **Evidenza**: Brione (0 link documento), Losone (0), Centovalli (0) nella pagina indice.
- **Mitigazione**: per Assolo provare prima i parametri di paginazione/risultato (`ris_n`, `fric`, `ris_pg`) che restituiscono HTML server-side; per WordPress usare **REST API** `/wp-json/wp/v2/posts?categories=…` e `/wp-json/wp/v2/media`; Playwright headless solo come ultima risorsa.

### C-08 · Versioni multiple dello stesso conto (iniziale vs emendato vs approvato) 📄
- Il modello del documento (PK `codice_ust, anno, tipo_doc, ente, conto`) **non** distingue versioni né la colonna di provenienza (un preventivo T riporta anche Prev T-1 e Cons T-2).
- **Mitigazione**: nel data model ogni valore è legato a `document_id` + `column_role` (`CURRENT`, `PRIOR_BUDGET`, `PRIOR_ACTUAL`) + `version_status`; una **vista "golden"** sceglie la versione autorevole per (Comune, ente, anno, tipo). Vedi `04-data-model.md`.

### C-09 · Confrontabilità tra Comuni non garantita 🧠
- Aziende incluse/escluse dal conto comunale (Tenero-Contra integra acqua/depurazione/rifiuti nei fondi 2910.x; Ascona ha AE e AAP separate).
- Popolazione di riferimento diversa (residente permanente vs finanziaria).
- **Mitigazione**: confronti di default solo su perimetro `COMUNE`; nota metodologica per ogni indicatore; flag "perimetro non omogeneo".

### C-10 · Classificazione documenti ambigua 🧠
- Titoli eterogenei ("Conti", "Allegato cifre", "Testo messaggio e conti", "MM-no-23-Consuntivo-205").
- **Mitigazione**: classificatore a regole (regex su titolo/URL) + verifica sul contenuto (prima pagina: "Preventivo"/"Consuntivo" + anno + "MCA2") + coda di revisione per confidenza < soglia.

### C-11 · Copertura storica incompleta e disomogenea 📄
- Alcuni Comuni pubblicano dal 2006 (Losone), altri pochissimo online (Orselina, Gordola fermo al 2022 nel report).
- **Mitigazione**: dashboard di copertura pubblica (matrice Comune × anno × tipo) + richiesta documenti alla Cancelleria (LIT – Legge sull'informazione e sulla trasparenza) per i mancanti.

### C-12 · Carico di revisione manuale sottostimato 🧠
- 19 Comuni × (1 preventivo + 1 consuntivo + aziende + crediti) ≈ **60–90 documenti/anno**, concentrati in 2 picchi.
- **Mitigazione**: UI di revisione efficiente (PDF + valori affiancati, scorciatoie tastiera), controlli automatici che riducono la revisione a eccezioni, priorità ai documenti `NEEDS_REVIEW`.

---

## C. Criticità medie 🟡

| ID | Criticità | Mitigazione |
|---|---|---|
| C-13 | Siti comunali cambiano struttura (redesign, nuovo CMS) | Test di "salute connettore" settimanale; alert se 0 documenti trovati o se lo schema HTML cambia |
| C-14 | Stesso URL, contenuto sostituito | SHA-256 per versione; si conserva lo storico |
| C-15 | Documenti rimossi dai siti | Stato `offline_since`; dato resta, link originale marcato "non più disponibile" |
| C-16 | Fusioni comunali (Verzasca 2021) e cessioni territoriali (Lavertezzo, Cugnasco-Gerra) | Serie storiche spezzate con marcatore; nessun raccordo pre-fusione in v1 |
| C-17 | Arrotondamenti nei totali dei PDF | Tolleranza parametrica (default 1 CHF per riga, 0.01% per totali) |
| C-18 | Costi storage PDF (GB di documenti) | Cloudflare R2 (egress gratuito) o Supabase Storage; dedup SHA-256 |
| C-19 | Stack TypeScript dell'utente vs Python migliore per PDF | Monorepo poliglotta: pipeline in **Python**, portale in **Next.js/TS**; contratto dati = schema SQL + JSON Schema |
| C-20 | Indicatori ufficiali MCA2 possono cambiare (circolari SEL) | Tabella `ref_indicator_scale` con `valid_from/valid_to` e fonte |
| C-21 | Hosting Vercel: funzioni con limiti di durata | Nessuna elaborazione su Vercel: solo lettura. Pipeline su GitHub Actions |
| C-22 | Credenziali MCP GitHub/Vercel collegate all'account usato per Corfin | Nuovo repo/progetto Vercel dedicati; nessun riuso di env Corfin |
| C-23 | Data/ora: il report cita documenti fino a fine ottobre 2026 → i preventivi 2027 stanno uscendo **ora** | Partire con i Comuni che hanno già pubblicato il Prev. 2027 come primo test reale |
| C-24 | Lingua/termini: "ACAP" vs "AAP", "Allegato cifre" vs "Conti" | Dizionario sinonimi in `registry/glossario.yaml` |

---

## D. Top 5 decisioni che servono da te (una alla volta, in quest'ordine)

1. **C-01** Creare il progetto Supabase dedicato e riconfigurare l'MCP (o autorizzarmi a usare solo Postgres locale/Docker finché non è pronto).
2. **C-04** Pubblicare o no la copia d'archivio dei PDF (proposta: no in v1, solo link all'originale).
3. **C-02** Chi invia la richiesta di autorizzazione alla Città di Locarno (proposta: tu, con il template pronto).
4. **C-19** Confermare stack poliglotta Python + Next.js.
5. Nome e dominio del portale (proposta: `finanzelocarnese.ch` / "Osservatorio Finanze Comunali del Locarnese").
