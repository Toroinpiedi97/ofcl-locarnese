"use client";

import { useState, useTransition } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { MunicipalitiesTable } from "./MunicipalitiesTable";
import { TerritorialMap } from "./TerritorialMap";
import { MunicipalityGlassDrawer } from "./MunicipalityGlassDrawer";
import { DistrictTrendLineChart, SectorPerCapitaBarChart } from "@/components/charts";
import { CultPopoverTicket } from "@/components/cult/CultPopoverTicket";
import { useCivicLang } from "@/lib/i18n-civic";
import {
  Search,
  Download,
  Ticket,
  ChevronDown,
  Building2,
  Users,
  Percent,
  Coins,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardDesktopProps {
  municipalities: MunicipalityData[];
  defaultUstCode?: number;
}

export function DashboardDesktop({
  municipalities,
  defaultUstCode = 5113, // Locarno predefinito
}: DashboardDesktopProps) {
  const { t } = useCivicLang();
  const [isPending, startTransition] = useTransition();

  const [selectedUstCode, setSelectedUstCode] = useState<number>(defaultUstCode);
  const [compareUstCode, setCompareUstCode] = useState<number>(5115); // Losone come confronto
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [exactKpi, setExactKpi] = useState(false);

  const selectedMunicipality =
    municipalities.find((m) => m.ust_code === selectedUstCode) ?? municipalities[0];
  const compareMunicipality =
    municipalities.find((m) => m.ust_code === compareUstCode) ?? municipalities[1];

  function handleSelectMunicipality(m: MunicipalityData) {
    startTransition(() => {
      setSelectedUstCode(m.ust_code);
      setDrawerOpen(true);
      // Aggiorna l'URL senza ricaricare la pagina
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
    window.location.href = "/open-data";
  }

  // Calcoli grandezze distrettuali
  const totalPop = municipalities.reduce((acc, m) => acc + m.population, 0);
  const avgMultiplier = (
    municipalities.reduce((acc, m) => acc + m.tax_multiplier_pf, 0) / municipalities.length
  ).toFixed(1);

  return (
    <div className="p-5 lg:p-6 space-y-4">
      {/* ===================================================================
           1. TOP BAR: Titolo istituzionale a sinistra + Controlli a destra
           =================================================================== */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/10 text-slate-900 text-[11px] font-bold font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F3854]" />
              <span>19 / 19 Comuni</span>
            </span>
            <span className="font-mono text-[11px] text-slate-600 font-semibold">
              · {totalPop.toLocaleString("de-CH")} ab. (STATPOP)
            </span>
          </div>
          <h1 className="text-xl xl:text-[22px] font-extrabold tracking-tight text-slate-950 leading-tight">
            Osservatorio Finanze Comunali del Locarnese
          </h1>
          <p className="text-xs text-slate-700 font-medium mt-0.5">
            {t.portalSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
          {/* Year Dropdown Pill */}
          <div className="relative shrink-0">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Anno di bilancio"
              className="ofl-year-pill appearance-none rounded-full pl-3.5 pr-7 py-1.5 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2026">2026</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 pointer-events-none absolute right-2 top-2" />
          </div>

          {/* Blue Pill: Scarica Open Data */}
          <button
            type="button"
            onClick={handleTriggerOpenData}
            className="ofl-btn-blue rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{t.downloadOpenData}</span>
          </button>

          {/* Amber Pill: Segnala / Apri Ticket */}
          <CultPopoverTicket
            initialUstCode={selectedUstCode}
            triggerButton={
              <button
                type="button"
                className="ofl-btn-amber rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
              >
                <Ticket className="w-3.5 h-3.5 shrink-0" />
                <span>{t.reportTicket}</span>
              </button>
            }
          />
        </div>
      </header>

      {/* ===================================================================
           2. RIGA 4 KPI CARDS (pulite, soft-3D, toggle formato centesimo)
           =================================================================== */}
      <section
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        aria-label="Indicatori chiave distrettuali"
      >
        <div
          onClick={() => setExactKpi((prev) => !prev)}
          className="ofl-card rounded-2xl px-5 py-4 cursor-pointer"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="text-xs font-semibold text-slate-700">{t.kpiMultiplierAvg}</div>
          <div className="tabular-mca2 text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight mt-1 font-mono">
            {avgMultiplier}%
          </div>
        </div>

        <div
          onClick={() => setExactKpi((prev) => !prev)}
          className="ofl-card rounded-2xl px-5 py-4 cursor-pointer"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="text-xs font-semibold text-slate-700">{t.kpiTotalRevenue}</div>
          <div className="tabular-mca2 text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight mt-1 font-mono">
            {exactKpi ? "CHF 584'120'000.00" : "CHF 584M"}
          </div>
        </div>

        <div
          onClick={() => setExactKpi((prev) => !prev)}
          className="ofl-card rounded-2xl px-5 py-4 cursor-pointer"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="text-xs font-semibold text-slate-700">{t.kpiAutofinancingAvg}</div>
          <div className="tabular-mca2 text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight mt-1 font-mono">
            {exactKpi ? "CHF 4'210'000.00" : "CHF 4.2M"}
          </div>
        </div>

        <div
          onClick={() => setExactKpi((prev) => !prev)}
          className="ofl-card rounded-2xl px-5 py-4 cursor-pointer"
          title="Clicca per commutare formato compatto/centesimi esatti"
        >
          <div className="text-xs font-semibold text-slate-700">{t.kpiDebtPerCapitaAvg}</div>
          <div className="tabular-mca2 text-2xl sm:text-[28px] font-extrabold text-slate-950 tracking-tight mt-1 font-mono">
            {exactKpi ? "CHF 3'120.50" : "CHF 3'120"}
          </div>
        </div>
      </section>

      {/* ===================================================================
           3. GRIGLIA CENTRALE: Grafici a Sinistra + Tabella & Drawer a Destra
           =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* COLONNA SINISTRA (5/12): I DUE GRAFICI NIVO IMPILATI */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Grafico Alto: Andamento Spese e Ricavi */}
          <div className="ofl-card rounded-2xl p-4 flex-1 flex flex-col justify-between relative">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {t.lineChartTitle}
              </h2>
              {/* Legenda con selettore del comune di confronto */}
              <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-700 my-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                  <span>{selectedMunicipality.name}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 text-slate-800 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]" />
                  <select
                    value={compareUstCode}
                    onChange={(e) => setCompareUstCode(Number(e.target.value))}
                    aria-label="Comune di confronto"
                    className="bg-transparent font-semibold text-slate-900 cursor-pointer focus:outline-none underline decoration-dotted"
                  >
                    {municipalities
                      .filter((m) => m.ust_code !== selectedUstCode)
                      .map((m) => (
                        <option key={m.ust_code} value={m.ust_code}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </span>

                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                  <span>Media Distretto</span>
                </span>
              </div>
            </div>

            <DistrictTrendLineChart
              primaryMun={selectedMunicipality}
              compareMun={compareMunicipality}
              height={185}
            />
          </div>

          {/* Grafico Basso: Spesa Pro Capite per Settore */}
          <div className="ofl-card rounded-2xl p-4 flex-1 flex flex-col justify-between relative">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {t.barChartTitle} ({selectedMunicipality.name})
              </h2>
            </div>

            <SectorPerCapitaBarChart
              municipality={selectedMunicipality}
              height={185}
            />
          </div>
        </div>

        {/* COLONNA DESTRA (7/12): TABELLA / MAPPA + DRAWER IN VETRO SMERIGLIATO */}
        <div className="xl:col-span-7 ofl-card rounded-2xl p-4 sm:p-5 relative overflow-hidden min-h-[470px] flex flex-col justify-between">
          <div className={cn("transition-all duration-300", drawerOpen && "xl:pr-[232px]")}>
            {viewMode === "table" ? (
              <MunicipalitiesTable
                municipalities={municipalities}
                selectedUstCode={selectedUstCode}
                onSelectMunicipality={handleSelectMunicipality}
                onToggleMap={() => setViewMode("map")}
                isMapActive={false}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-300/40">
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
                  selectedUstCode={selectedUstCode}
                  onSelectMunicipality={handleSelectMunicipality}
                />
              </div>
            )}
          </div>

          {/* Pulsante per riaprire il Drawer se chiuso */}
          {!drawerOpen && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="absolute top-4 right-4 ofl-btn-frost rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm z-10 cursor-pointer"
            >
              Dettagli ◂
            </button>
          )}

          {/* DRAWER DESTRO IN VETRO SMERIGLIATO */}
          <MunicipalityGlassDrawer
            municipality={selectedMunicipality}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
