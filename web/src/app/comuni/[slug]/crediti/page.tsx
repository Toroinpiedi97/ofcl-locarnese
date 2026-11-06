import { notFound } from "next/navigation";
import Link from "next/link";
import { MUNICIPALITIES } from "@/data/municipalities";
import { INVESTMENT_CREDITS } from "@/data/credits";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
} from "lucide-react";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return MUNICIPALITIES.map((m) => ({
    slug: m.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const mun = MUNICIPALITIES.find((m) => m.slug === slug);
  if (!mun) return { title: "Comune non trovato · OFCL" };

  return {
    title: `Crediti d'Investimento (Art. 15 LOC) · ${mun.name} · OFCL`,
    description: `Stato delle opere pubbliche e controllo crediti d'investimento (Allegato f MCA2) per il Comune di ${mun.name}.`,
  };
}

export default async function MunicipalityCreditsPage({ params }: PageProps) {
  const { slug } = await params;
  const mun = MUNICIPALITIES.find((m) => m.slug === slug);

  if (!mun) {
    notFound();
  }

  const credits = INVESTMENT_CREDITS.filter((c) => c.municipality_slug === slug);
  const totalVoted = credits.reduce((acc, c) => acc + c.voted_credit_chf, 0);
  const overruns = credits.filter((c) => c.is_overrun);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Breadcrumb */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs">
          <nav className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={`/comuni/${mun.slug}`}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {mun.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Crediti d&apos;Investimento (Art. 15 LOC)
            </span>
          </nav>

          <Link
            href="/crediti"
            className="hover:text-slate-900 dark:hover:text-white text-slate-500 font-medium"
          >
            Tutti i Crediti del Distretto ↗
          </Link>
        </div>
      </div>

      <header className="bg-gradient-to-b from-[#0F3854]/10 via-transparent to-transparent pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#0F3854] text-white font-semibold">
                  UST {mun.ust_code}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Circolo di {mun.circle}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Opere & Crediti d&apos;Investimento · {mun.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Controllo dell&apos;Allegato f dei consuntivi armonizzati (MCA2) ex art. 22 RGFCC e art. 15 LOC.
              </p>
            </div>

            {/* KPI Rapidi Comune */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-right">
                <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                  Totale Crediti Votati
                </span>
                <div className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {totalVoted.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-normal">CHF</span>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-right">
                <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                  Sorpassi Attivi (S01)
                </span>
                <div
                  className={`font-mono text-xl font-bold tabular-nums ${
                    overruns.length > 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {overruns.length > 0 ? `${overruns.length} Rilevati` : "Nessuno (0)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {overruns.length > 0 && (
          <div className="rounded-xl p-4 bg-gradient-to-r from-red-950/40 to-amber-950/20 border border-red-500/40 text-slate-100 flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Attenzione: Sorpasso di Spesa Rilevato ex Art. 15 LOC
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Su almeno un credito d&apos;opera le uscite cumulate superano il credito votato dal Consiglio Comunale.
                La legge impone la presentazione di un messaggio municipale per credito suppletorio.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {credits.map((credit) => {
            const isOverrun = credit.is_overrun;
            const pct = credit.pct_used;

            let barColor = "bg-emerald-500";
            if (isOverrun) {
              barColor = "bg-red-600";
            } else if (pct >= 90) {
              barColor = "bg-amber-500";
            }

            return (
              <div
                key={credit.id}
                className={`bento-card p-5 bg-white/95 dark:bg-slate-900/90 border transition-all ${
                  isOverrun
                    ? "border-red-400/60 dark:border-red-900/80 shadow-xs"
                    : "border-slate-200/90 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        Conto {credit.account_code}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {credit.mm_reference}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {credit.description}
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400 block">
                        Credito Votato
                      </span>
                      <div className="font-mono text-base font-bold tabular-nums text-slate-800 dark:text-slate-200">
                        {credit.voted_credit_chf.toLocaleString("de-CH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        CHF
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400 block">
                        {isOverrun ? "Sorpasso (Residuo)" : "Credito Residuo"}
                      </span>
                      <div
                        className={`font-mono text-base font-bold tabular-nums ${
                          isOverrun ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {credit.residual_chf.toLocaleString("de-CH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        CHF
                      </div>
                    </div>

                    {isOverrun && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>S01 SORPASSO +{(pct - 100).toFixed(1)}%</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-600 dark:text-slate-400">
                      Speso a oggi:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {credit.spent_total_chf.toLocaleString("de-CH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        CHF
                      </strong>
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        isOverrun ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {pct.toFixed(1)}% del credito
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Allegato f · Pagina {credit.page_ref}</span>
                  </span>

                  <Link
                    href={`/segnala?ust=${credit.ust_code}&comune=${credit.municipality_slug}&metrica=${encodeURIComponent(
                      credit.description
                    )}`}
                    className="hover:text-slate-700 dark:hover:text-slate-200 underline decoration-dotted transition-colors"
                  >
                    Segnala una discrepanza su quest&apos;opera
                  </Link>
                </div>
              </div>
            );
          })}

          {credits.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nessun credito d&apos;opera estratto per {mun.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                I tabulati dell&apos;Allegato f saranno disponibili con la pubblicazione del prossimo consuntivo.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
