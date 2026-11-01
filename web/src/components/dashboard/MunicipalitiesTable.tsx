"use client";

import { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Users,
  Percent,
  TrendingUp,
  TrendingDown,
  Search,
  Check,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
import { IndicatorsSelBar } from "./IndicatorsSelBar";

export interface MunicipalitiesTableProps {
  municipalities: MunicipalityData[];
  selectedUstCode: number;
  onSelectMunicipality: (municipality: MunicipalityData) => void;
}

type SortField = "name" | "population" | "multiplier_pf" | "risultato" | "debito_pc";
type SortDirection = "asc" | "desc";

export function MunicipalitiesTable({
  municipalities,
  selectedUstCode,
  onSelectMunicipality,
}: MunicipalitiesTableProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("multiplier_pf");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  // Filtro testuale rapido
  const filtered = municipalities.filter((m) => {
    const q = filterQuery.toLowerCase().trim();
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
      case "population":
        diff = a.population - b.population;
        break;
      case "multiplier_pf":
        diff = a.tax_multiplier_pf - b.tax_multiplier_pf;
        break;
      case "risultato":
        diff = a.summary_30s.risultato_ordinario_chf - b.summary_30s.risultato_ordinario_chf;
        break;
      case "debito_pc":
        diff = a.summary_30s.debito_netto_pc_chf - b.summary_30s.debito_netto_pc_chf;
        break;
    }
    return sortDirection === "asc" ? diff : -diff;
  });

  function renderSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-cyan-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-500" />
    );
  }

  return (
    <div className="bento-card bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Intestazione Griglia & Filtro Rapido */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/40">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0F3854] dark:text-cyan-400" />
            <span>I 19 Comuni del Locarnese</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dati armonizzati MCA2 · Clicca su un comune per aggiornare la Scheda 30 Secondi
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtra comune..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Tabella Comparativa */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold select-none">
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 group hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Comune</span>
                  {renderSortIcon("name")}
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort("population")}
                  className="flex items-center gap-1 group hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Abitanti</span>
                  {renderSortIcon("population")}
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort("multiplier_pf")}
                  className="flex items-center gap-1 group hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Moltiplicatore 2026</span>
                  {renderSortIcon("multiplier_pf")}
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort("risultato")}
                  className="flex items-center gap-1 group hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Risultato Ord.</span>
                  {renderSortIcon("risultato")}
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => handleSort("debito_pc")}
                  className="flex items-center gap-1 group hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span>Debito p.c.</span>
                  {renderSortIcon("debito_pc")}
                </button>
              </th>
              <th className="py-2.5 px-3 min-w-[130px]">Cruscotto SEL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sorted.map((m) => {
              const isSelected = m.ust_code === selectedUstCode;
              const isAvanzo = m.summary_30s.risultato_ordinario_chf >= 0;

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
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 font-medium ring-1 ring-inset ring-cyan-500/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {/* Nome & UST */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {m.ust_code}
                      </span>
                      <span className="font-semibold">{m.name}</span>
                    </div>
                  </td>

                  {/* Abitanti */}
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {m.population.toLocaleString("de-CH")}
                  </td>

                  {/* Moltiplicatore 2026 */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      <span>{m.tax_multiplier_pf}%</span>
                      {m.has_differentiated_pg && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-medium">
                          PG: {m.tax_multiplier_pg}%
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Risultato Ordinario */}
                  <td className="py-2.5 px-3 font-mono tabular-nums font-semibold">
                    <span className={isAvanzo ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                      {isAvanzo ? "+" : ""}
                      {(m.summary_30s.risultato_ordinario_chf / 1000).toLocaleString("de-CH", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      k
                    </span>
                  </td>

                  {/* Debito Netto pro Capite */}
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {m.summary_30s.debito_netto_pc_chf.toLocaleString("de-CH", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    CHF
                  </td>

                  {/* Micro-Cruscotto 8 tacche SEL */}
                  <td className="py-2.5 px-3">
                    <IndicatorsSelBar scoreConform={m.summary_30s.sel_conformity} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Griglia */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
        <div>Mostrati {sorted.length} su 19 comuni</div>
        <div>Tutti i dati espressi in CHF (MCA2 al centesimo esatto)</div>
      </div>
    </div>
  );
}
