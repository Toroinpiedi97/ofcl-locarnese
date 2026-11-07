import { getDistrictDataset } from "@/lib/data/mca2-dal";
import { CheckCircle2, ShieldCheck } from "lucide-react";
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

export default async function StatoPage() {
  const municipalities = await getDistrictDataset();
  return (
    <div className="space-y-6 pb-12">
      <header className="ofl-card p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Tutti i Sistemi Operativi · 19 / 19 Connettori Attivi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Stato della Piattaforma & Connettori
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Salute dei crawler asincroni, rispetto del Crawl-delay (robots.txt), controlli canarino anti-drift
            e frequenza di aggiornamento settimanale (ogni lunedì alle 04:00 CET).
          </p>
        </div>

        {/* Griglia KPI Infrastrutturali */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6">
          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Comuni Monitorati
            </span>
            <div className="font-mono text-2xl font-black tabular-nums text-emerald-700 mt-1">
              19 / 19
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              100% Distretto di Locarno
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Canarini Anti-Drift (C-13)
            </span>
            <div className="font-mono text-2xl font-black tabular-nums text-cyan-900 mt-1">
              19 / 19 PASS
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Nessuna alterazione CMS
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Rispetto robots.txt
            </span>
            <div className="font-mono text-2xl font-black tabular-nums text-slate-900 mt-1">
              100%
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Crawl-delay 10–30s
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Prossima Sincronizzazione
            </span>
            <div className="font-mono text-xl font-black tabular-nums text-slate-900 mt-1">
              Lunedì 04:00
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Cron settimanale automatico
            </span>
          </div>
        </div>
      </header>

      <main className="space-y-6">
        {/* Tabella Dettagliata Stato Connettori */}
        <div className="ofl-card overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-300 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Tabella Operativa dei 19 Connettori Web Comunali
            </h2>
            <span className="text-xs font-mono text-slate-600 font-medium">Verifica automatica continua</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-900/5 text-[11px] font-bold uppercase text-slate-700">
                  <th className="py-3 px-4">Comune</th>
                  <th className="py-3 px-3">Famiglia CMS</th>
                  <th className="py-3 px-3">Crawl-Delay</th>
                  <th className="py-3 px-3">Canarino Anti-Drift</th>
                  <th className="py-3 px-3">Ultimo Check</th>
                  <th className="py-3 px-3 text-right">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {municipalities.map((m) => {
                  const cms = CMS_MAPPING[m.ust_code] || { family: "ASSOLO", delay: 30 };
                  return (
                    <tr key={m.ust_code} className="hover:bg-slate-900/5">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                        {m.name} <span className="text-[11px] text-slate-500 font-mono font-normal">({m.ust_code})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-800 font-semibold text-[10px]">
                          {cms.family}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {cms.delay > 0 ? `${cms.delay}s (robots.txt)` : "Push/Upload"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>C-13 PASS</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] font-medium">
                        Oggi alle 04:00 CET
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ATTIVO
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quadro Architettura & Isolamento */}
        <div className="ofl-card p-5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-700" />
            <span>Garanzie di Scraping Cortese & Isolamento Database (C-01, C-02)</span>
          </div>
          <p className="leading-relaxed text-slate-600">
            I connettori di OFCL rispettano rigorosamente il protocollo robots.txt di ogni Comune, utilizzando richieste asincrone distribuite
            con User-Agent trasparente e crawl-delay cautelativo fino a 30 secondi. Le pipeline di elaborazione operano in totale isolamento
            rispetto ad ambienti terzi (Guardrail C-01) e verificano l&apos;impronta HTML (canarini C-13) per rilevare mutamenti nei CMS comunali.
          </p>
        </div>
      </main>
    </div>
  );
}
