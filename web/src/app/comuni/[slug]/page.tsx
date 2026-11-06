import { notFound } from "next/navigation";
import Link from "next/link";
import { MUNICIPALITIES } from "@/data/municipalities";
import { QuickCard30s } from "@/components/dashboard/QuickCard30s";
import { TaxImpactSimulator } from "@/components/dashboard/TaxImpactSimulator";
import { CivicDeepDiveBento } from "@/components/dashboard/CivicDeepDiveBento";
import { CreditAlertBanner } from "@/components/dashboard/CreditAlertBanner";
import { SelIndicatorsRadarChart } from "@/components/charts";
import {
  Building2,
  Users,
  Percent,
  Calendar,
  ChevronRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Share2,
  ExternalLink,
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
    title: `${mun.name} · Finanze Comunali MCA2 · OFCL`,
    description: `Bilanci MCA2, moltiplicatore fiscale ${mun.tax_multiplier_pf}%, 8 indicatori SEL e crediti d'opera per il Comune di ${mun.name} (UST ${mun.ust_code}).`,
  };
}

export default async function MunicipalityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const mun = MUNICIPALITIES.find((m) => m.slug === slug);

  if (!mun) {
    notFound();
  }

  const hasOverruns = (mun.summary_30s.active_overruns_count ?? 0) > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Breadcrumb */}
      <nav aria-label="Percorso di navigazione" className="flex items-center justify-between text-xs font-mono text-slate-700">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/"
            className="hover:text-slate-950 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard Distretto</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span>Comuni</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-950">
            {mun.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/10 text-slate-800 text-[11px] font-semibold">
            UST {mun.ust_code}
          </span>
        </div>
      </nav>

      {/* Intestazione Comune Istituzionale .ofl-card */}
      <header className="ofl-card p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#1e232b] text-white font-semibold">
                UST {mun.ust_code}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Circolo di {mun.circle}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-700">
                {mun.seat}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Comune di {mun.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl">
              Quadro armonizzato MCA2, serie storica 2022–2026, 8 indicatori SEL e simulatore d&apos;imposta per residenti e famiglie.
            </p>
          </div>

          {/* Indicatori Rapidi Header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-300 shadow-xs text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                Moltiplicatore PF 2026
              </span>
              <div className="font-mono text-2xl font-black tabular-nums text-[#0F3854]">
                {mun.tax_multiplier_pf}%
              </div>
              {mun.has_differentiated_pg && (
                <span className="text-[10px] font-mono text-amber-800 font-semibold block">
                  PG: {mun.tax_multiplier_pg}%
                </span>
              )}
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white/70 border border-slate-300 shadow-xs text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                Abitanti (STATPOP)
              </span>
              <div className="font-mono text-2xl font-black tabular-nums text-slate-900">
                {mun.population.toLocaleString("de-CH")}
              </div>
              <span className="text-[10px] text-slate-600 block">
                Residenza permanente
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner sorpasso crediti se attivo */}
      {hasOverruns && (
        <CreditAlertBanner
          municipalityName={mun.name}
          slug={mun.slug}
          hasOverruns={true}
          overrunCount={mun.summary_30s.active_overruns_count}
        />
      )}

      {/* Sezione 1: Regola dei 30 Secondi & Indicatori SEL */}
      <section aria-labelledby="section-30s" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="section-30s" className="text-base font-bold text-slate-900 tracking-tight">
            Sintesi Contabile MCA2 & 8 Indicatori Ufficiali SEL
          </h2>
          <span className="text-xs font-mono text-slate-600 font-medium">
            Rif: {mun.summary_30s.latest_mm_reference}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <QuickCard30s municipality={mun} year={2025} />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Radar 8 indicatori SEL */}
            <div className="ofl-card p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Radar 8 Indicatori SEL
                </h3>
                <span className="text-[10px] font-mono text-slate-600">Scala normalizzata</span>
              </div>
              <SelIndicatorsRadarChart primaryMun={mun} height={200} />
            </div>

            {/* Evoluzione moltiplicatore */}
            <div className="ofl-card p-4">
              <h3 className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">
                Evoluzione Moltiplicatore d&apos;Imposta
              </h3>
              <p className="text-[11px] text-slate-600 mb-3">
                Serie storica deliberata dal Consiglio Comunale (2022–2026).
              </p>

              <div className="space-y-1.5">
                {Object.entries(mun.multipliers_history)
                  .sort(([y1], [y2]) => Number(y2) - Number(y1))
                  .map(([year, val]) => (
                    <div
                      key={year}
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/5 text-xs font-mono"
                    >
                      <span className="font-semibold text-slate-800">
                        Anno {year}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#0F3854]">
                          PF: {val.pf}%
                        </span>
                        {mun.has_differentiated_pg && (
                          <span className="text-amber-800 font-semibold text-[11px]">
                            PG: {val.pg}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Evoluzione Demografica */}
            <div className="ofl-card p-4">
              <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                Evoluzione Demografica
              </h3>
              <div className="space-y-1 text-xs font-mono">
                {Object.entries(mun.population_history)
                  .sort(([y1], [y2]) => Number(y2) - Number(y1))
                  .map(([year, pop]) => (
                    <div
                      key={year}
                      className="flex items-center justify-between text-slate-700 py-1 border-b border-slate-200/60 last:border-0"
                    >
                      <span>STATPOP {year}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {pop.toLocaleString("de-CH")} ab.
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sezione 2: Simulatore d'Imposta Comunale (100% Client-Side) */}
      <section aria-labelledby="section-tax-simulator">
        <TaxImpactSimulator municipality={mun} />
      </section>

      {/* Sezione 3: Vivere nel Comune (I 5 Quadranti Bento A-E) */}
      <section aria-labelledby="section-civic-deepdive">
        <CivicDeepDiveBento municipality={mun} />
      </section>

      {/* Sezione 4: Trasparenza Atti Ufficiali & Riferimenti */}
      <section
        aria-labelledby="section-documents"
        className="ofl-card p-6"
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-[#0F3854]" />
          <h2 id="section-documents" className="text-base font-bold text-slate-900">
            Atti Ufficiali & Trasparenza Legale (Art. 192 LOC)
          </h2>
        </div>
        <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
          I dati sopra esposti sono estratti deterministicamente dai fascicoli ufficiali dei Preventivi e Consuntivi
          approvati dal Consiglio Comunale. Fanno fede unicamente gli atti esposti all&apos;Albo Comunale (art. 192 LOC).
        </p>

        <div className="mt-4 p-4 rounded-xl bg-slate-900/5 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-semibold text-slate-900">
              Ultimo Atto Riconciliato: {mun.summary_30s.latest_mm_reference}
            </div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Archiviato con hash SHA-256 in conformità alle regole nLPD / privacy.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/segnala?comune=${mun.slug}&ust=${mun.ust_code}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Segnala Discrepanza</span>
            </Link>
            <Link
              href="/confronta"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors"
            >
              <span>Confronta {mun.name}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
