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
import { formatChfCompact, cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

export interface MunicipalitiesTableProps {
  municipalities: MunicipalityData[];
  selectedUstCode: number;
  onSelectMunicipality: (municipality: MunicipalityData) => void;
  onToggleMap?: () => void;
  isMapActive?: boolean;
}

type SortField = "name" | "multiplier_pf" | "debito_pc" | "autofin";
type SortDirection = "asc" | "desc";

export function MunicipalitiesTable({
  municipalities,
  selectedUstCode,
  onSelectMunicipality,
  onToggleMap,
  isMapActive = false,
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

  // Ordinamento
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    switch (sortField) {
      case "name":
        diff = a.name.localeCompare(b.name);
        break;
      case "multiplier_pf":
        diff = a.tax_multiplier_pf - b.tax_multiplier_pf;
        break;
      case "debito_pc":
        diff = a.summary_30s.debito_netto_pc_chf - b.summary_30s.debito_netto_pc_chf;
        break;
      case "autofin":
        diff = a.summary_30s.autofinanziamento_chf - b.summary_30s.autofinanziamento_chf;
        break;
    }
    return sortDirection === "asc" ? diff : -diff;
  });

  const displayedRows = showAllRows ? sorted : sorted.slice(0, 7);

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
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Intestazione Card Tabella */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {t.tableTitle}
            </h2>
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
                <span>Mappa Vettoriale</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabella Comparativa con Sparklines Inline */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-slate-200/80 text-slate-500 font-semibold text-[11px]">
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 pr-2 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.tableColMun}</span>
                    {renderSortIcon("name")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("multiplier_pf")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.tableColMult}</span>
                    {renderSortIcon("multiplier_pf")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("debito_pc")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.tableColDebt}</span>
                    {renderSortIcon("debito_pc")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("autofin")}
                  className="py-2.5 px-2 cursor-pointer hover:text-slate-900 whitespace-nowrap text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.tableColAutofin}</span>
                    {renderSortIcon("autofin")}
                  </div>
                </th>
                <th className="py-2.5 pl-2 text-center whitespace-nowrap">
                  {t.tableColActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedRows.map((m) => {
                const isSelected = m.ust_code === selectedUstCode;
                const mult = m.tax_multiplier_pf;
                const sparklineColor =
                  mult <= 80 ? "#10b981" : mult <= 88 ? "#2563eb" : "#f59e0b";

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
                    {/* 1. Comune con UST e Dot */}
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sparklineColor }}
                        />
                        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200/90 text-slate-700 font-bold shrink-0">
                          {m.ust_code}
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-blue-900">
                          {m.name}
                        </span>
                      </div>
                    </td>

                    {/* 2. Moltiplicatore con Mini Sparkline SVG Inline */}
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {m.tax_multiplier_pf}%
                        </span>
                        <svg className="w-10 h-3.5 shrink-0 hidden sm:block" viewBox="0 0 50 16">
                          <path
                            d={
                              mult <= 80
                                ? "M 2 12 Q 15 14 25 8 T 48 4"
                                : mult <= 88
                                ? "M 2 14 Q 15 10 25 12 T 48 6"
                                : "M 2 6 Q 15 8 25 12 T 48 14"
                            }
                            fill="none"
                            stroke={sparklineColor}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      {m.has_differentiated_pg && (
                        <span className="text-[9px] text-amber-800 block">
                          PG: {m.tax_multiplier_pg}%
                        </span>
                      )}
                    </td>

                    {/* 3. Debito p.c. */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                      {Math.round(m.summary_30s.debito_netto_pc_chf).toLocaleString("de-CH")}{" "}
                      <span className="text-[10px] text-slate-500">CHF</span>
                    </td>

                    {/* 4. Autofinanziamento */}
                    <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-emerald-700">
                      {formatChfCompact(m.summary_30s.autofinanziamento_chf)}
                    </td>

                    {/* 5. Azioni */}
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
                        {t.tableActionDetails}
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
