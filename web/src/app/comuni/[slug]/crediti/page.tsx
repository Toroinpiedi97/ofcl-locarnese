import { notFound } from "next/navigation";
import Link from "next/link";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  getMunicipalityProfile,
  getPublicCreditsDataset,
} from "@/lib/data/mca2-dal";
import { CreditProgressBarChart } from "@/components/charts";
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
  const mun = await getMunicipalityProfile(slug);
  if (!mun) return { title: "Comune non trovato · OFCL" };

  return {
    title: `Crediti d'Investimento (Art. 15 LOC) · ${mun.name} · OFCL`,
    description: `Stato delle opere pubbliche e controllo crediti d'investimento (Allegato f MCA2) per il Comune di ${mun.name}.`,
  };
}

export default async function MunicipalityCreditsPage({ params }: PageProps) {
  const { slug } = await params;
  const [mun, allCredits] = await Promise.all([
    getMunicipalityProfile(slug),
    getPublicCreditsDataset(),
  ]);

  if (!mun) {
    notFound();
  }

  const credits = allCredits.filter((c) => c.municipality_slug === slug);
  const totalVoted = credits.reduce((acc, c) => acc + c.voted_credit_chf, 0);
  const overruns = credits.filter((c) => c.is_overrun);

  return (
    <div className="p-4 sm:p-5 lg:p-7 space-y-6 pb-12 max-w-full overflow-x-hidden">
      {/* Breadcrumb */}
      <nav aria-label="Percorso crediti" className="flex items-center justify-between text-xs font-mono text-slate-700">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/"
            className="hover:text-slate-950 flex items-center gap-1 font-medium transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            href={`/comuni/${mun.slug}`}
            className="hover:text-slate-950 font-medium transition-colors"
          >
            {mun.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-950">
            Crediti d&apos;Investimento (Art. 15 LOC)
          </span>
        </div>

        <Link
          href="/crediti"
          className="hover:text-slate-950 text-slate-700 font-semibold"
        >
          Tutti i Crediti del Distretto ↗
        </Link>
      </nav>

      {/* Intestazione .ofl-card */}
      <header className="ofl-card rounded-2xl p-4 sm:p-6 overflow-hidden min-w-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#1e232b] text-white font-semibold">
                UST {mun.ust_code}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Circolo di {mun.circle}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Opere & Crediti d&apos;Investimento · {mun.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl">
              Controllo dell&apos;Allegato f dei consuntivi armonizzati (MCA2) ex art. 22 RGFCC e art. 15 LOC.
            </p>
          </div>

          {/* KPI Rapidi Comune */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-300 shadow-xs text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                Totale Crediti Votati
              </span>
              <div className="font-mono text-xl font-black tabular-nums text-slate-900">
                {totalVoted.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                <span className="text-xs font-normal">CHF</span>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-300 shadow-xs text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                Sorpassi Attivi (S01)
              </span>
              <div
                className={`font-mono text-xl font-black tabular-nums ${
                  overruns.length > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {overruns.length > 0 ? `${overruns.length} Rilevati` : "Nessuno (0)"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Sorpasso */}
      {overruns.length > 0 && (
        <div className="rounded-xl p-4 bg-red-100 border border-red-300 text-slate-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Attenzione: Sorpasso di Spesa Rilevato ex Art. 15 LOC
            </div>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              Su almeno un credito d&apos;opera le uscite cumulate superano il credito votato dal Consiglio Comunale.
              La legge impone la presentazione di un messaggio municipale per credito suppletorio.
            </p>
          </div>
        </div>
      )}

      {/* Grafico Nivo Avanzamento Opere del Comune */}
      {credits.length > 0 && (
        <section aria-labelledby="mun-credit-chart" className="ofl-card rounded-2xl p-4 sm:p-5 overflow-hidden min-w-0 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 id="mun-credit-chart" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Avanzamento Finanziario Opere · {mun.name}
            </h2>
            <span className="text-[10px] font-mono text-slate-600">Credito Votato vs Spesa Cumulata</span>
          </div>
          <CreditProgressBarChart credits={credits} height={180} />
        </section>
      )}

      {/* Lista Crediti */}
      <div className="space-y-4">
        {credits.map((credit) => {
          const isOverrun = credit.is_overrun;
          const pct = credit.pct_used;

          let barColor = "bg-emerald-600";
          if (isOverrun) {
            barColor = "bg-red-600";
          } else if (pct >= 90) {
            barColor = "bg-amber-600";
          }

          return (
            <div
              key={credit.id}
              className={`ofl-card rounded-2xl p-4 sm:p-5 border transition-all overflow-hidden min-w-0 ${
                isOverrun
                  ? "border-red-400 shadow-xs"
                  : "border-slate-300 shadow-2xs"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-900/10 text-slate-800 font-semibold">
                      Conto {credit.account_code}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {credit.mm_reference}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {credit.description}
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Credito Votato
                    </span>
                    <div className="font-mono text-base font-bold tabular-nums text-slate-900">
                      {credit.voted_credit_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      CHF
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {isOverrun ? "Sorpasso (Residuo)" : "Credito Residuo"}
                    </span>
                    <div
                      className={`font-mono text-base font-bold tabular-nums ${
                        isOverrun ? "text-red-700" : "text-emerald-700"
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>S01 SORPASSO +{(pct - 100).toFixed(1)}%</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-600">
                    Speso a oggi:{" "}
                    <strong className="text-slate-900 font-bold">
                      {credit.spent_total_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      CHF
                    </strong>
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isOverrun ? "text-red-700" : "text-slate-800"
                    }`}
                  >
                    {pct.toFixed(1)}% del credito
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-300 overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Allegato f · Pagina {credit.page_ref}</span>
                </span>

                <Link
                  href={`/segnala?ust=${credit.ust_code}&comune=${credit.municipality_slug}&metrica=${encodeURIComponent(
                    credit.description
                  )}`}
                  className="hover:text-slate-950 underline decoration-dotted transition-colors"
                >
                  Segnala una discrepanza su quest&apos;opera
                </Link>
              </div>
            </div>
          );
        })}

        {credits.length === 0 && (
          <div className="p-12 text-center ofl-card border-dashed">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900">
              Nessun credito d&apos;opera estratto per {mun.name}
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              I tabulati dell&apos;Allegato f saranno disponibili con la pubblicazione del prossimo consuntivo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
