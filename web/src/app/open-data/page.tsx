import Link from "next/link";
import type { Metadata } from "next";
import {
  Download,
  FileSpreadsheet,
  Database,
  ExternalLink,
  ShieldCheck,
  Code2,
  BookOpen,
  TableProperties,
  Sparkles,
} from "lucide-react";
import { CodeSnippetTabs } from "./CodeSnippetTabs";

export const metadata: Metadata = {
  title: "Open Data & API Civica MCA2 · OFCL",
  description:
    "Dataset aperti e documentati sui bilanci, indicatori SEL e tariffe dei 19 Comuni del Locarnese in formato Frictionless Data, CSV, Excel-CH, Parquet e REST API v1.",
};

const DATASETS = [
  {
    id: "bilanci",
    title: "Bilanci Consuntivi & Preventivi MCA2",
    description:
      "Riassunto generale armonizzato: spese e ricavi di gestione corrente (Classi 3 e 4), autofinanziamento, investimenti netti (Classi 5 e 6) e risultato contabile al centesimo.",
    period: "2019 – 2026",
    entities: "19 Comuni del Locarnese",
    files: [
      { label: "CSV Standard (,)", href: "/data/opendata/bilanci_mca2.csv", format: "CSV", size: "2.3 KB" },
      { label: "CSV Excel-CH (; + BOM)", href: "/data/opendata/bilanci_mca2_excel_ch.csv", format: "CSV", size: "2.3 KB" },
      { label: "Apache Parquet", href: "/data/opendata/bilanci_mca2.parquet", format: "Parquet", size: "4.5 KB" },
    ],
  },
  {
    id: "indicatori",
    title: "8 Indicatori Ufficiali SEL",
    description:
      "Serie storica completa degli indicatori finanziari calcolati secondo le direttive della Sezione degli enti locali (art. 22 lett. o RGFCC) con fasce qualitative e quadrature contabili.",
    period: "2019 – 2026",
    entities: "19 Comuni del Locarnese",
    files: [
      { label: "CSV Standard (,)", href: "/data/opendata/indicatori_sel.csv", format: "CSV", size: "12.1 KB" },
      { label: "CSV Excel-CH (; + BOM)", href: "/data/opendata/indicatori_sel_excel_ch.csv", format: "CSV", size: "12.1 KB" },
      { label: "Apache Parquet", href: "/data/opendata/indicatori_sel.parquet", format: "Parquet", size: "3.3 KB" },
    ],
  },
  {
    id: "tariffe",
    title: "Tariffe Comunali e Sussidi Civici",
    description:
      "Tassa base rifiuti, sacco ufficiale 35L, imposta immobiliare, tassa cani, buoni nascita e agevolazioni per le famiglie (Quadranti civici A–E).",
    period: "Esercizio 2026",
    entities: "19 Comuni del Locarnese",
    files: [
      { label: "CSV Standard (,)", href: "/data/opendata/tariffe_sussidi_comunali.csv", format: "CSV", size: "1.9 KB" },
      { label: "CSV Excel-CH (; + BOM)", href: "/data/opendata/tariffe_sussidi_comunali_excel_ch.csv", format: "CSV", size: "1.9 KB" },
      { label: "Apache Parquet", href: "/data/opendata/tariffe_sussidi_comunali.parquet", format: "Parquet", size: "3.9 KB" },
    ],
  },
];

