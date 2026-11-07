"use client";

import { useState, useDeferredValue } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Map as MapIcon,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
import { getMunicipalityYearData, AVAILABLE_FISCAL_YEARS } from "@/data/municipalities";
import { formatChfCompact, cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

export interface MunicipalitiesTableProps {
  municipalities: MunicipalityData[];
  selectedUstCode: number;
  onSelectMunicipality: (municipality: MunicipalityData) => void;
  onToggleMap?: () => void;
  isMapActive?: boolean;
  selectedYear?: string;
  onSelectYear?: (year: string) => void;
  className?: string;
}

type SortField = "name" | "multiplier_pf" | "debito_pc" | "debito_totale" | "autofin";
type SortDirection = "asc" | "desc";

export function MunicipalitiesTable({
  municipalities,
  selectedUstCode,
  onSelectMunicipality,
  onToggleMap,
  isMapActive = false,
  selectedYear = "2024",
  onSelectYear,
  className,
}: MunicipalitiesTableProps) {
  const { t } = useCivicLang();
  const [filterQuery, setFilterQuery] = useState("");
  const deferredQuery = useDeferredValue(filterQuery);
  const [sortField, setSortField] = useState<SortField>("multiplier_pf");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showAllRows, setShowAllRows] = useState(false);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Filtro rapido non bloccante
  const filtered = municipalities.filter((m) => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.ust_code.toString().includes(q) ||
      m.circle.toLowerCase().includes(q)
    );
  });

  // Ordinamento con supporto a Debito Totale basato sull'anno selezionato
  const sorted = [...filtered].sort((a, b) => {
    const dataA = getMunicipalityYearData(a, selectedYear);
    const dataB = getMunicipalityYearData(b, selectedYear);
    let diff = 0;
    switch (sortField) {
      case "name":
        diff = a.name.localeCompare(b.name);
        break;
      case "multiplier_pf":
        diff = dataA.tax_multiplier_pf - dataB.tax_multiplier_pf;
        break;
      case "debito_pc":
        diff = dataA.debito_netto_pc_chf - dataB.debito_netto_pc_chf;
        break;
      case "debito_totale":
        diff = dataA.debito_totale - dataB.debito_totale;
        break;
      case "autofin":
        diff = dataA.autofinanziamento_chf - dataB.autofinanziamento_chf;
        break;
    }
    return sortDirection === "asc" ? diff : -diff;
  });

  const displayedRows = showAllRows ? sorted : sorted.slice(0, 8);

  function renderSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#0F3854] font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0F3854] font-bold" />
    );
  }

  return (
    <div className={cn("flex flex-col justify-between h-full w-full select-none", className)}>
      <div>
        {/* Intestazione Card Tabella Comparativa con Filtro Anno integrato */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Tabella Comparativa Comuni</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                {selectedYear.includes("2026") ? "01.2026 (Prev.)" : `Cons. ${selectedYear}`}
              </span>
            </h2>

            {/* Filtro Anno diretto */}
            {onSelectYear && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {AVAILABLE_FISCAL_YEARS.map((yr) => {
                  const isSel = selectedYear === yr;
                  const isPrev = yr.includes("2026");
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => onSelectYear(yr)}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer text-[10px] font-mono flex items-center gap-0.5",
                        isSel
                          ? "bg-white text-[#0F3854] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                      title={isPrev ? "Preventivo 01.2026" : `Consuntivo ${yr}`}
                    >
                      <span>{yr}</span>
                      {isPrev && (
                        <span className="text-[8px] text-amber-700 font-sans font-medium">P</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {isMapActive && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 font-bold">
                Mappa Attiva
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtra comune..."
                aria-label="Filtra comuni per nome o codice UST"
                className="ofl-input-pill rounded-lg pl-7 pr-2 py-1 text-xs text-slate-800 w-28 sm:w-36 focus:outline-none"
              />
            </div>
            {onToggleMap && (
              <button
                type="button"
                onClick={onToggleMap}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  isMapActive
                    ? "bg-[#0F3854] text-white shadow-xs"
                    : "ofl-btn-frost text-slate-700"
                )}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mappa</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabella Comparativa con Debito Netto Totale + Debito pro capite */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-semibold text-[11px]">
                {/* 1. Comune */}
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 pr-2 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.tableColMun}</span>
                    {renderSortIcon("name")}
                  </div>
                </th>

                {/* 2. Moltiplicatore */}
                <th
                  onClick={() => handleSort("multiplier_pf")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.tableColMult}</span>
                    {renderSortIcon("multiplier_pf")}
                  </div>
                </th>

                {/* 3. Debito Totale Comune (Nuovo requisito 2.4) */}
                <th
                  onClick={() => handleSort("debito_totale")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Debito Totale</span>
                    {renderSortIcon("debito_totale")}
                  </div>
                </th>

                {/* 4. Debito pro capite */}
                <th
                  onClick={() => handleSort("debito_pc")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Debito p.c.</span>
                    {renderSortIcon("debito_pc")}
                  </div>
                </th>

                {/* 5. Autofinanziamento */}
                <th
                  onClick={() => handleSort("autofin")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Autofinanziamento</span>
                    {renderSortIcon("autofin")}
                  </div>
                </th>

                {/* 6. Azione Seleziona */}
                <th className="py-2.5 pl-2 text-center whitespace-nowrap">
                  Scheda
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedRows.map((m) => {
                const isSelected = m.ust_code === selectedUstCode;
                const yearData = getMunicipalityYearData(m, selectedYear);

                return (
                  <tr
                    key={m.ust_code}
                    tabIndex={0}
                    onClick={() => onSelectMunicipality(m)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectMunicipality(m);
                      }
                    }}
                    className={cn(
                      "cursor-pointer transition-colors group",
                      isSelected
                        ? "bg-sky-50/80 font-medium shadow-xs"
                        : "hover:bg-white/60 text-slate-800"
                    )}
                  >
                    {/* 1. Comune con UST e Nome */}
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200/90 text-slate-700 font-bold shrink-0">
                          {m.ust_code}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-900 block leading-tight">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {yearData.population.toLocaleString("de-CH")} ab.
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Moltiplicatore Anno Selezionato */}
                    <td className="py-2.5 px-2 text-right">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {yearData.tax_multiplier_pf.toFixed(1)}%
                      </span>
                      {m.has_differentiated_pg && (
                        <span className="text-[9px] text-amber-800 block font-mono">
                          PG: {yearData.tax_multiplier_pg.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    {/* 3. Debito Netto Totale Anno Selezionato */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-900 font-semibold">
                      {formatChfCompact(yearData.debito_totale)}
                    </td>

                    {/* 4. Debito pro capite Anno Selezionato */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                      {Math.round(yearData.debito_netto_pc_chf).toLocaleString("de-CH")}{" "}
                      <span className="text-[10px] text-slate-500">CHF</span>
                    </td>

                    {/* 5. Autofinanziamento Anno Selezionato */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-emerald-700">
                      {formatChfCompact(yearData.autofinanziamento_chf)}
                    </td>

                    {/* 6. Azione Scheda MCA2 */}
                    <td className="py-2.5 pl-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMunicipality(m);
                        }}
                        className={cn(
                          "ofl-btn-frost rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-all",
                          isSelected && "bg-white shadow-xs text-blue-900 border-blue-300 font-extrabold"
                        )}
                      >
                        {isSelected ? "Attivo" : "Seleziona"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Griglia */}
      <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
        <span>
          {sorted.length} su {municipalities.length} {t.tableTotalCount}
        </span>
        <button
          type="button"
          onClick={() => setShowAllRows((prev) => !prev)}
          className="font-bold text-[#0F3854] hover:underline cursor-pointer"
        >
          {showAllRows ? t.tableCollapse : t.tableShowAll}
        </button>
      </div>
    </div>
  );
}
