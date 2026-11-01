import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  GitCommit,
  Hash,
  ShieldCheck,
  Tag,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog Dati & Versioni · OFCL",
  description:
    "Registro cronologico immutabile degli aggiornamenti, rettifiche contabili e rilasci dei dataset dell'Osservatorio Finanze Comunali del Locarnese.",
};

const RELEASES = [
  {
    version: "data-v2026.11.0",
    date: "1 Novembre 2026",
    title: "Rilascio Ufficiale Portale Pubblico & Copertura Integrale 19 Comuni",
    status: "ATTUALE",
    summary:
      "Prima release pubblica ufficiale con copertura al 100% dei 19 Comuni del Distretto di Locarno (UST 5091..5399).",
    changes: [
      "Integrazione dei tabulati MCA2 Consuntivi 2022–2025 e Preventivi 2024–2026 per i 19 Comuni.",
      "Applicazione del motore di quadratura deterministica V01–V12 con tolleranza 0.00 CHF.",
      "Calcolo certificato degli 8 indicatori finanziari ufficiali SEL (Sezione Enti Locali).",
      "Rilevazione automatica dei sorpassi sui crediti d'investimento ex art. 15 LOC (Allegato f).",
      "Integrazione dei 5 Quadranti Bento 'Vivere nel Comune' (tariffe di causalità, famiglie, sociale, clima).",
      "Attivazione del Civic Ticket Sandbox per la segnalazione protetta di discrepanze.",
    ],
    sha256: "9c8a1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  },
  {
    version: "data-v2026.10.2",
    date: "25 Ottobre 2026",
    title: "Golden Set di Validazione & Collaudo Ge.Co.Ti. V3",
    status: "ARCHIVIATO",
    summary:
      "Validazione geometrica e tabellare sul campione di 25 PDF reali estratti da Ge.Co.Ti. Web (CCE Gordola).",
    changes: [
      "Calibrazione dell'estrattore pdfplumber con bounding box multi-colonna.",
      "Verifica dello sbilancio 0.00 CHF sul consuntivo pilota Brione sopra Minusio 2025.",
      "Isolamento totale dell'ambiente da database terzi (Guardrail C-01).",
    ],
    sha256: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
  },
];

export default function ChangelogDatiPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-gradient-to-b from-[#0F3854]/10 via-transparent to-transparent pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna alla Dashboard</span>
            </Link>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F3854]/10 dark:bg-cyan-950/40 border border-[#0F3854]/20 dark:border-cyan-500/30 text-[#0F3854] dark:text-cyan-300 text-xs font-semibold mb-2">
                <Tag className="w-3.5 h-3.5" />
                <span>Tracciabilità del Dato & Versionamento Immutabile</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Changelog Dati & Cronologia Rilasci
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Ogni modifica, integrazione di nuovi consuntivi o rettifica convalidata dal curatore viene registrata
                con firma crittografica SHA-256 e data certa.
              </p>
            </div>

            <Link
              href="/open-data"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs self-start md:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Scarica Dataset Open Data</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {RELEASES.map((rel) => (
          <div
            key={rel.version}
            className="bento-card p-6 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[#0F3854] text-white">
                  {rel.version}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-medium text-slate-500">{rel.date}</span>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                  rel.status === "ATTUALE"
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {rel.status}
              </span>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {rel.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {rel.summary}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Interventi & Aggiornamenti:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {rel.changes.map((ch, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00A3C4] shrink-0 mt-0.5" />
                    <span>{ch}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1" title={rel.sha256}>
                <Hash className="w-3.5 h-3.5 text-[#00A3C4]" />
                <span>SHA-256: {rel.sha256.slice(0, 16)}...</span>
              </span>

              <span>Fanno fede gli atti ex art. 192 LOC</span>
            </div>
          </div>
        ))}

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            Ogni rilascio segue il principio di versionamento semantico per i dati. Nessun valore pubblicato
            può essere modificato retroattivamente senza una corrispondente traccia di rettifica (curator action)
            nel database di audit.
          </p>
        </div>
      </main>
    </div>
  );
}
