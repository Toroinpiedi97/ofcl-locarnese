"use client";

import { useState } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { MunicipalitiesTable } from "./MunicipalitiesTable";
import { QuickCard30s } from "./QuickCard30s";
import { TerritorialMap } from "./TerritorialMap";
import { CreditAlertBanner } from "./CreditAlertBanner";
import { Table, MapPin } from "lucide-react";

export interface DashboardDesktopProps {
  municipalities: MunicipalityData[];
  defaultUstCode?: number;
}

export function DashboardDesktop({
  municipalities,
  defaultUstCode = 5113, // Locarno come predefinito
}: DashboardDesktopProps) {
  const [selectedUstCode, setSelectedUstCode] = useState<number>(defaultUstCode);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  const selectedMunicipality =
    municipalities.find((m) => m.ust_code === selectedUstCode) ?? municipalities[0];

  const hasOverruns = (selectedMunicipality.summary_30s.active_overruns_count ?? 0) > 0;

  return (
    <div className="w-full">
      {/* Barra di controllo vista superiore (Tabella vs Mappa Vettoriale) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Vista Territoriale:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-[#0F3854] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Griglia 19 Comuni</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "map"
                  ? "bg-[#0F3854] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Mappa SVG Distretto</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Selezione attiva: <strong className="text-slate-800 dark:text-slate-200">{selectedMunicipality.name}</strong></span>
        </div>
      </div>

      {/* Griglia Master-Detail a due colonne (60% / 40%) */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Colonna Sinistra (60%): Griglia Comuni o Mappa SVG */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-7 space-y-4">
          {viewMode === "table" ? (
            <MunicipalitiesTable
              municipalities={municipalities}
              selectedUstCode={selectedUstCode}
              onSelectMunicipality={(m) => setSelectedUstCode(m.ust_code)}
            />
          ) : (
            <div className="bento-card p-4 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800">
              <TerritorialMap
                municipalities={municipalities}
                selectedUstCode={selectedUstCode}
                onSelectMunicipality={(m) => setSelectedUstCode(m.ust_code)}
              />
            </div>
          )}

          {/* Banner rapido di contesto per sorpassi o conformità */}
          {hasOverruns && (
            <CreditAlertBanner
              municipalityName={selectedMunicipality.name}
              slug={selectedMunicipality.slug}
              hasOverruns={true}
              overrunCount={selectedMunicipality.summary_30s.active_overruns_count}
            />
          )}
        </div>

        {/* Colonna Destra (40%): Scheda dei 30 Secondi Sticky */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 space-y-4">
          <QuickCard30s
            municipality={selectedMunicipality}
            year={2025}
          />
        </div>
      </div>
    </div>
  );
}
