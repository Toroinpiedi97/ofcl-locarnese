# 09 · UX Portale Pubblico, Console Curatore (`/admin`), API & Open Data

## 1. Mappa delle rotte (Information Architecture)

| Percorso | Accesso | Strategia Rendering | Scopo primario |
|---|---|---|---|
| `/` | Pubblico | ISR (revalidate su publish) | Mappa interattiva dei 19 Comuni (swisstopo), semafori distrettuali, ultimi atti pubblicati, matrice copertura |
| `/comuni/[slug]` | Pubblico | SSG + ISR | **Scheda Comune (Regola 30 secondi)**: 6 KPI card con citazione pagina PDF, 8 indicatori SEL, spesa per dicastero (0–9), storico moltiplicatori PF/PG |
| `/comuni/[slug]/crediti` | Pubblico | SSG + ISR | Tracker crediti d'investimento del Comune, filtro "Solo sorpassi", timeline utilizzo multi-anno |
| `/confronta` | Pubblico | SSR / Client URL state | Comparatore fino a 19 Comuni per indicatore, moltiplicatore o spesa pro capite per dicastero + bande SEL |
| `/crediti` | Pubblico | ISR | Registro regionale dei grandi investimenti e sorpassi nel Distretto di Locarno |
| `/documenti` | Pubblico | SSR paginato | Biblioteca ricercabile dei Messaggi Municipali finanziari (filtri: Comune, ente, anno, tipo, stato) |
| `/open-data` | Pubblico | SSG | Download release versionate (ZIP CSV/Parquet + `datapackage.json`), documentazione API `/api/v1` |
| `/metodologia` & `/stato` | Pubblico | SSG / ISR | Formule MCA2, regole V01–V12 generate da codice, salute settimanale dei 19 connettori, note legali art. 192 LOC |
| `/admin/queue` | `curator` (MFA) | Dynamic (`no-store`) | Coda estrazioni da revisionare ordinata per severità (`BLOCKING` → `WARNING` → `VALIDATED`) |
| `/admin/review/[versionId]` | `curator` (MFA) | Dynamic (`no-store`) | **Split-View di Revisione**: PDF viewer sincronizzato su `page` + `bbox` a sinistra, griglia editabile con audit obbligatorio a destra |
| `/admin/upload` | `curator` (MFA) | Dynamic (`no-store`) | Caricamento manuale PDF (es. Città di Locarno `MANUAL_UPLOAD` per C-02 o atti ottenuti via LIT) |

---

## 2. Wireframe funzionali ad alta densità

### 2.1 Scheda Comune (`/comuni/losone` — comprensione in < 30 secondi)

```text
+-----------------------------------------------------------------------------------+
| [!] Avviso legale: Fanno fede gli atti ufficiali esposti all'albo (art. 192 LOC)  |
+-----------------------------------------------------------------------------------+
| COMUNE DI LOSONE (UST 5115 · Circolo Isole)        [Perimetro: Comune v] [2025 v] |
| Popolazione 31.12: 6'720 ab. (STATPOP) | Moltiplicatore 2026: PF 90% / PG 90%     |
+-----------------------------------------------------------------------------------+
| [RISULTATO ESERCIZIO]   [AUTO-FINANZIAMENTO]  [INVESTIMENTI NETTI] [DEBITO/AB.]   |
|  +375'731 CHF            +1'572'983 CHF        13'836'800 CHF       3'714 CHF/ab  |
|  Prev: -564'390          Copertura inv: 15.4%  Lordi: 15.37 mio     Fascia: ELEV. |
|  [Fonte: MM 060 p.4 ↗]   [Fonte: MM 060 p.4 ↗] [Fonte: MM 060 p.5↗] [MM 060 p.48↗]|
+-----------------------------------------------------------------------------------+
| GLI 8 INDICATORI FINANZIARI UFFICIALI SEL (Art. 22 lett. o RGFCC)                 |
| 1. Tasso indebitamento netto   [███████████▓░░] 190.1%  [🔴 ECCESSIVO >150%]  [↗] |
| 2. Grado autofinanziamento     [██░░░░░░░░░░░░]  15.4%  [🟠 DEBOLE <80%]      [↗] |
| 3. Quota spese interessi       [█░░░░░░░░░░░░░]   1.5%  [🟢 BUONO 0-4%]       [↗] |
| 4. Quota capitale proprio      [███████░░░░░░░]  28.4%  [🟢 BUONA 20-40%]     [↗] |
| ... (mostra tutti gli 8 + eventuale badge "Δ Ricalcolo OFCL vs Comune")           |
+-----------------------------------------------------------------------------------+
| DOVE VANNO LE RISORSE (Onere netto Dicasteri 0-8)      | CREDITI ATTIVI & ALLERTE |
| [33.2% Previdenza sociale] [23.8% Educazione] [13.7%..] | 21 crediti aperti        |
|                                                        | [!] 1 sorpasso rilevato  |
+-----------------------------------------------------------------------------------+
```