const DICTIONARY_FIELDS = [
  { field: "ust_code", type: "integer", desc: "Numero d'ordine ufficiale USTAT del Comune (es. 5113 per Locarno, 5115 per Losone)." },
  { field: "comune", type: "string", desc: "Denominazione ufficiale del Comune patriziale o territoriale." },
  { field: "anno", type: "integer", desc: "Anno contabile di riferimento (esercizio fiscale)." },
  { field: "tipo_atto", type: "string", desc: "Tipologia di bilancio contabile: CONSUNTIVO oppure PREVENTIVO." },
  { field: "moltiplicatore_pf", type: "decimal (%)", desc: "Moltiplicatore d'imposta comunale per le persone fisiche deliberato dal Consiglio Comunale." },
  { field: "moltiplicatore_pg", type: "decimal (%)", desc: "Moltiplicatore d'imposta per le persone giuridiche (eventualmente differenziato)." },
  { field: "spese_correnti_chf", type: "decimal (0.01 CHF)", desc: "Totale spese correnti di gestione (Conto Economico, Classi 30-39)." },
  { field: "ricavi_correnti_chf", type: "decimal (0.01 CHF)", desc: "Totale ricavi correnti di gestione (Conto Economico, Classi 40-49)." },
  { field: "risultato_ordinario_chf", type: "decimal (0.01 CHF)", desc: "Avanzo (+) o disavanzo (-) d'esercizio al netto dei prelievi/attribuzioni al capitale proprio." },
  { field: "autofinanziamento_chf", type: "decimal (0.01 CHF)", desc: "Risorse finanziarie generate dalla gestione corrente disponibili per investimenti (Cash Flow MCA2)." },
  { field: "investimenti_netti_chf", type: "decimal (0.01 CHF)", desc: "Spese per beni amministrativi dedotte le entrate per investimenti (Conto Investimenti, Classi 5-6)." },
  { field: "debito_netto_pc_chf", type: "decimal (CHF/ab)", desc: "Capitale di terzi dedotti i beni patrimoniali liquidabili, rapportato alla popolazione residente STATPOP." },
  { field: "conformita_sel", type: "string", desc: "Sintesi di conformità agli 8 parametri di solidità SEL (es. '8/8' o '6/8')." },
];

const API_ENDPOINTS = [
  { method: "GET", path: "/api/v1/comuni", desc: "Elenco 19 Comuni con moltiplicatori, popolazione e sintesi 30s." },
  { method: "GET", path: "/api/v1/riassunto", desc: "Subtotali CE, CI e BIL con parametri ?comune=... e ?anno=..." },
  { method: "GET", path: "/api/v1/indicatori", desc: "Valori degli 8 indicatori SEL, soglie ufficiali e conformità." },
  { method: "GET", path: "/api/v1/crediti", desc: "Crediti d'opera votati dal CC, avanzamento spese e sorpassi ex art. 15 LOC." },
  { method: "GET", path: "/api/v1/documenti", desc: "Registro fascicoli ufficiali indicizzati con hash SHA-256 e link PDF." },
  { method: "GET", path: "/api/v1/comuni/[slug]/servizi-tariffe", desc: "Dettaglio tariffe comunali, agevolazioni e sussidi per specifico comune." },
  { method: "GET", path: "/api/v1/openapi.json", desc: "Specifica formale machine-readable OpenAPI 3.1 della REST API." },
];

