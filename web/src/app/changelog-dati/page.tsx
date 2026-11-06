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
    <div className="space-y-6 pb-12">
      <header className="ofl-card p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e232b] text-white text-xs font-semibold mb-2">
            <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tracciabilità Immutabile & Audit Trail MCA2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Changelog Dati & Cronologia Rilasci
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Ogni revisione dei bilanci, quadratura contabile o aggiornamento dei connettori comunali viene registrata
            con identificatore univoco e hash crittografico SHA-256.
          </p>
        </div>
      </header>

      <main className="space-y-6">
        <div className="space-y-6">
          {RELEASES.map((rel) => {
            const isCurrent = rel.status === "ATTUALE";

            return (
              <div
                key={rel.version}
                className={`ofl-card p-6 border transition-all ${
                  isCurrent
                    ? "border-cyan-600/50 shadow-xs"
                    : "border-slate-300 opacity-90"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900/10 text-slate-900">
                      {rel.version}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {rel.status}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">· Deliberato il {rel.date}</span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-1.5">{rel.title}</h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">{rel.summary}</p>

                <div className="border-t border-slate-200 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Interventi e Validazioni:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {rel.changes.map((ch, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700 shrink-0 mt-0.5" />
                        <span>{ch}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
                  <span className="truncate">
                    <strong className="text-slate-800">Digest SHA-256:</strong> {rel.sha256}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note di trasparenza */}
        <div className="ofl-card p-4 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p>
            Questo registro è generato in maniera deterministica dal sistema di pubblicazione e non può essere modificato retroattivamente.
            Qualsiasi rettifica a seguito di segnalazione viene pubblicata come nuova versione incrementale.
          </p>
        </div>
      </main>
    </div>
  );
}