### 2.2 Console Curatore — Split-View di Validazione (`/admin/review/[versionId]`)

```text
+-----------------------------------------------------------------------------------+
| [<- Coda] Losone · MM 060 Consuntivo 2025 (Comune) | Stato: NEEDS_REVIEW          |
| Controlli: 10/11 OK · [🔴 V10 Fallito su riga Allegato f p. 42]                   |
+-----------------------------------------+-----------------------------------------+
| PDF ORIGINALE (Pag. 42 / 56) [Zoom 125%]| GRIGLIA VALORI ESTRATTI (Filtro: Errori)|
| +-------------------------------------+ | Conto: 615.5010.011                     |
| | 615.5010.011 Strade 2023-25         | | Utilizzato 01.01: [ 210'450.00 ] ✅     |
| | ╔═════════════════════════════════╗ | | Uscite anno:      [  85'120.00 ] ✅     |
| | ║ 210'450.00 | 85'120.00 | 295'570║ | | Uscite totali:    [ 295'510.00 ] 🔴 OCR |
| | ╚═════════════════════════════════╝ | | -> Suggerito V10:   295'570.00 [Applica]|
| +-------------------------------------+ | Motivo correzione (min 10 car.):        |
| Scorciatoie: [J/K] riga · [Spazio] bbox | [Errore OCR cifra 7 letta come 1______] |
| [A] Approva doc · [R] Scarta · [P] PII  | [Salva Rettifica & Riesegui V01-V12]    |
+-----------------------------------------+-----------------------------------------+
```

---

## 3. Regole UX & Accessibilità non negoziabili

1. **Zero ambiguità "Zero vs Dato Mancante"**: `0.00 CHF` viene mostrato come `0.00 CHF`; un valore `NULL` viene mostrato come `n.d.` con tooltip esplicativo (*Non pubblicato dal Comune* / *In attesa di validazione*).
2. **Citazione verificabile a 1 clic**: ogni cella numerica espone un popover con: `Titolo atto`, `MM`, `Data`, `Pagina`, `Metodo estrazione` (`Deterministico` / `Verificato manualmente`) e link diretto al PDF originale (`url#page=N`).
3. **Neutralità istituzionale**: palette cromatica sobria e accessibile ai daltonici (blu ardesia istituzionale, verde smeraldo + icona `✓`, ambra + icona `▲`, rosso rubino + icona `!` — mai solo colore, sempre testo + icona per conformità **WCAG 2.1 AA**). Nessun uso degli stemmi araldici ufficiali dei Comuni (vedi `12-legal-compliance.md`).
4. **Confronti onesti**: quando l'utente confronta Comuni con perimetri contabili diversi (es. acqua potabile integrata vs azienda separata AAP/ACAP, o anno post-fusione Verzasca), compare un banner contestuale non invasivo che spiega la differenza strutturale.

---

## 4. Contratto API REST Read-Only (`/api/v1`)

