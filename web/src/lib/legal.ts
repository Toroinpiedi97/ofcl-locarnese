/**
 * OFCL - Osservatorio Finanze Comunali del Locarnese
 * Modulo di conformità legale, fonti ufficiali e clausole di manleva.
 * Riferimenti normativi: LOC (art. 192), LDA (art. 5), LPSt, nLPD, LPDP, LIT.
 */

export const LEGAL_CONFIG = {
  portalName: "Osservatorio Finanze Comunali del Locarnese (OFCL)",
  jurisdiction: "Distretto di Locarno (Cantone Ticino, Svizzera)",
  applicableLaw: "Diritto materiale svizzero e cantonale ticinese",
  courtOfJurisdiction: "Pretura del Distretto di Locarno e della Città (Locarno)",
  license: {
    name: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    shortName: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/deed.it",
  },
  correctionsEmail: "nicolas.vecchio241097@gmail.com",
  correctionsUrl: "/segnala",
  legalPageUrl: "/note-legali",
  methodologyUrl: "/metodologia",
} as const;

export const OFFICIAL_SOURCES = [
  {
    name: "Albi pretori ufficiali dei 19 Comuni del Locarnese",
    description:
      "Albi fisici e digitali dei 19 Comuni del Distretto di Locarno (Ascona, Brione sopra Minusio, Brissago, Centovalli, Cugnasco-Gerra, Gambarogno, Gordola, Lavertezzo, Locarno, Losone, Mergoscia, Minusio, Muralto, Onsernone, Orselina, Ronco sopra Ascona, Tenero-Contra, Terre di Pedemonte, Verzasca).",
  },
  {
    name: "Fascicoli di Contabilità Comunale Armonizzata (MCA2)",
    description:
      "Preventivi, Consuntivi, Allegati obbligatori a-p ex art. 22 RGFCC (tra cui Allegato e - Cespiti e Allegato f - Controllo Crediti d'investimento) e Messaggi Municipali approvati dai Consigli Comunali.",
  },
  {
    name: "Sezione degli enti locali (SEL)",
    description:
      "Dipartimento delle istituzioni della Repubblica e Cantone Ticino (Bellinzona): indicatori finanziari ufficiali, moltiplicatori d'imposta comunali e circolari esplicative MCA2.",
  },
] as const;

export const LEGAL_DISCLAIMERS = {
  /** Banner sintetico posizionato in cima a ogni pagina */
  banner: {
    shortText:
      "Dati aggiornati settimanalmente (ogni lunedì alle 04:00 CET). Fanno fede gli atti esposti ex art. 192 LOC.",
    linkText: "Note legali",
  },

  /** Disclaimer per il footer del portale */
  footer: {
    title: "Trasparenza civica & Esclusione di responsabilità",
    body: "OFCL rielabora dati contabili ufficiali a fini informativi, di trasparenza e ricerca civica. Nonostante la rigorosa riconciliazione automatica, possono verificarsi imprecisioni o ritardi: l'unico documento con valore legale probatorio resta l'atto originale affisso all'albo comunale (art. 192 LOC). Il portale declina qualsiasi responsabilità per decisioni patrimoniali o finanziarie assunte sulla base di questi dati.",
    licenseNotice: "Dataset tabellari e metadati rilasciati con licenza CC BY 4.0.",
  },

  /** Oggetto JSON standard inserito in ogni risposta API publica */
  apiPayload: {
    source: LEGAL_CONFIG.portalName,
    disclaimer:
      "Dati rielaborati a solo scopo conoscitivo. Agli effetti giuridici fanno fede esclusivamente gli atti ufficiali esposti all'albo comunale (art. 192 LOC). I dati non costituiscono consulenza contabile, fiscale o legale.",
    official_sources: [
      "Albi pretori e portali web ufficiali dei 19 Comuni del Distretto di Locarno",
      "Sezione degli enti locali (SEL) - Dipartimento delle Istituzioni del Cantone Ticino",
    ],
    license: LEGAL_CONFIG.license.name,
    license_url: LEGAL_CONFIG.license.url,
    corrections_url: LEGAL_CONFIG.correctionsUrl,
  },

  /** Intestazione testuale inserita in testa agli export CSV/TSV */
  csvHeader: [
    `# ${LEGAL_CONFIG.portalName} | Dati MCA2 rielaborati`,
    `# Disclaimer: Dati a solo scopo conoscitivo. Fanno fede esclusivamente gli atti ufficiali esposti all'albo (art. 192 LOC).`,
    `# Fonti: Pubblicazioni ufficiali dei 19 Comuni del Locarnese e Sezione Enti Locali (SEL).`,
    `# Licenza: ${LEGAL_CONFIG.license.name}`,
    `# Segnalazioni e correzioni: ${LEGAL_CONFIG.correctionsUrl}`,
  ].join("\n"),
} as const;

