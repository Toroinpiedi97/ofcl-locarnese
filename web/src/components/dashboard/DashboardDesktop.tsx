"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MunicipalityData } from "@/data/municipalities";
import {
  parseFiscalYear,
  isPreventivoYear,
  getMunicipalityYearData,
} from "@/data/municipalities";
import { MunicipalitiesTable } from "./MunicipalitiesTable";
import { TerritorialMap } from "./TerritorialMap";
import { Mca2AnalyticCard } from "./Mca2AnalyticCard";
import { GlobalFilterBar } from "./GlobalFilterBar";
import { DistrictTrendLineChart, SectorPerCapitaBarChart } from "@/components/charts";
import { CultPopoverTicket } from "@/components/cult/CultPopoverTicket";
import { useCivicLang } from "@/lib/i18n-civic";
import { Download, Ticket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardDesktopProps {
  municipalities: MunicipalityData[];
  defaultUstCode?: number;
}

export function DashboardDesktop({
  municipalities,
  defaultUstCode = 5113, // Locarno predefinito
}: DashboardDesktopProps) {
  const router = useRouter();
  const { t } = useCivicLang();
  const [, startTransition] = useTransition();

  // Stato Filtro Globale Unico
  const [selectedUstCodes, setSelectedUstCodes] = useState<number[]>([defaultUstCode]);
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [exactKpi, setExactKpi] = useState(false);

  // Comune principale per la Scheda Analitica MCA2
  const [activeMuniCode, setActiveMuniCode] = useState<number>(defaultUstCode);

  // Lista di comuni selezionati per i grafici (max 4)
  const selectedMunicipalities = municipalities.filter((m) =>
    selectedUstCodes.includes(m.ust_code)
  );

  // Comune per la Scheda Analitica MCA2
  const activeMunicipality =
    municipalities.find((m) => m.ust_code === activeMuniCode) ??
    selectedMunicipalities[0] ??
    municipalities[0];

  function handleToggleUstCode(ustCode: number) {
    setSelectedUstCodes((prev) => {
      if (prev.includes(ustCode)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== ustCode);
      } else {
        if (prev.length >= 4) return prev;
        return [...prev, ustCode];
      }
    });
    setActiveMuniCode(ustCode);
  }

  function handleSelectMunicipalityFromTable(m: MunicipalityData) {
    startTransition(() => {
      setActiveMuniCode(m.ust_code);
      // Se non è già tra i comuni selezionati, aggiungilo se c'è spazio, altrimenti imposta come primario
      if (!selectedUstCodes.includes(m.ust_code)) {
        if (selectedUstCodes.length < 4) {
          setSelectedUstCodes((prev) => [...prev, m.ust_code]);
        } else {
          setSelectedUstCodes([m.ust_code]);
        }
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("comune", m.slug);
        window.history.replaceState({}, "", url.toString());
      } catch {
        // Ignora in ambienti SSR
      }
    });
  }

  function handleTriggerOpenData() {
    router.push("/open-data");
  }

  // Calcoli grandezze distrettuali sincronizzati dinamicamente con l'anno selezionato
  const numericYear = parseFiscalYear(selectedYear);
  const isPrev = isPreventivoYear(selectedYear);

  const yearMetricsList = municipalities.map((m) => getMunicipalityYearData(m, selectedYear));
  const totalPop = yearMetricsList.reduce((acc, ym) => acc + ym.population, 0);
  const avgMultiplier = (
    yearMetricsList.reduce((acc, ym) => acc + ym.tax_multiplier_pf, 0) / yearMetricsList.length
  ).toFixed(1);
  const totalSpesaDistretto = yearMetricsList.reduce(
    (acc, ym) => acc + ym.total_expenditure,
    0
  );
  const totalAutofin = yearMetricsList.reduce(
    (acc, ym) => acc + ym.autofinanziamento_chf,
    0
  );
  const avgAutofin = yearMetricsList.length > 0 ? totalAutofin / yearMetricsList.length : 0;
  const totalDebitoNetto = yearMetricsList.reduce(
    (acc, ym) => acc + ym.debito_totale,
    0
  );
  const avgDebitoPc = totalPop > 0 ? Math.round(totalDebitoNetto / totalPop) : 0;

  return (
    <div className="p-5 lg:p-7 space-y-5">
      {/* ===================================================================
           1. TOP BAR: Titolo Istituzionale + Azioni Primarie (Senza "Dettagli" né "2025 Consuntivo")
           =================================================================== */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[11px] font-bold font-mono border border-sky-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F3854]" />
              <span>19 / 19 Comuni</span>
            </span>
            <span className="font-mono text-xs text-slate-600 font-semibold">
              · {totalPop.toLocaleString("de-CH")} ab. (STATPOP {numericYear})
            </span>
            <span
              className={cn(
                "font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border",
                isPrev
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
              )}
            >
              {isPrev ? "Preventivo 01.2026" : `Consuntivo ${selectedYear}`}
            </span>
          </div>
          <h1 className="text-xl xl:text-2xl font-black tracking-tight text-slate-900 leading-tight">
            Osservatorio Finanze Comunali del Locarnese
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {t.portalSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Pulsante Scarica Open Data */}
          <button
            type="button"
            onClick={handleTriggerOpenData}
            className="ofl-btn-blue rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{t.downloadOpenData}</span>
          </button>

          {/* Pulsante Segnala / Apri Ticket */}
          <CultPopoverTicket
            initialUstCode={activeMuniCode}
            triggerButton={
              <button
                type="button"
                className="ofl-btn-amber rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
              >
                <Ticket className="w-3.5 h-3.5 shrink-0" />
                <span>{t.reportTicket}</span>
              </button>
            }
          />
        </div>
      </header>

      {/* ===================================================================
           2. CARD FILTRO GLOBALE UNICA (Anno + Selezione fino a 4 Comuni con "+")
           =================================================================== */}
      <GlobalFilterBar
        allMunicipalities={municipalities}
        selectedUstCodes={selectedUstCodes}
        onToggleUstCode={handleToggleUstCode}
        onSetSelectedUstCodes={setSelectedUstCodes}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {/* ===================================================================
           3. RIGA 4 KPI CARDS CON MINI-SPARKLINE SVG
           =================================================================== */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        aria-label="Indicatori chiave distrettuali"
      >
        {/* KPI 1: Moltiplicatore */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExactKpi((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExactKpi((prev) => !prev);
            }
          }}
          aria-pressed={exactKpi}
          className="ofl-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between min-w-0 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 gap-1 min-w-0">
            <span className="truncate">{t.kpiMultiplierAvg}</span>
            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0">
              {isPrev ? "01.2026" : selectedYear}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 min-w-0">
            <div className="tabular-mca2 text-2xl lg:text-3xl font-extrabold text-slate-950 tracking-tight font-mono truncate">
              {avgMultiplier}%
            </div>
            <svg aria-hidden="true" className="w-16 h-7 shrink-0" viewBox="0 0 80 32">
              <path
                className="sparkline-path"
                d="M 2 24 Q 20 28 40 18 T 78 6"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Media ponderata 19 Comuni ({selectedYear})
          </div>
        </div>

        {/* KPI 2: Totale Spese Correnti Distretto */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExactKpi((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExactKpi((prev) => !prev);
            }
          }}
          aria-pressed={exactKpi}
          className="ofl-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between min-w-0 focus:outline-hidden focus:ring-2 focus:ring-sky-500/50"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 gap-1 min-w-0">
            <span className="truncate">Spesa Totale Distretto</span>
            <span className="inline-flex items-center text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0">
              {isPrev ? "Prev." : "Cons."}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 min-w-0">
            <div className="tabular-mca2 text-2xl lg:text-3xl font-extrabold text-slate-950 tracking-tight font-mono truncate">
              {exactKpi
                ? `CHF ${totalSpesaDistretto.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `CHF ${(totalSpesaDistretto / 1_000_000).toFixed(1)}M`}
            </div>
            <svg aria-hidden="true" className="w-16 h-7 shrink-0" viewBox="0 0 80 32">
              <path
                className="sparkline-path"
                d="M 2 26 Q 20 18 40 22 T 78 8"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {isPrev ? "Preventivo consolidato 01.2026" : `Consuntivo consolidato ${selectedYear}`}
          </div>
        </div>

        {/* KPI 3: Autofinanziamento */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExactKpi((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExactKpi((prev) => !prev);
            }
          }}
          aria-pressed={exactKpi}
          className="ofl-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between min-w-0 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/50"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 gap-1 min-w-0">
            <span className="truncate">{t.kpiAutofinancingAvg}</span>
            <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0">
              {isPrev ? "Prev." : "Cons."}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 min-w-0">
            <div className="tabular-mca2 text-2xl lg:text-3xl font-extrabold text-slate-950 tracking-tight font-mono truncate">
              {exactKpi
                ? `CHF ${avgAutofin.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `CHF ${(avgAutofin / 1_000_000).toFixed(1)}M`}
            </div>
            <svg aria-hidden="true" className="w-16 h-7 shrink-0" viewBox="0 0 80 32">
              <path
                className="sparkline-path"
                d="M 2 10 Q 20 8 40 18 T 78 24"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Capacità d&apos;investimento autonoma ({selectedYear})
          </div>
        </div>

        {/* KPI 4: Debito Pro Capite */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExactKpi((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExactKpi((prev) => !prev);
            }
          }}
          aria-pressed={exactKpi}
          className="ofl-card rounded-2xl p-4 cursor-pointer flex flex-col justify-between min-w-0 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 gap-1 min-w-0">
            <span className="truncate">{t.kpiDebtPerCapitaAvg}</span>
            <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0">
              {isPrev ? "Prev." : "Cons."}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2 min-w-0">
            <div className="tabular-mca2 text-2xl lg:text-3xl font-extrabold text-slate-950 tracking-tight font-mono truncate">
              {exactKpi
                ? `CHF ${avgDebitoPc.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `CHF ${avgDebitoPc.toLocaleString("de-CH")}`}
            </div>
            <svg aria-hidden="true" className="w-16 h-7 shrink-0" viewBox="0 0 80 32">
              <path
                className="sparkline-path"
                d="M 2 8 Q 25 14 45 20 T 78 26"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Soglia SEL Ticino &lt; CHF 5&apos;000 ({selectedYear})
          </div>
        </div>
      </section>

      {/* ===================================================================
           4. RIGA SUPERIORE GRAFICI: CARD 1 & CARD 3 (100% SPAZIO DINAMICO)
           =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Andamento Spese e Ricavi (xl:col-span-6) */}
        <div className="xl:col-span-6 ofl-card rounded-2xl p-5 flex flex-col justify-between min-h-[360px] relative min-w-0">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {t.lineChartTitle}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Confronto spesa pro capite 2019–2026 sui comuni selezionati
            </p>
          </div>

          <div className="flex-1 w-full min-w-0 min-h-[280px]">
            <DistrictTrendLineChart
              municipalities={selectedMunicipalities}
              showDistrictAverage={true}
              selectedYear={selectedYear}
              height="100%"
            />
          </div>
        </div>

        {/* Card 3: Spesa Pro Capite per Settore con Drilldown Gerarchico (xl:col-span-6) */}
        <div className="xl:col-span-6 ofl-card rounded-2xl p-5 flex flex-col justify-between min-h-[360px] relative min-w-0">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Spesa Pro Capite per Settore ({selectedYear})
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Struttura gerarchica MCA2 a 4 livelli (Dicastero → Gruppo → Funzione → Conto)
            </p>
          </div>

          <div className="flex-1 w-full min-w-0 min-h-[280px]">
            <SectorPerCapitaBarChart
              municipalities={selectedMunicipalities}
              selectedYear={selectedYear}
              height="100%"
            />
          </div>
        </div>
      </div>

      {/* ===================================================================
           5. RIGA INFERIORE: TABELLA COMPARATIVA (CARD 2A) + SCHEDA MCA2 (CARD 2B)
           =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Card 2A: Tabella Comparativa Comuni (xl:col-span-7) */}
        <div className="xl:col-span-7 ofl-card rounded-2xl p-5 flex flex-col justify-between min-h-[460px]">
          {viewMode === "table" ? (
            <MunicipalitiesTable
              municipalities={municipalities}
              selectedUstCode={activeMuniCode}
              onSelectMunicipality={handleSelectMunicipalityFromTable}
              onToggleMap={() => setViewMode("map")}
              isMapActive={false}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <h3 className="text-sm font-bold text-slate-900">Mappa Vettoriale Distretto</h3>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="ofl-btn-frost rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer"
                >
                  Torna alla Tabella
                </button>
              </div>
              <TerritorialMap
                municipalities={municipalities}
                selectedUstCode={activeMuniCode}
                onSelectMunicipality={handleSelectMunicipalityFromTable}
              />
            </div>
          )}
        </div>

        {/* Card 2B: Scheda Analitica MCA2 Separata e Minimale (xl:col-span-5) */}
        <div className="xl:col-span-5 flex flex-col min-h-[460px]">
          <Mca2AnalyticCard
            municipality={activeMunicipality}
            selectedYear={selectedYear}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