Tutte le rotte API sono `GET` pubbliche, servite con `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, `Access-Control-Allow-Origin: *` e rate limit `60 req/min/IP`:

- `GET /api/v1/comuni` — anagrafica dei 19 Comuni, popolazione STATPOP, ultimo moltiplicatore PF/PG e copertura.
- `GET /api/v1/comuni/{ust_or_slug}/riassunto?anno=2025&ente=COMUNE` — Conto Economico a 3 stadi, Conto Investimenti, Autofinanziamento e Bilancio sintetico con oggetto `provenance: { origin_url, mm_number, page, sha256 }` su ogni voce.
- `GET /api/v1/indicatori?comune=5115&anno=2025` — gli 8 indicatori SEL (`reported` e `computed`), fascia ufficiale e input del calcolo.
- `GET /api/v1/crediti?comune=5113&only_overruns=true&stato=IN_CORSO` — crediti d'investimento paginati (`limit<=200`, `cursor`).
- `GET /api/v1/documenti?comune=5396&tipo=CONSUNTIVO` — catalogo atti con metadati e stato online/offline.

Formato risposta standardizzato:
```json
{
  "meta": {
    "dataset_version": "2026.11.0",
    "license": "CC-BY-4.0",
    "disclaimer": "Fanno fede esclusivamente gli atti ufficiali esposti all'albo comunale (art. 192 LOC)."
  },
  "data": [ ... ]
}
```

---

## 5. Specifica Open Data Package (Frictionless Data Standard)

Ad ogni pubblicazione mensile o stagionale, il workflow `release-opendata.yml` genera un archivio immutabile `ofcl-locarnese-vYYYY.MM.P.zip` contenente:

- `datapackage.json` — schema Frictionless completo (tipi, chiavi primarie, chiavi esterne, descrizioni bilingui IT/EN dei campi MCA2).
- `comuni.csv` / `.parquet`
- `moltiplicatori_popolazione.csv` / `.parquet`
- `conti_riassunto_natura_funzione.csv` / `.parquet` (con colonne `origin_url`, `mm_number`, `page`, `sha256`)
- `indicatori_sel.csv` / `.parquet`
- `crediti_investimento_storico.csv` / `.parquet`
- `CHANGELOG.md` e `LICENSE.txt` (`CC BY 4.0`).

> **Dettaglio pratico Svizzera/Ticino**: oltre al CSV standard UTF-8 con virgola (`,`), viene generata una variante `*-excel-ch.csv` con **BOM UTF-8 e separatore punto e virgola (`;`)**, così che consiglieri comunali, segretari e giornalisti possano aprirlo con doppio clic in Microsoft Excel svizzero senza corrompere accenti o decimali!

---

## 6. Swiss Design System, Effetti Visivi & Doppia Pipeline Responsiva (Desktop & Mobile)

A integrazione delle linee guida di accessibilità (`WCAG 2.1 AA`) e della neutralità istituzionale svizzera, il portale pubblico adotta un linguaggio visivo ispirato al territorio del Locarnese (paesaggio lacustre e montano, architettura contemporanea ticinese) declinato su 5 effetti visivi qualificanti e una rigorosa separazione architetturale tra le pipeline di visualizzazione Desktop e Mobile.

### 6.1 I 5 Effetti Visivi Istituzionali del Locarnese

#### 1. "Alpine Frosted Glass" (Glassmorphism Istituzionale)
- **Concetto & Riferimento Territoriale:** Evoca l'acqua limpida del Verbano, il ghiaccio delle valli e le superfici vetrate dell'architettura ticinese moderna (stile Mario Botta). Consente di mostrare fotografie panoramiche a tutto schermo (es. bacino di Locarno, Cardada, Ascona, Gambarogno) garantendo al contempo un contrasto ottimale per la lettura dei dati contabili a 2 decimali.
- **Ambiti di applicazione:** Navbar superiore fissa con disclaimer legale ex art. 192 LOC, le 4 card Hero dei Numeri Chiave distrettuali, il container principale della griglia comparativa e la Scheda dei 30 Secondi.
- **Specifiche Tecniche CSS (Leggibilità e WCAG 2.1 AA):**
  ```css
  /* Card con effetto vetro svizzero moderno */
  background: rgba(255, 255, 255, 0.78); /* Opacità 78-85% per leggibilità elevata dei decimali MCA2 */
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  ```
  Sulle cifre contabili viene applicato colore solido ad alto contrasto (`#0F172A` / `#000000`, `font-semibold`), garantendo un rapporto di contrasto superiore a 7:1 (superando il requisito minimo 4.5:1 di WCAG AA).

