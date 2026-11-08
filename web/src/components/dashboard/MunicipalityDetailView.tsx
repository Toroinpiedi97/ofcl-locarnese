"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MunicipalityData } from "@/data/municipalities";
import {
  MUNICIPALITIES,
  getMunicipalityYearData,
} from "@/data/municipalities";
import { QuickCard30s } from "./QuickCard30s";
import { CreditAlertBanner } from "./CreditAlertBanner";
import { TaxImpactSimulator } from "./TaxImpactSimulator";
import { CivicDeepDiveBento } from "./CivicDeepDiveBento";
import {
  SelIndicatorsRadarChart,
  DistrictTrendLineChart,
  SectorPerCapitaBarChart,
} from "@/components/charts";
import {
  ChevronRight,
  ArrowLeft,
  Download,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Building2,
  Wallet,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatChfCompact, formatChfExact, cn } from "@/lib/utils";

export interface MunicipalityDetailViewProps {
  municipality: MunicipalityData;
}

export function MunicipalityDetailView({
  municipality,
}: MunicipalityDetailViewProps) {
  const router = useRouter();
  // Anno fiscale predefinito: "2025" (in linea con consuntivi completi e sorpassi storici)
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [exactKpi, setExactKpi] = useState<boolean>(false);

  const yearData = getMunicipalityYearData(municipality, selectedYear);
  const isAvanzo = yearData.risultato_ordinario_chf >= 0;
  const hasOverruns = (yearData.active_overruns_count ?? 0) > 0;

  const yearsList = [
    { id: "2024", label: "2024", type: "Consuntivo" },
    { id: "2025", label: "2025", type: "Consuntivo" },
    { id: "01.2026 Prev.", label: "01.2026 Prev.", type: "Preventivo" },
  ];

  function handleMunicipalityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    if (slug) {
      router.push(`/comuni/${slug}`);
    }
  }

  function handleDownloadCsv() {
    const csvContent =
      "\uFEFF" +
      [
        "Codice_UST;Comune;Circolo;Sede;Anno_Fiscale;Tipo_Atto;Abitanti;Moltiplicatore_PF;Moltiplicatore_PG;Risultato_Ordinario_CHF;Autofinanziamento_CHF;Investimenti_Netti_CHF;Debito_Netto_PC_CHF;Debito_Totale_CHF;Conformita_SEL;Atto_Riferimento",
        `${municipality.ust_code};"${municipality.name}";"${municipality.circle}";"${municipality.seat}";"${selectedYear}";"${yearData.isPreventivo ? "PREVENTIVO" : "CONSUNTIVO"}";${yearData.population};${yearData.tax_multiplier_pf};${yearData.tax_multiplier_pg};${yearData.risultato_ordinario_chf};${yearData.autofinanziamento_chf};${yearData.investimenti_netti_chf};${yearData.debito_netto_pc_chf};${yearData.debito_totale};"${yearData.sel_conformity}";"${yearData.latest_mm_reference}"`,
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ofcl-comune-${municipality.slug}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Mini sparklines vettoriali per le 4 metriche contabili
  const sparklineData = [
    { key: "risultato", points: "0,14 15,10 30,12 45,6 60,4" },
    { key: "autofin", points: "0,16 15,14 30,8 45,10 60,2" },
    { key: "investimenti", points: "0,12 15,14 30,10 45,8 60,6" },
    { key: "debito", points: "0,4 15,6 30,8 45,12 60,10" },
  ];

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* 1. Barra Navigazione, Selettore Rapido 19 Comuni & Azioni */}
      <nav
        aria-label="Percorso di navigazione e cambio comune"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-700"
      >
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Link
            href="/"
            className="hover:text-slate-950 flex items-center gap-1 font-semibold transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 shrink-0">Comuni</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-bold text-slate-900 truncate">
            {municipality.name}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Selettore rapido 19 comuni */}
          <div className="relative">
            <label htmlFor="municipality-quick-switcher" className="sr-only">
              Passa a un altro comune
            </label>
            <select
              id="municipality-quick-switcher"
              value={municipality.slug}
              onChange={handleMunicipalityChange}
              className="py-1 px-2.5 pr-7 rounded-lg text-xs font-sans font-semibold bg-white/80 border border-slate-300 text-slate-800 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00A3C4] cursor-pointer"
            >
              {MUNICIPALITIES.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="ofl-btn-frost py-1 px-2.5 rounded-lg text-xs font-sans font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Scarica dati contabili MCA2 di questo comune in CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </nav>

      {/* 2. Intestazione Istituzionale Comune */}
      <header className="ofl-card rounded-2xl p-4 sm:p-6 overflow-hidden min-w-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-[#1e232b] text-white font-bold tracking-wider">
                UST {municipality.ust_code}
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Circolo di {municipality.circle}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-700">
                Sede Municipale: {municipality.seat}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 min-w-0 wrap-anywhere">
              Comune di {municipality.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Quadro armonizzato MCA2, serie storica 2022–2026, 8 indicatori SEL e simulatore d&apos;imposta per residenti e famiglie.
            </p>

            {/* Toggle Anno Fiscale Rapido */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Esercizio:
              </span>
              <div
                role="group"
                aria-label="Selezione anno contabile MCA2"
                className="inline-flex rounded-xl bg-slate-200/70 p-1 gap-1"
              >
                {yearsList.map((y) => {
                  const isActive = selectedYear === y.id;
                  return (
                    <button
                      key={y.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelectedYear(y.id)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer",
                        isActive
                          ? "bg-[#0F3854] text-white shadow-xs"
                          : "text-slate-700 hover:text-slate-950 hover:bg-white/60"
                      )}
                    >
                      {y.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-mono text-slate-500 ml-1">
                ({yearData.isPreventivo ? "Preventivo approvato" : "Consuntivo approvato"})
              </span>
            </div>
          </div>

          {/* Indicatori Rapidi Header */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="px-4 py-2.5 rounded-xl bg-white/75 border border-slate-200/80 shadow-2xs text-right min-w-0 sm:min-w-[120px] flex-1 sm:flex-initial">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Moltiplicatore {selectedYear}
              </span>
              <div className="font-mono text-2xl font-black tabular-nums whitespace-nowrap text-[#0F3854]">
                {yearData.tax_multiplier_pf}%
              </div>
              {municipality.has_differentiated_pg && (
                <span className="text-[10px] font-mono text-amber-800 font-semibold block">
                  PG: {yearData.tax_multiplier_pg}%
                </span>
              )}
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-white/75 border border-slate-200/80 shadow-2xs text-right min-w-0 sm:min-w-[120px] flex-1 sm:flex-initial">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Abitanti (STATPOP)
              </span>
              <div className="font-mono text-2xl font-black tabular-nums whitespace-nowrap text-slate-900">
                {yearData.population.toLocaleString("de-CH")}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Residenza permanente
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Banner Sorpasso Crediti se attivo per l'anno selezionato */}
      {hasOverruns && (
        <CreditAlertBanner
          municipalityName={municipality.name}
          slug={municipality.slug}
          hasOverruns={true}
          overrunCount={yearData.active_overruns_count}
        />
      )}

      {/* 4. Quattro Grandi Grandezze Contabili con Toggle Cifre Esatte */}
      <section aria-label="Quattro grandezze contabili chiave MCA2" className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 px-1">
          <span className="font-bold text-slate-800 uppercase tracking-wider">
            Indicatori Contabili Fondamentali ({selectedYear})
          </span>
          <button
            type="button"
            onClick={() => setExactKpi(!exactKpi)}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/80 border border-slate-300 hover:border-slate-400 text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            {exactKpi ? "Cifre compatte" : "Cifre esatte (0.01 CHF)"}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Risultato Ordinario */}
          <div className="ofl-card rounded-xl p-3.5 flex flex-col justify-between overflow-hidden min-w-0 shadow-2xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1 font-semibold truncate">
                  {isAvanzo ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                  <span className="truncate">Risultato Ordinario</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">CE p.5</span>
              </div>
              <div
                className={cn(
                  "font-mono font-bold tabular-nums break-words leading-tight",
                  exactKpi ? "text-sm sm:text-base" : "text-lg sm:text-xl",
                  isAvanzo ? "text-emerald-700" : "text-red-700"
                )}
              >
                {isAvanzo ? "+" : ""}
                {exactKpi
                  ? formatChfExact(yearData.risultato_ordinario_chf)
                  : formatChfCompact(yearData.risultato_ordinario_chf)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {isAvanzo ? "Avanzo d'esercizio" : "Disavanzo"}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 uppercase font-mono">Trend 2022-26</span>
              <svg className="w-14 h-4 text-emerald-500 overflow-visible" viewBox="0 0 60 16">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineData[0].points}
                />
              </svg>
            </div>
          </div>

          {/* 2. Autofinanziamento */}
          <div className="ofl-card rounded-xl p-3.5 flex flex-col justify-between overflow-hidden min-w-0 shadow-2xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1 font-semibold truncate">
                  <PiggyBank className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span className="truncate">Autofinanziamento</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">CF p.5</span>
              </div>
              <div
                className={cn(
                  "font-mono font-bold tabular-nums text-slate-900 break-words leading-tight",
                  exactKpi ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                )}
              >
                {exactKpi
                  ? formatChfExact(yearData.autofinanziamento_chf)
                  : formatChfCompact(yearData.autofinanziamento_chf)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                Risorse proprie generate
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 uppercase font-mono">Trend 2022-26</span>
              <svg className="w-14 h-4 text-cyan-600 overflow-visible" viewBox="0 0 60 16">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineData[1].points}
                />
              </svg>
            </div>
          </div>

          {/* 3. Investimenti Netti BA */}
          <div className="ofl-card rounded-xl p-3.5 flex flex-col justify-between overflow-hidden min-w-0 shadow-2xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1 font-semibold truncate">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Investimenti Netti</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">CI p.5</span>
              </div>
              <div
                className={cn(
                  "font-mono font-bold tabular-nums text-slate-900 break-words leading-tight",
                  exactKpi ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                )}
              >
                {exactKpi
                  ? formatChfExact(yearData.investimenti_netti_chf)
                  : formatChfCompact(yearData.investimenti_netti_chf)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                Beni amministrativi
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 uppercase font-mono">Trend 2022-26</span>
              <svg className="w-14 h-4 text-indigo-600 overflow-visible" viewBox="0 0 60 16">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineData[2].points}
                />
              </svg>
            </div>
          </div>

          {/* 4. Debito Pubblico Netto pro Capite */}
          <div className="ofl-card rounded-xl p-3.5 flex flex-col justify-between overflow-hidden min-w-0 shadow-2xs">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="flex items-center gap-1 font-semibold truncate">
                  <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Debito Netto p.c.</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">BIL/ab</span>
              </div>
              <div
                className={cn(
                  "font-mono font-bold tabular-nums text-slate-900 break-words leading-tight",
                  exactKpi ? "text-sm sm:text-base" : "text-lg sm:text-xl"
                )}
              >
                {exactKpi
                  ? formatChfExact(yearData.debito_netto_pc_chf)
                  : `CHF ${Math.round(yearData.debito_netto_pc_chf).toLocaleString("de-CH")}`}
                <span className="text-xs font-normal"> /ab</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                Soglia SEL &lt; 5k CHF
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 uppercase font-mono">Trend 2022-26</span>
              <svg className="w-14 h-4 text-amber-600 overflow-visible" viewBox="0 0 60 16">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineData[3].points}
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Riga Grafici Analitici Nivo: Trend Storico + Spesa per Settore MCA2 */}
      <section aria-label="Grafici analitici del comune" className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Trend Line vs Media Distretto */}
        <div className="xl:col-span-7 ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-0 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Serie Storica Spesa Netta (2022–2026)
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Evoluzione Spesa Corrente · {municipality.name} vs Media Distretto
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">MCA2 CE</span>
          </div>

          <div className="h-[250px] w-full min-w-0 relative">
            <DistrictTrendLineChart
              municipalities={[municipality]}
              showDistrictAverage={true}
              selectedYear={selectedYear}
              height="100%"
            />
          </div>
        </div>

        {/* Drilldown Settoriale a 4 Livelli */}
        <div className="xl:col-span-5 ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-0 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Drilldown 4 Livelli MCA2
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Composizione Spesa Corrente per Settore
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{selectedYear}</span>
          </div>

          <div className="h-[250px] w-full min-w-0 relative">
            <SectorPerCapitaBarChart
              municipalities={[municipality]}
              selectedYear={selectedYear}
              height="100%"
            />
          </div>
        </div>
      </section>

      {/* 6. Sezione Regola dei 30 Secondi & Radar SEL con Serie Storica */}
      <section aria-labelledby="section-30s" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="section-30s" className="text-base font-bold text-slate-900 tracking-tight">
            Sintesi Contabile MCA2 & 8 Indicatori Ufficiali SEL
          </h2>
          <span className="text-xs font-mono text-slate-600 font-medium truncate ml-2">
            Rif: {yearData.latest_mm_reference}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <QuickCard30s
              municipality={municipality}
              selectedYear={selectedYear}
              isDetailPage={true}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Radar 8 indicatori SEL */}
            <div className="ofl-card rounded-2xl p-4 overflow-hidden min-w-0 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Radar 8 Indicatori SEL
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Scala normalizzata</span>
              </div>
              <SelIndicatorsRadarChart primaryMun={municipality} height={200} />
            </div>

            {/* Evoluzione moltiplicatore */}
            <div className="ofl-card rounded-2xl p-4 overflow-hidden min-w-0 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-1 uppercase tracking-wider">
                Evoluzione Moltiplicatore d&apos;Imposta
              </h3>
              <p className="text-[11px] text-slate-600 mb-3">
                Serie storica deliberata dal Consiglio Comunale (2022–2026).
              </p>

              <div className="space-y-1.5">
                {Object.entries(municipality.multipliers_history)
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
                        {municipality.has_differentiated_pg && (
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
            <div className="ofl-card rounded-2xl p-4 overflow-hidden min-w-0 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
                Evoluzione Demografica
              </h3>
              <div className="space-y-1 text-xs font-mono">
                {Object.entries(municipality.population_history)
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

      {/* 7. Simulatore d'Imposta Comunale */}
      <section aria-labelledby="section-tax-simulator">
        <TaxImpactSimulator
          municipality={municipality}
          selectedYear={selectedYear}
        />
      </section>

      {/* 8. Vivere nel Comune (I 5 Quadranti Bento con Pill Bar Mobile) */}
      <section aria-labelledby="section-civic-deepdive">
        <CivicDeepDiveBento municipality={municipality} />
      </section>

      {/* 9. Trasparenza Atti Ufficiali & Riferimenti (Art. 192 LOC) */}
      <section
        aria-labelledby="section-documents"
        className="ofl-card rounded-2xl p-5 sm:p-6 overflow-hidden min-w-0 shadow-xs"
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
              Ultimo Atto Riconciliato: {yearData.latest_mm_reference}
            </div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Archiviato con hash SHA-256 in conformità alle regole nLPD / privacy.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/comuni/${municipality.slug}/crediti`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <span>Crediti d&apos;Opera (Allegato f)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/segnala?comune=${municipality.slug}&ust=${municipality.ust_code}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Segnala Discrepanza</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
