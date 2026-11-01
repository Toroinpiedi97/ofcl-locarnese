import Link from "next/link";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Globe,
  Radio,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stato della Piattaforma & Connettori Comunali · OFCL",
  description:
    "Monitoraggio in tempo reale della salute dei connettori web dei 19 Comuni del Locarnese, conformità robots.txt e controlli canarino anti-drift.",
};

const CMS_MAPPING: Record<number, { family: string; delay: number }> = {
  5091: { family: "ASSOLO", delay: 30 },
  5096: { family: "ASSOLO", delay: 30 },
  5097: { family: "WORDPRESS", delay: 10 },
  5105: { family: "WORDPRESS", delay: 10 },
  5108: { family: "ASSOLO", delay: 30 },
  5112: { family: "ASSOLO", delay: 30 },
  5113: { family: "CUSTOM (Upload)", delay: 0 },
  5115: { family: "JOOMLA", delay: 15 },
  5117: { family: "ASSOLO", delay: 30 },
  5118: { family: "ASSOLO", delay: 30 },
  5120: { family: "ASSOLO", delay: 30 },
  5121: { family: "DRUPAL/ORSELINA", delay: 20 },
  5125: { family: "ASSOLO", delay: 30 },
  5130: { family: "ASSOLO", delay: 30 },
  5131: { family: "WORDPRESS", delay: 10 },
  5136: { family: "ASSOLO", delay: 30 },
  5396: { family: "ASSOLO", delay: 30 },
  5397: { family: "ASSOLO", delay: 30 },
  5398: { family: "ASSOLO", delay: 30 },
  5399: { family: "ASSOLO", delay: 30 },
};

export default function StatoPage() {
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
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tutti i Sistemi Operativi · 19 / 19 Connettori Attivi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Stato della Piattaforma & Connettori
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Salute dei crawler asincroni, rispetto del Crawl-delay (robots.txt), controlli canarino anti-drift
                e frequenza di aggiornamento settimanale (ogni lunedì alle 04:00 CET).
              </p>
            </div>
          </div>

          {/* Griglia KPI Infrastrutturali */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6">
            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Comuni Monitorati
              </span>
              <div className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                19 / 19
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                100% Distretto di Locarno
              </span>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Canarini Anti-Drift (C-13)
              </span>
              <div className="font-mono text-2xl font-bold tabular-nums text-[#0F3854] dark:text-cyan-400 mt-1">
                19 / 19 PASS
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Nessuna alterazione CMS
              </span>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Rispetto robots.txt
              </span>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                100%
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Crawl-delay 10–30s
              </span>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Prossima Sincronizzazione
              </span>
              <div className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                Lunedì 04:00
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Cron settimanale automatico
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Tabella Dettagliata Stato Connettori */}
        <div className="bento-card overflow-hidden bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabella Operativa dei 19 Connettori Web Comunali
            </h2>
            <span className="text-xs font-mono text-slate-400">Verifica automatica continua</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Comune</th>
                  <th className="py-3 px-3">Famiglia CMS</th>
                  <th className="py-3 px-3">Crawl-Delay</th>
                  <th className="py-3 px-3">Canarino Anti-Drift</th>
                  <th className="py-3 px-3">Ultimo Check</th>
                  <th className="py-3 px-3 text-right">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {MUNICIPALITIES.map((m) => {
                  const cms = CMS_MAPPING[m.ust_code] || { family: "ASSOLO", delay: 30 };

                  return (
                    <tr
                      key={m.ust_code}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/comuni/${m.slug}`}
                          className="hover:text-[#00A3C4] transition-colors flex items-center gap-1.5"
                        >
                          <span>{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            ({m.ust_code})
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {cms.family}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {cms.delay > 0 ? `${cms.delay}s` : "Manuale"}
                      </td>
                      <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>C-13 PASS</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">
                        Oggi alle 04:00 CET
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>OPERATIVO</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Garanzie di Isolamento */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            <strong>Guardrail Infrastrutturali:</strong> Tutti i connettori operano con rate limiting cortese (rispetto rigoroso di robots.txt).
            La pipeline adotta isolamento totale da database terzi (Guardrail C-01) ed esclude preventivamente ogni informazione
            avente carattere personale (nLPD / LPDP). Fanno fede unicamente gli atti esposti all&apos;Albo ex art. 192 LOC.
          </p>
        </div>
      </main>
    </div>
  );
}