#### 2. Bento Grid con Micro-Interazioni Elastiche (Spring Physics)
- **Concetto:** Disposizione delle card a scatole modulari "Bento Box" in puro Swiss Design contemporaneo, con gerarchia chiara e densità informativa bilanciata.
- **Struttura dei Quadranti Bento per OFCL:**
  - **Card Grande (Master Grid):** Griglia comparativa interattiva dei 19 Comuni, ordinabile per moltiplicatore PF/PG, debito pro capite e risultato d'esercizio, dotata di cruscotto a 8 micro-tacche SEL.
  - **Card Media (30 Secondi):** Scheda del Comune attivo con le 4 Grandi Cifre (Avanzo/Disavanzo, Autofinanziamento, Investimenti, Debito) e link puntuali alle delibere ufficiali (`MM 060 p.N ↗`).
  - **Card Smart Alert Crediti:** Monitoraggio dinamico delle delibere d'investimento. In presenza di sforamenti > 10% (ex art. 15 LOC) espone un banner di allerta contestuale con spesa e link all'Allegato f; in caso contrario certifica la conformità con badge verde.
  - **Card Ripartizione Territoriale:** Spese nette per Dicastero (0–9) e mappa territoriale interattiva.
- **Micro-interazioni:** Risposta elastica discreta con funzione di molla CSS (`transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease`), con leggero sollevamento (`scale-[1.01]`) e riflesso di luce radiale morbido all'hover.

#### 3. Effetto "Acqua Calma" (Subtle Fluid Wave & Gradienti Solari)
- **Concetto & Prestazioni:** Nessuna simulazione WebGPU pesante che surriscaldi i dispositivi mobili. Utilizzo di tracciati SVG vettoriali con curve di Bézier fluide e shader Canvas ultra-leggeri (< 15KB) che riproducono la dolce increspatura dell'acqua del Lago Maggiore al movimento del cursore o allo scorrimento.
- **Palette Cromatica Distrettuale:**
  - **Blu Verbano Profondo:** `#0F3854` (colore istituzionale e testate tabellari)
  - **Azzurro Ciano Verzasca:** `#00A3C4` (accenti interattivi, link e barre di progresso attive)
  - **Verde Smeraldo Isole di Brissago:** `#10B981` (indicatori SEL positivi e crediti conformi)
  - **Oro Solare Cardada / Gambarogno:** `#D97706` (tramonto locarnese, usato per evidenziazioni e soglie di attenzione SEL)
  - **Rosso Rubino Istituzionale:** `#DC2626` (sforamenti crediti e indicatori SEL critici, sempre affiancato da icona di allerta)

