# 12 · Quadro Giuridico, Privacy (nLPD/LPDP) & Template Istituzionali

> Poiché OFCL è un **portale pubblico di trasparenza civica**, la solidità giuridica e reputazionale è tanto importante quanto quella ingegneristica (risolve le criticità **C-02**, **C-04**, **C-11**).

---

## 1. Analisi Normativa Svizzera e Ticinese

| Ambito normativo | Riferimento di legge | Implicazione diretta per OFCL | Scelta architetturale adottata |
|---|---|---|---|
| **Diritto d'autore sugli atti comunali** | **Art. 5 cpv. 1 lett. a & c LDA** (Legge federale sul diritto d'autore, RS 231.1) | Leggi, regolamenti, risoluzioni, messaggi municipali, preventivi e consuntivi delle autorità comunali sono **atti ufficiali esclusi dalla protezione del diritto d'autore**. I dati numerici estratti sono liberamente riutilizzabili. | Estrazione e pubblicazione libera dei dati contabili e metadati, sempre con citazione puntuale della fonte ufficiale. |
| **Protezione degli stemmi pubblici** | **LPSt** (Legge federale sulla protezione degli stemmi della Svizzera e altri segni pubblici, RS 232.21) | L'uso degli **stemmi ufficiali comunali** da parte di privati può essere soggetto a restrizioni o generare confusione con un portale istituzionale ufficiale. | **Vietato usare gli stemmi araldici dei 19 Comuni** nella UI: usare badge tipografici moderni (sigla + colore circolo) e mappa geografica swisstopo. |
| **Valore giuridico dell'Albo Comunale** | **Art. 192 LOC** (Legge organica comunale ticinese, RL 181.100) | Anche sui siti comunali stessi vale la regola che fa fede esclusivamente l'atto cartaceo esposto all'albo pretorio fisico. | Banner fisso + footer + campo `meta.disclaimer` in ogni risposta API/CSV: *"OFCL è un osservatorio civico indipendente. Agli effetti giuridici fanno fede esclusivamente gli atti ufficiali esposti agli albi comunali."* |
| **Protezione dei dati personali** | **nLPD** federale (RS 235.1) & **LPDP** cantonale ticinese (RL 163.100) | Negli albi e nei Messaggi Municipali compaiono atti che contengono **dati personali o degni di particolare protezione** (domande di naturalizzazione/attinenza comunale, espropriazioni particelle con nomi proprietari, liti giudiziarie nominative, condoni). | **Architettura Privacy-by-Design in 3 barriere**: (1) in v1 il portale pubblico **NON ridistribuisce copie dei PDF**, ma punta al link ufficiale comunale; (2) il bucket **Cloudflare R2 `ofcl-raw-pdfs`** delle copie di lavoro è **privato**; (3) il filtro automatico + flag `contains_personal_data` esclude qualsiasi MM nominativo anche dall'indice pubblico, e il modulo Civic Ticket salva solo `ip_hash` salato giornaliero senza IP in chiaro. |
| **Rispetto tecnico `robots.txt`** | Prassi di buona fede / Art. 2 CC / Art. 143bis CP (nessun aggiramento barriere) | `locarno.ch` dichiara `Disallow: /files/`; Lavertezzo dichiara `Disallow: /images/PDF/`. | Rispetto **assoluto al 100%** di `robots.txt` e `Crawl-delay`. Nessuno spoofing di User-Agent, nessun proxy rotante. Per Locarno: upload manuale curatore + richiesta formale di autorizzazione (Template A sotto). |
| **Accesso agli atti mancanti** | **LIT** (Legge sull'informazione e sulla trasparenza dello Stato del 15 marzo 1995, RL 162.100) | Ogni persona ha diritto di consultare i documenti ufficiali (preventivi/consuntivi approvati) senza dover dimostrare un interesse particolare. | Per i Comuni con serie online incompleta (es. Gordola o Orselina pre-2024), invio cortese di richiesta digitale alla Cancelleria comunale (Template B). |

---

## 2. Licenza Open Data

- **Dataset tabellari e metadati OFCL**: rilasciati sotto licenza **Creative Commons Attribution 4.0 International (`CC BY 4.0`)**, compatibile con lo standard svizzero **Opendata.swiss (`O-By` — Open use, Must provide the source)**.
- **Codice sorgente della pipeline e dei validatori MCA2**: consigliato rilascio open-source (**MIT** o **Apache-2.0**) sul repository GitHub pubblico: aumenta enormemente la fiducia istituzionale di Comuni, giornalisti e SEL (chiunque può verificare come vengono calcolati gli indicatori) e garantisce **minuti GitHub Actions gratuiti**.

---

## 3. Procedura di Rettifica Rapida ("24h Notice & Correction")

Poiché un falso positivo su un sorpasso di credito può avere eco mediatica locale:
1. Ogni pagina espone il tasto **"Segnala un'imprecisione contabile"** precompilato con `value_id`, Comune, documento e pagina.
2. Il curatore può mettere in stato `UNPUBLISHED_UNDER_CHECK` una singola riga o documento in **1 clic** (tempo di reazione < 24h) mentre verifica il PDF.
3. Tutte le rettifiche post-pubblicazione compaiono pubblicamente nella pagina `/changelog-dati` (massima trasparenza editoriale).

---

## 4. Template Istituzionali Pronti all'Uso

### Template A · Richiesta Autorizzazione / Collaborazione Dati alla Città di Locarno (Risolve C-02)

```text
Oggetto: Osservatorio civico Finanze Comunali del Locarnese (MCA2) – Richiesta permesso di accesso tecnico ai fascicoli contabili pubblici (/files/documenti/) o fornitura export strutturato

Gentile Segretario comunale,
Spettabile Cancelleria comunale e Servizio Finanze della Città di Locarno,

sto realizzando l'Osservatorio delle Finanze Comunali del Locarnese, un portale civico pubblico, gratuito e senza scopo di lucro dedicato alla consultazione trasparente e comparata dei conti Preventivi e Consuntivi secondo il modello MCA2 dei 19 Comuni del Distretto di Locarno, con open data scaricabili per cittadini, consiglieri comunali, ricercatori e giornalisti.

Nel pieno rispetto delle direttive tecniche dei portali istituzionali, abbiamo rilevato che il file robots.txt del portale www.locarno.ch include la regola generica "Disallow: /files/", cartella nella quale risiedono anche i PDF pubblici dei Preventivi, dei Consuntivi e dei Messaggi Municipali già pubblicati sul sito. Per correttezza deontologica, il nostro sistema automatizzato si astiene dallo scaricare qualsiasi file soggetto a tale direttiva.

Con la presente Vi chiediamo cortesemente:
1. l'autorizzazione ad acquisire periodicamente (con frequenza massima settimanale e carico trascurabile) i soli fascicoli PDF pubblici di Preventivo, Consuntivo, Piano Finanziario e Messaggi Municipali finanziari esposti nelle sezioni /it/finanze e /it/messaggi-municipali (eventualmente tramite whitelist del nostro User-Agent identificato);
2. in alternativa o a complemento, qualora il Vostro sistema gestionale lo consenta agevolmente, la possibilità di ricevere o scaricare l'esportazione tabellare (CSV/Excel/XML MCA2) dei conti approvati dal Consiglio comunale.

Ogni dato pubblicato riporterà il rinvio diretto alla pagina esatta del documento ufficiale della Città e l'avvertenza ex art. 192 LOC. Resto volentieri a disposizione per presentarVi in anteprima la scheda dedicata alla Città di Locarno.

Con i migliori saluti,
[Nome Cognome]
[Recapiti / Contatto progetto]
```

### Template B · Richiesta Cortese Fascicoli Mancanti alle Cancellerie Comunali (ex LIT — Risolve C-11)

```text
Oggetto: Richiesta copia digitale PDF dei Conti Consuntivi e Preventivi comunali MCA2 (esercizi 2022–2026)

Gentile Segretario comunale, Spettabile Cancelleria comunale di [Nome Comune],

nell'ambito della raccolta documentale per l'Osservatorio pubblico sulle Finanze Comunali del Distretto di Locarno (basato sui conti ufficiali MCA2), abbiamo riscontrato che sul portale comunale online non risultano attualmente reperibili i fascicoli PDF completi (inclusi gli allegati ex art. 22 RGFCC) relativi ai seguenti esercizi già approvati dal Consiglio comunale:
- Conto Consuntivo: [anni mancanti, es. 2023, 2024, 2025]
- Conto Preventivo: [anni mancanti, es. 2024, 2025, 2026]

Ai sensi dei principi di pubblicità degli atti ufficiali e della Legge sull'informazione e sulla trasparenza dello Stato (LIT), Vi chiediamo cortesemente se sia possibile trasmetterci via e-mail (o tramite link di scaricamento) la versione PDF definitiva di tali fascicoli contabili.

RingraziandoVi sin d'ora per la preziosa collaborazione istituzionale, porgiamo distinti saluti.

[Nome Cognome]
[Recapiti]
```

---

## 5. Testi Ufficiali del Disclaimer di Responsabilità (Verbatim)

Per garantire la massima tutela legale e trasparenza verso cittadini, consiglieri comunali, giornalisti e amministrazioni pubbliche, il disclaimer opera su **4 livelli complementari**:

### A. Livello 1: Top Banner Fisso (Tutte le pagine pubbliche — versione sintetica approvata)
> Dati aggiornati settimanalmente (ogni lunedì alle 04:00 CET). Fanno fede gli atti esposti ex art. 192 LOC. [Note legali →](/note-legali)

### B. Livello 2: Footer Istituzionale (Tutte le pagine pubbliche)
> **Disclaimer & Fonti:** Dati finanziari rielaborati a scopo informativo, statistico e civico. Fonti: Albi e siti web dei 19 Comuni del Distretto di Locarno, Sezione degli enti locali (SEL) del Cantone Ticino. Ai sensi dell'art. 192 LOC, hanno valore probatorio unicamente gli atti cartacei/digitali ufficiali esposti all'Albo pretorio. OFCL declina ogni responsabilità per eventuali errori di estrazione, trascrizione o disallineamento temporale. Dati aperti sotto licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.it). [Segnala un'imprecisione contabile](/segnala) · [Note Legali & Privacy](/note-legali).

### C. Livello 3: Metadati API (`meta.disclaimer`) e Intestazione CSV/Open Data
- **In ogni payload JSON (`GET /api/v1/...`)**:
```json
{
  "meta": {
    "source": "OFCL - Osservatorio Finanze Comunali del Locarnese",
    "legal_disclaimer": "Dati rielaborati a solo scopo conoscitivo. Agli effetti giuridici fanno fede esclusivamente gli atti ufficiali esposti all'albo comunale (art. 192 LOC). Non costituisce consulenza contabile, fiscale o legale.",
    "official_sources": [
      "Albi pretori e portali web ufficiali dei 19 Comuni del Distretto di Locarno",
      "Sezione degli enti locali (SEL) - Dipartimento delle Istituzioni del Cantone Ticino"
    ],
    "license": "CC BY 4.0 (Creative Commons Attribution 4.0 International)",
    "correction_url": "https://finanze-locarnese.ch/segnala"
  }
}
```
- **In cima a ogni export CSV/TSV**:
```text
# OFCL - Osservatorio Finanze Comunali del Locarnese | Dati MCA2 rielaborati
# Disclaimer: Dati a solo scopo conoscitivo. Fanno fede esclusivamente gli atti ufficiali esposti all'albo (art. 192 LOC).
# Fonti: Pubblicazioni ufficiali dei 19 Comuni del Locarnese e Sezione Enti Locali (SEL). Licenza: CC BY 4.0.
# Segnalazioni e rettifiche: https://finanze-locarnese.ch/segnala
```

### D. Livello 4: Pagina Integrale `/note-legali` (Termini di Utilizzo e Clausole di Manleva)

Il testo integrale copre obbligatoriamente i seguenti 10 capitoli codificati:

1. **Natura del Portale & Indipendenza Civica:** Dichiarazione esplicita che OFCL è un progetto civico no-profit indipendente di trasparenza sui dati aperti e non un ente pubblico, né un organo ausiliario dei Comuni o del Cantone Ticino.
2. **Fonti Ufficiali dei Dati:** Indicazione tassativa delle sorgenti (Albi comunali, Preventivi e Consuntivi comunali approvati, Allegati RGFCC `a–p`, Messaggi Municipali finanziari, rendiconti SEL).
3. **Valore Legale Esclusivo dell'Albo Comunale (Art. 192 LOC RL 181.100):** Menhir giuridico in base al quale la pubblicazione digitale su OFCL non ha valore di notifica, esecutività o certificazione formale, riservata unicamente all'Albo pretorio.
4. **Esclusione di Garanzia e Limitazione di Responsabilità:** Riconoscimento che l'acquisizione dei dati poggia su algoritmi di estrazione geometrica/OCR e riconciliazione automatica. Possibilità di errori materiali, ritardi di pubblicazione o divergenze contabili. Esclusione espressa di qualsiasi responsabilità per danni diretti, indiretti, patrimoniali o finanziari derivanti dall'affidamento sui dati. I dati non costituiscono parere professionale, contabile, fiscale o legale.
5. **Diritto d'Autore & Riuso dei Dati Pubblici (Art. 5 cpv. 1 LDA RS 231.1):** Qualificazione degli atti comunali come documenti ufficiali esclusi dal diritto d'autore. Rilascio del valore aggiunto strutturato sotto licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0).
6. **Protezione dei Segni Pubblici (LPSt RS 232.21):** Attestazione del mancato utilizzo di stemmi araldici ufficiali della Confederazione, del Cantone o dei Comuni per prevenire confusione con le autorità pubbliche.
7. **Protezione dei Dati Personali (nLPD RS 235.1 & LPDP RL 163.100):** Garanzia di assenza di trattamento sistematico di dati personali; esclusione preventiva di qualsiasi fascicolo concernente persone fisiche (naturalizzazioni, condoni, pendenze legali nominative).
8. **Diritto di Accesso e Trasparenza (LIT RL 162.100):** Inquadramento della raccolta dati nell'esercizio del principio di trasparenza amministrativa sancito dal diritto cantonale.
9. **Procedura di Segnalazione, Rettifica e Sospensione Cautelare (Notice & Take-Down in 24h):** Canale aperto per cittadini e funzionari comunali per richiedere l'immediata verifica o messa offline cautelativa di dati contestati.
10. **Diritto Applicabile & Foro Competente:** Applicazione esclusiva del diritto materiale svizzero; foro competente per ogni eventuale controversia: Pretura del Distretto di Locarno e Città.