export const LEGAL_SECTIONS = [
  {
    id: "natura-indipendente",
    title: "1. Natura dell'Iniziativa & Indipendenza Civica",
    content: `L'Osservatorio Finanze Comunali del Locarnese (OFCL) è un'iniziativa civica indipendente, senza fini di lucro, volta a promuovere la trasparenza, la comparabilità e l'accessibilità dei dati contabili pubblici dei 19 Comuni del Distretto di Locarno.
OFCL non è un ente pubblico, non è un organo ausiliario dei Comuni né della Sezione degli enti locali (SEL) del Cantone Ticino, e non esercita alcuna funzione pubblica ufficiale.`,
  },
  {
    id: "fonti-ufficiali",
    title: "2. Fonti Ufficiali dei Dati",
    content: `Tutti i valori contabili, i moltiplicatori d'imposta (PF/PG), gli investimenti e gli indicatori finanziari presentati su questo portale sono acquisiti direttamente da fonti istituzionali liberamente accessibili:
• Albi pretori comunali e sezioni web ufficiali dei 19 Comuni locarnesi (Preventivi, Consuntivi, Messaggi Municipali, Risoluzioni municipali e consiliari);
• Fascicoli di contabilità armonizzata MCA2 e allegati obbligatori ex art. 22 RGFCC (in particolare Allegato e sui cespiti e Allegato f sul controllo crediti d'investimento);
• Rendiconti statistici e indicatori di vigilanza finanziaria pubblicati dalla Sezione degli enti locali (SEL) del Dipartimento delle istituzioni della Repubblica e Cantone Ticino.`,
  },
  {
    id: "art-192-loc",
    title: "3. Valore Legale Esclusivo dell'Albo Comunale (Art. 192 LOC)",
    content: `Ai sensi dell'art. 192 della Legge organica comunale (LOC, RL 181.100), la pubblicazione degli atti municipali e delle deliberazioni del Consiglio comunale avviene mediante affissione all'albo comunale.
Agli effetti di legge e a ogni fine formale o probatorio, fanno fede unicamente i testi originali degli atti ufficiali esposti agli albi comunali fisici o sui canali ufficiali designati dalle singole amministrazioni comunali.
I dati, i grafici e le tabelle pubblicati su OFCL hanno mero valore divulgativo e di orientamento civico e non costituiscono in alcun caso atto ufficiale o notificazione formale.`,
  },
  {
    id: "esclusione-responsabilita",
    title: "4. Esclusione di Garanzia ed Esonero di Responsabilità per Errori",
    content: `La conversione dei fascicoli contabili in dati aperti poggia su procedimenti automatizzati di estrazione da documenti PDF (layout geometrico e OCR) e su motori di quadratura contabile (verifiche V01-V12).
Nonostante la massima diligenza e le verifiche del curatore editoriale:
• Possono verificarsi imprecisioni materiali, refusi di lettura ottica, errori di classificazione contabile, discrepanze tra bozze di preventivo/consuntivo e versioni definitivamente emendate in sede consiliare, o disallineamenti temporali negli aggiornamenti;
• OFCL, i promotori, gli sviluppatori e i contributori non rilasciano alcuna garanzia esplicita o implicita circa l'esattezza, la completezza, l'aggiornamento o l'idoneità a scopi specifici dei dati esposti;
• Si esclude espressamente qualsiasi responsabilità diretta o indiretta per eventuali danni patrimoniali, perdite economiche, vertenze legali o decisioni amministrative, d'investimento o di voto intraprese facendo affidamento sui dati o sulle analisi presenti sul sito;
• I contenuti di OFCL non costituiscono in alcuna misura consulenza contabile, finanziaria, fiscale o giuridica.`,
  },
  {
    id: "diritto-autore-lda",
    title: "5. Diritto d'Autore e Licenza Open Data (Art. 5 LDA)",
    content: `Ai sensi dell'art. 5 cpv. 1 lett. a e c della Legge federale sul diritto d'autore e sui diritti di protezione affini (LDA, RS 231.1), le leggi, i regolamenti, le decisioni, i messaggi municipali, i preventivi e i consuntivi emanati da autorità pubbliche comunali o cantonali sono atti ufficiali esclusi dalla protezione del diritto d'autore.
I dataset strutturati, le tabelle rielaborate e i metadati generati da OFCL sono messi a disposizione della collettività con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0), in conformità agli standard nazionali svizzeri Opendata.swiss (O-By).
L'utente è libero di condividere e riutilizzare i dati con l'unico obbligo di citare la fonte: «Fonte: Osservatorio Finanze Comunali del Locarnese (OFCL) su dati ufficiali comunali e SEL».`,
  },
  {
    id: "stemmi-lpst",
    title: "6. Tutela dei Segni Pubblici e Divieto d'Uso di Stemmi (LPSt)",
    content: `Nel rigoroso rispetto della Legge federale sulla protezione degli stemmi della Svizzera e di altri segni pubblici (LPSt, RS 232.21), il presente portale non utilizza, né riproduce, gli stemmi araldici ufficiali della Confederazione Svizzera, della Repubblica e Cantone Ticino o dei singoli 19 Comuni del Locarnese.
Tale scelta previene qualsiasi possibile induzione in errore dell'utenza circa l'origine statale o ufficiale del portale. L'identificazione dei Comuni avviene esclusivamente mediante denominazione toponomastica ufficiale, codici UST e codici cromatici geometrici distintivi.`,
  },
  {
    id: "privacy-nlpd-lpdp",
    title: "7. Protezione dei Dati Personali (nLPD & LPDP)",
    content: `OFCL opera secondo il principio di Privacy by Design, in conformità alla Legge federale sulla protezione dei dati (nLPD, RS 235.1) e alla Legge cantonale sulla protezione dei dati personali (LPDP, RL 163.100).
La piattaforma tratta unicamente dati contabili e aggregati di finanza pubblica.
Gli atti comunali contenenti dati personali o dati degni di particolare protezione (ad esempio domande di concessione dell'attinenza comunale/naturalizzazioni, espropriazioni nominative di fondi privati, vertenze legali con nominativi di cittadini, condoni o aiuti sociali nominativi) sono preventivamente esclusi dalla pipeline di acquisizione e non vengono indicizzati né memorizzati.`,
  },
  {
    id: "trasparenza-lit",
    title: "8. Principio di Trasparenza e Accesso agli Atti (LIT)",
    content: `L'osservazione e l'analisi dei conti pubblici poggiano sui principi sanciti dalla Legge sull'informazione e sulla trasparenza dello Stato del 15 marzo 1995 (LIT, RL 162.100), che riconosce a ogni persona il diritto di consultare i documenti ufficiali senza dover dimostrare un interesse giuridico particolare, a tutela della partecipazione democratica e del controllo civico sull'operato della pubblica amministrazione.`,
  },
  {
    id: "rettifica-rapida",
    title: "9. Procedura di Segnalazione, Rettifica e Sospensione Cautelare (24h)",
    content: `Al fine di garantire la massima correttezza del quadro informativo verso la cittadinanza e le autorità comunali, OFCL adotta una procedura rapida di rettifica («24h Notice & Correction»):
1. Chiunque (cittadino, consigliere comunale, municipale o funzionario di cancelleria/servizio finanze) riscontri una discrepanza numerica, un errore di lettura o un documento non conforme, può inviare una segnalazione motivata tramite il pulsante «Segnala un'imprecisione» (oppure scrivendo a ${LEGAL_CONFIG.correctionsEmail});
2. In presenza di una segnalazione motivata su una discrepanza rilevante, il curatore editoriale può sospendere cautelativamente la pubblicazione del record o del documento (stato UNPUBLISHED_UNDER_CHECK) entro 24 ore lavorative;
3. Qualsiasi correzione effettuata a posteriori viene registrata pubblicamente nel registro trasparente delle rettifiche (/changelog-dati).`,
  },
  {
    id: "foro-competente",
    title: "10. Diritto Applicabile e Foro Competente",
    content: `Qualsiasi rapporto, utilizzo o controversia inerente all'accesso o all'impiego dei contenuti del presente portale è regolato in via esclusiva dal diritto materiale svizzero e cantonale ticinese.
Per ogni eventuale controversia legale è competente in via esclusiva la Pretura del Distretto di Locarno e della Città (Locarno, Cantone Ticino).`,
  },
] as const;