export default function OpenDataPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <header className="ofl-card p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#1e232b] px-3 py-1 text-xs font-semibold text-white mb-3">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          Standard Frictionless Data · CC-BY-4.0
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
          Open Data & API Civica del Locarnese
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 max-w-3xl leading-relaxed mb-6">
          Accesso aperto, universale e chirurgico ai dati contabili pubblici di tutti i 19 Comuni del Distretto.
          Formati verificati per ricercatori, giornalisti civici, sviluppatori e cittadini.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/data/opendata/ofcl-opendata-locarnese.zip"
            download
            className="ofl-btn-blue inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs"
          >
            <Download className="h-4 w-4" />
            Scarica Pacchetto Completo ZIP (12 KB)
          </a>
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="ofl-btn-frost inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800"
          >
            <Code2 className="h-4 w-4 text-cyan-700" />
            Specifica OpenAPI 3.1
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </a>
          <a
            href="/data/opendata/datapackage.json"
            target="_blank"
            rel="noopener noreferrer"
            className="ofl-btn-frost inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800"
          >
            <Database className="h-4 w-4 text-cyan-700" />
            datapackage.json
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="space-y-6">
        {/* 1. Catalogo Dataset */}
        <section aria-labelledby="datasets-catalog">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="h-5 w-5 text-cyan-700" />
            <h2 id="datasets-catalog" className="text-base font-bold text-slate-900 tracking-tight">Dataset Certificati</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DATASETS.map((ds) => (
              <div
                key={ds.id}
                className="ofl-card p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                    <span className="font-mono text-cyan-800 font-bold">{ds.period}</span>
                    <span className="font-medium">{ds.entities}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{ds.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{ds.description}</p>
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Formati disponibili:
                  </span>
                  {ds.files.map((f) => (
                    <a
                      key={f.href}
                      href={f.href}
                      download
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-slate-900/5 font-medium transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5 text-slate-500" />
                        {f.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{f.size}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Integrazione API REST & Esempi di Codice */}
        <section aria-labelledby="rest-api-section" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-cyan-700" />
              <h2 id="rest-api-section" className="text-base font-bold text-slate-900 tracking-tight">Accesso via REST API v1</h2>
            </div>
            <span className="text-xs text-slate-600 font-mono font-medium">CORS: * · Edge Cache: 3600s</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Code Snippets Tabs */}
            <div className="lg:col-span-7">
              <CodeSnippetTabs />
            </div>

            {/* Endpoints List */}
            <div className="lg:col-span-5 ofl-card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-cyan-700" />
                Endpoint Principali
              </h3>
              <div className="space-y-2.5">
                {API_ENDPOINTS.map((ep) => (
                  <div key={ep.path} className="border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                        {ep.method}
                      </span>
                      <Link href={ep.path} target="_blank" className="text-slate-900 font-bold hover:text-cyan-700 transition-colors">
                        {ep.path}
                      </Link>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Dizionario Campi MCA2 */}
        <section aria-labelledby="data-dictionary" className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-700" />
            <h2 id="data-dictionary" className="text-base font-bold text-slate-900 tracking-tight">Dizionario Dati MCA2</h2>
          </div>
          <div className="overflow-x-auto ofl-card p-0">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-300 bg-slate-900/5 text-slate-700 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Campo</th>
                  <th className="py-3 px-4 font-bold">Tipo Dato</th>
                  <th className="py-3 px-4 font-bold">Descrizione & Normativa LOC/RGFCC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {DICTIONARY_FIELDS.map((df) => (
                  <tr key={df.field} className="hover:bg-slate-900/5">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{df.field}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px] font-medium">{df.type}</td>
                    <td className="py-2.5 px-4 text-slate-700 leading-relaxed">{df.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Quadro Giuridico e Privacy */}
        <section className="ofl-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            Clausole Giuridiche, Licenza e Isolamento dei Dati
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700 leading-relaxed">
            <div className="border-l-2 border-slate-400 pl-3">
              <span className="font-bold text-slate-900 block mb-1">Licenza Libera CC-BY-4.0</span>
              I dati possono essere liberamente consultati, riutilizzati e ridistribuiti citando la fonte:
              <strong className="text-slate-900"> OFCL - Osservatorio Finanze Comunali del Locarnese</strong>.
            </div>
            <div className="border-l-2 border-slate-400 pl-3">
              <span className="font-bold text-slate-900 block mb-1">Rispetto Privacy (LPDP/nLPD)</span>
              Tutti i documenti e le tabelle sono depurati preventivamente da qualsiasi dato personale degno di particolare
              protezione (PII). Vengono pubblicati solo dati contabili istituzionali.
            </div>
            <div className="border-l-2 border-slate-400 pl-3">
              <span className="font-bold text-slate-900 block mb-1">Disclaimer Art. 192 LOC</span>
              I dataset sono elaborati a scopo informativo e di trasparenza civica. Fanno stato unicamente gli atti
              ufficiali esposti o pubblicati nei rispettivi albi comunali.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
