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
