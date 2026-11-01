import { MUNICIPALITIES } from "@/data/municipalities";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";
import {
  Building2,
  Users,
  Percent,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  // Calcolo delle Grandi Cifre Distrettuali di Sintesi
  const totalPop = MUNICIPALITIES.reduce((acc, m) => acc + m.population, 0);
  const avgMultiplier = (
    MUNICIPALITIES.reduce((acc, m) => acc + m.tax_multiplier_pf, 0) / MUNICIPALITIES.length
  ).toFixed(1);
  const totalInvestments = (
    MUNICIPALITIES.reduce((acc, m) => acc + m.summary_30s.investimenti_netti_chf, 0) / 1_000_000
  ).toFixed(1);
  const overrunsCount = MUNICIPALITIES.reduce(
    (acc, m) => acc + (m.summary_30s.active_overruns_count ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Hero Section Distrettuale ad Alta Densità */}
      <section className="bg-gradient-to-b from-[#0F3854]/10 via-transparent to-transparent pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F3854]/10 dark:bg-cyan-950/40 border border-[#0F3854]/20 dark:border-cyan-500/30 text-[#0F3854] dark:text-cyan-300 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Trasparenza Civica MCA2 · Cantone Ticino</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Osservatorio Finanze Comunali del Locarnese
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Consultazione pubblica dei bilanci Preventivi e Consuntivi armonizzati (MCA2),
                controllo crediti d&apos;opera (art. 15 LOC) e 8 indicatori SEL per i 19 Comuni del Distretto.
              </p>
            </div>

            {/* Link Rapidi Istituzionali */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/confronta"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 shadow-xs transition-colors"
              >
                <span>Confronta Comuni</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/open-data"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Open Data (Frictionless)</span>
              </Link>
            </div>
          </div>

          {/* Griglia 4 Grandi Cifre Distrettuali */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6">
            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Building2 className="w-4 h-4 text-[#00A3C4]" />
                <span>Comuni Monitorati</span>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {MUNICIPALITIES.length} / 19
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                100% Distretto di Locarno
              </div>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Popolazione Residente</span>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {totalPop.toLocaleString("de-CH")}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Abitanti (STATPOP 2025/2026)
              </div>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Percent className="w-4 h-4 text-amber-500" />
                <span>Moltiplicatore Medio</span>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {avgMultiplier}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Range: 60% (Ronco) – 95%
              </div>
            </div>

            <div className="bento-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Coins className="w-4 h-4 text-[#0F3854] dark:text-cyan-400" />
                <span>Investimenti Netti</span>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                {totalInvestments} M
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                CHF consuntivati / anno
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenitore Principale con Doppia Pipeline Disaccoppiata (Desktop vs Mobile) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Pipeline Desktop: Layout Master-Detail a 2 colonne fisse */}
        <div className="hidden lg:block">
          <DashboardDesktop municipalities={MUNICIPALITIES} />
        </div>

        {/* Pipeline Mobile: Layout verticale fluido con Bottom Sheet touch */}
        <div className="block lg:hidden">
          <DashboardMobile municipalities={MUNICIPALITIES} />
        </div>
      </div>
    </main>
  );
}
