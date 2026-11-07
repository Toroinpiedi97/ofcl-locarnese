"use client";

import { useState } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export const MUNICIPALITY_SERIES_COLORS = [
  "#2563eb", // Blu (Comune 1 / Principale)
  "#f97316", // Arancione (Comune 2)
  "#10b981", // Verde smeraldo (Comune 3)
  "#8b5cf6", // Viola (Comune 4)
];

export interface GlobalFilterBarProps {
  allMunicipalities: MunicipalityData[];
  selectedUstCodes: number[];
  onToggleUstCode: (ustCode: number) => void;
  onSetSelectedUstCodes: (ustCodes: number[]) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  className?: string;
}

export function GlobalFilterBar({
  allMunicipalities,
  selectedUstCodes,
  onToggleUstCode,
  onSetSelectedUstCodes,
  selectedYear,
  onSelectYear,
  className,
}: GlobalFilterBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const maxReached = selectedUstCodes.length >= 4;

  const selectedMunicipalities = selectedUstCodes
    .map((code) => allMunicipalities.find((m) => m.ust_code === code))
    .filter(Boolean) as MunicipalityData[];

  const availableToAdd = allMunicipalities.filter((m) => {
    const isSelected = selectedUstCodes.includes(m.ust_code);
    const matchSearch =
      m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.ust_code.toString().includes(searchFilter);
    return !isSelected && matchSearch;
  });

  function handleAdd(ustCode: number) {
    if (selectedUstCodes.length < 4) {
      onToggleUstCode(ustCode);
      setSearchFilter("");
      if (selectedUstCodes.length + 1 >= 4) {
        setPopoverOpen(false);
      }
    }
  }

  function handleRemove(ustCode: number) {
    // Non permettere di rimuovere se c'è solo 1 comune selezionato
    if (selectedUstCodes.length > 1) {
      onSetSelectedUstCodes(selectedUstCodes.filter((c) => c !== ustCode));
    }
  }

  function handleResetToLocarno() {
    onSetSelectedUstCodes([5113]);
  }

  return (
    <div
      className={cn(
        "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none",
        className
      )}
    >
      {/* Sinistra: Selettore Anno di Bilancio & Etichetta Filtri */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <div className="p-1.5 rounded-lg bg-sky-100 text-[#0F3854]">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span>Filtro Globale:</span>
        </div>

        {/* Selettore Anno con Pillola Satinata */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 shrink-0" />
          {["2024", "2025", "2026"].map((yr) => {
            const isSel = selectedYear === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => onSelectYear(yr)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono",
                  isSel
                    ? "bg-white text-[#0F3854] shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {yr}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-slate-500 hidden xl:inline">
          (Sincronizza grafici, indicatori e tabelle)
        </span>
      </div>

      {/* Destra: Selezione Comuni a Chip con Pulsante "+" */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-600">Comuni ({selectedUstCodes.length}/4):</span>

        {/* Chip dei comuni attualmente selezionati */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedMunicipalities.map((m, idx) => {
            const color = MUNICIPALITY_SERIES_COLORS[idx] || "#0ea5e9";
            const canRemove = selectedMunicipalities.length > 1;

            return (
              <div
                key={m.ust_code}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold text-slate-900 transition-all"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-[10px] text-slate-500">{m.ust_code}</span>
                <span className="font-bold">{m.name}</span>

                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.ust_code)}
                    aria-label={`Rimuovi ${m.name} dal confronto`}
                    className="w-4 h-4 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 ml-0.5" title="Comune principale">
                    •
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pulsante "+" per aggiungere comune (fino a 4) */}
        {!maxReached && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 border border-dashed border-sky-300 text-xs font-bold text-sky-800 hover:border-sky-400 shadow-xs cursor-pointer transition-all active:scale-95"
                title="Aggiungi comune al confronto (max 4)"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600 stroke-[3]" />
                <span>Aggiungi Comune</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-64 p-2 ofl-card border border-white/90 shadow-2xl max-h-72 overflow-y-auto"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Aggiungi al confronto</span>
                <span className="font-mono">{availableToAdd.length} disp.</span>
              </div>

              {/* Input rapido di ricerca nel popover */}
              <div className="p-1">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cerca comune..."
                  className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-100 border border-slate-200 text-slate-800 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-0.5 mt-1">
                {availableToAdd.map((m) => (
                  <button
                    key={m.ust_code}
                    type="button"
                    onClick={() => handleAdd(m.ust_code)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-800 hover:bg-sky-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                        {m.ust_code}
                      </span>
                      <span className="font-semibold">{m.name}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#0F3854]">
                      {m.tax_multiplier_pf}%
                    </span>
                  </button>
                ))}

                {availableToAdd.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-500">
                    Nessun comune trovato
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Pulsante rapido di reset a Locarno se ci sono più comuni */}
        {selectedUstCodes.length > 1 && (
          <button
            type="button"
            onClick={handleResetToLocarno}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline decoration-dotted ml-1 cursor-pointer"
            title="Reimposta visualizzazione solo su Locarno"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