#### 4. Smooth Scrollytelling con Parallax a Livelli (Profondità del Territorio)
- **Perimetro di Applicazione Controllato:** Riservato unicamente alle pagine descrittive e di contesto (es. `/metodologia`, `/stato`, `/report-annuale` o presentazioni territoriali). **Escluso esplicitamente** dalla console operativa `/admin` e dalla griglia di ricerca dei dati finanziari per evitare qualsiasi fenomeno di *scroll-jacking* o rallentamento nell'esplorazione dei numeri.
- **Dinamica Visiva:** Scorrimento a livelli di profondità (monti di sfondo a velocità ridotta, specchio d'acqua a velocità media, card informative in primo piano a velocità naturale) per ricreare la sensazione prospettica di una terrazza panoramica sul comprensorio.

#### 5. Mappa Territoriale SVG & Rilievo Sottile (La "Chicca" Premium)
- **Architettura Leggera:** Invece di librerie 3D pesanti da decine di megabyte, visualizzazione vettoriale SVG georeferenziata dei 19 comuni del distretto con rilievo orografico minimale.
- **Comportamento Interattivo:** Ciascun comune è un poligono SVG cliccabile con transizione fluida, tematizzato cromaticamente in base al moltiplicatore d'imposta (gradiente verde-ambra-rosso). Il clic su un comune centra la vista e aggiorna istantaneamente la Scheda dei 30 Secondi nel pannello affiancato.

---

### 6.2 Doppia Pipeline Responsiva Disaccoppiata (Desktop & Mobile)

Per prevenire conflitti di classi CSS, salti di impaginazione (*layout shift*) e garantire la massima ergonomia d'uso su qualsiasi dispositivo, l'interfaccia frontend Next.js adotta una separazione esplicita a due pipeline di rendering componentizzate:

```
web/src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardDesktop.tsx   # Layout a 2 colonne Master-Detail reattivo in-place
│   │   ├── DashboardMobile.tsx    # Layout compatto con Drawer / Bottom Sheet scorrevole
│   │   ├── MunicipalitiesTable.tsx# Griglia tabellare densa con cruscotto 8 tacche SEL
│   │   ├── QuickCard30s.tsx       # Scheda sintetica 4 Grandi Cifre + link MM
│   │   ├── TerritorialMap.tsx     # Mappa vettoriale interattiva dei 19 comuni
│   │   ├── CreditAlertBanner.tsx  # Smart alert per art. 15 LOC (sforamento > 10%)
│   │   └── IndicatorsSelBar.tsx   # Micro-cruscotto a 8 segmenti (🟢/🟡/🔴)
│   └── shared/
│       ├── HeaderAlpine.tsx       # Navbar fissa con disclaimer art. 192 LOC
│       └── FooterOpenData.tsx     # Footer con licenza CC-BY-4.0 e download
```

#### Specifiche della Pipeline Desktop (`DashboardDesktop.tsx`)
- **Layout:** Vista a due colonne fisse master-detail (Colonna sinistra 60% per la Bento Grid con Griglia 19 Comuni, Colonna destra 40% sticky per la Scheda dei 30 Secondi).
- **Interazione In-Place:** Cliccando una riga qualsiasi nella tabella di sinistra, la scheda di destra si aggiorna istantaneamente in stato reattivo client-side, senza ricaricare la pagina o perdere lo scroll della tabella.
- **Densità Dati:** Tabella a 7 colonne con codice UST, nome comune, moltiplicatore PF/PG, debito pro capite, micro-cruscotto 8 indicatori SEL con tooltip hover, link delibera e pulsante "Apri Scheda Completa ↗".

#### Specifiche della Pipeline Mobile (`DashboardMobile.tsx`)
- **Layout:** Flusso verticale a card singola con ricerca in evidenza e lista comuni a blocchi touch-friendly.
- **Bottom Sheet / Drawer Scorrevole:** Il tocco su un comune apre un cassetto scorrevole dal basso (trascinabile o espandibile con gesture) che presenta le 4 Grandi Cifre, i semafori SEL e l'eventuale allerta crediti d'opera.
- **Ergonomia One-Hand:** Tutti i target interattivi hanno altezza minima di `44px` conformemente alle linee guida Apple HIG e WCAG 2.1 AA, permettendo la consultazione rapida da smartphone con una sola mano.

---

### 6.3 Micro-Disclaimer Istituzionale & Frequenza di Aggiornamento
In conformità alle decisioni di progetto, il testo informativo sintetico fisso nell'Header superiore e nel Footer adotta la seguente dicitura:
> *"Dati aggiornati settimanalmente (ogni lunedì alle 04:00 CET). Fanno fede gli atti esposti ex art. 192 LOC."*

Questa formulazione essenziale garantisce trasparenza sulla cadenza di aggiornamento senza sovraccaricare visivamente la navigazione.

---

### 6.4 Modulo Civico di Segnalazione & Rettifica ("Civic Ticket Sandbox")
Per consentire a cittadini, contabili, consiglieri comunali e giornalisti di segnalare discrepanze nei dati esposti, l'interfaccia include un popover/modal interattivo "Segnala una discrepanza / Proponi una correzione":
- **Architettura di Sicurezza & Sandbox Rigorosa:**
  - Solo input di testo semplice con sanitizzazione server-side (rimozione di tag HTML, caratteri di controllo e codice eseguibile, zero vulnerabilità XSS/SQLi).
  - Limite di lunghezza: massimo **500 caratteri**.
  - Rate limiting protetto per IP: massimo 3 segnalazioni all'ora per indirizzo IP.
  - Honeypot invisibile e token CSRF per bloccare bot e spam automatico.
- **Flusso Operativo e Canale di Notifica:**
  - L'endpoint protetto `POST /api/feedback` registra la segnalazione nello schema di audit (`audit.feedback_ticket`) con stato `NEW` e contesto associato (Comune, codice UST, metrica o delibera segnalata).
  - L'API recapita contestualmente una notifica email strutturata all'indirizzo del curatore responsabile: `nicolas.vecchio241097@gmail.com`.
  - La notifica include: timestamp, codice UST, nome del Comune, metrica o delibera contestata, testo della segnalazione e link diretto allo split-view di revisione (`/admin/review/[versionId]`).

---

### 6.5 Civic Deep Dive: "Vivere nel Comune: Tasse, Tariffe, Famiglie & Servizi"
Oltre ai tabulati contabili e alla "Regola dei 30 Secondi", la scheda di ciascun Comune integra una sezione di approfondimento pratico strutturata in quadranti Bento ordinati, volta a offrire alle famiglie e ai residenti del Locarnese una visione completa del costo della vita e dei servizi municipali:

#### Quadrante A: Tariffe di Causalità & Costi Obbligatori (Cosa pago ogni anno?)
- **Tassa Base Rifiuti & Tariffa Puntuale:** Costo annuo della tassa base a fuoco/residente + costo del sacco ufficiale dei rifiuti (es. 1.30 CHF per sacco da 35L).
- **Acqua Potabile & Fognature:** Tariffa al metro cubo consumato (`CHF/m³`) + quota fissa di allacciamento (con indicazione dell'azienda distributrice: es. SES, ACAP, Azienda Acqua comunale).
- **Imposta Immobiliare Comunale:** Aliquota applicata ai valori di stima (es. 0.0‰ a Losone, 1.5‰ a Locarno o altro comune).
- **Tassa sui Cani:** Importo della tassa annua comunale (con indicazione delle esenzioni per cani d'utilità o guida).
- **Parcheggi & Mobilità Residenziale:** Costo dell'abbonamento annuo o mensile per parcheggi in zona blu / stalli riservati ai residenti.

#### Quadrante B: Sostegno alle Famiglie, Infanzia & Educazione (Cosa offre il Comune?)
- **Bonus / Assegno Comunale di Nascita:** Importo una-tantum riconosciuto dal Comune per ogni neonato residente (es. 500–1'000 CHF).
- **Retta Nido d'Infanzia & Asili:** Tariffa oraria/mensile calmierata per le famiglie residenti e sussidi comunali integrativi rispetto al Cantone.
- **Ristorazione Scolastica & Doposcuola:** Costo del pasto alla mensa scolastica (tariffa differenziata per fasce di reddito) e contributo al servizio parascolastico.
- **Sussidi per Attività Giovanili (Sport & Musica):** Contributi comunali a fondo perso per i giovani (<18 anni) iscritti a società sportive o scuole di musica riconosciute.
- **Borse di Studio & Sussidi Scolastici:** Buoni comunali per l'acquisto di libri di testo per scuole medie, superiori o apprendisti.

#### Quadrante C: Terza Età, Inclusione Sociale & Salute
- **Pasti a Domicilio & Sostegno Spitex:** Servizio comunale per anziani e persone non autosufficienti con tariffe agevolate.
- **Agevolazioni Lidi & Centri Balneari per Anziani (AVS):** Accesso gratuito o abbonamenti fortemente scontati per residenti AVS a lidi e piscine comunali (es. Lido Locarno, centri balneari lacustri).
- **Trasporto Sociale Anziani:** Servizi comunali o convenzionati di trasporto per visite mediche o commissioni essenziali.

#### Quadrante D: Sostenibilità Energetica, Clima & Trasporti
- **Incentivi Comunali per l'Energia (Clima & Risparmio):** Fondo comunale per impianti fotovoltaici, pompe di calore e risanamenti termici (contributi CHF/kWp o forfait che si sommano ai sussidi cantonali FER).
- **Sconti Trasporto Pubblico (Comunità Tariffale Arcobaleno):** Percentuale di rimborso comunale sull'abbonamento annuale per giovani studenti o pensionati.
- **Incentivi alla Mobilità Dolce:** Contributi all'acquisto di biciclette elettriche (E-Bike) o stazioni di ricarica domestiche.
- **Smaltimento Scarti Vegetali (Verde):** Modalità del servizio (gratuito con ecocentro o tramite abbonamento a bidone carrellato).

#### Quadrante E: Informazioni Istituzionali & Sportello
- **Moltiplicatore Fiscale Differenziato:** Quota PF (Persone Fisiche) e quota PG (Persone Giuridiche).
- **Tassa di Soggiorno Turistica:** Costo per notte applicato nei comuni turistici (es. Ascona, Brissago, Locarno).
- **Cancelleria & Pratiche:** Costo di rilascio certificati anagrafici (es. certificato di domicilio o stato di famiglia) e canali di sportello.
