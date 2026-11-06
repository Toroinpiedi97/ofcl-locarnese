"use client";

import { useState, useEffect } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { QuickCard30s } from "./QuickCard30s";
import { CreditAlertBanner } from "./CreditAlertBanner";
import {
  Search,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMobileProps {
  municipalities: MunicipalityData[];
}

export function DashboardMobile({ municipalities }: DashboardMobileProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeMunicipality, setActiveMunicipality] = useState<MunicipalityData | null>(null);

  // Filtro Comuni
  const filtered = municipalities.filter((m) => {
    const q = filterQuery.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(q) ||
      m.ust_code.toString().includes(q) ||
      m.circle.toLowerCase().includes(q)
    );
  });

  // Chiusura con tasto Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMunicipality(null);
      }
    }
    if (activeMunicipality) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMunicipality]);

  return (
    <div className="w-full space-y-4">
      {/* Barra di ricerca rapida con target comodo */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="search"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Cerca comune o codice UST (es. Locarno, 5091)..."
          className="ofl-input-pill w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      {/* Lista verticale card con tap target >= 44px */}
      <div className="space-y-2.5" role="list">
        {filtered.map((m) => {
          const isAvanzo = m.summary_30s.risultato_ordinario_chf >= 0;
          const hasOverruns = (m.summary_30s.active_overruns_count ?? 0) > 0;

          return (
            <button
              key={m.ust_code}
              type="button"
              onClick={() => setActiveMunicipality(m)}
              className="ofl-card w-full min-h-[52px] p-3.5 rounded-2xl text-left transition-all flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200/90 text-slate-700 font-bold">
                    {m.ust_code}
                  </span>
                  <span className="text-xs text-slate-600 truncate">
                    Circolo di {m.circle}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-950 truncate mt-0.5">
                  {m.name}
                </div>
              </div>

              {/* Informazioni sintetiche sulla riga */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-sm font-bold tabular-nums text-[#0F3854]">
                    {m.tax_multiplier_pf}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 font-medium">
                    PF 2026
                  </div>
                </div>

                <div className="text-right min-w-[70px]">
                  <div
                    className={cn(
                      "font-mono text-xs font-semibold tabular-nums flex items-center justify-end gap-1",
                      isAvanzo ? "text-emerald-700" : "text-red-700"
                    )}
                  >
                    {isAvanzo ? (
                      <TrendingUp className="w-3 h-3 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3 h-3 shrink-0" />
                    )}
                    <span>
                      {isAvanzo ? "+" : ""}
                      {(m.summary_30s.risultato_ordinario_chf / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    {isAvanzo ? "Avanzo" : "Disavanzo"}
                  </div>
                </div>

                {hasOverruns && (
                  <span
                    className="p-1 rounded bg-red-100 text-red-800"
                    title="Sorpasso crediti d'opera rilevato"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                )}

                <div className="min-h-[44px] min-w-[32px] flex items-center justify-center text-slate-400">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center ofl-card rounded-2xl border border-dashed border-slate-300">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">
              Nessun comune trovato per &quot;{filterQuery}&quot;
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Verifica il nome o il codice UST (5091–5399).
            </p>
          </div>
        )}
      </div>

      {/* Bottom Sheet / Drawer scorrevole per la Scheda dei 30 Secondi */}
      {activeMunicipality && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          onClick={() => setActiveMunicipality(null)}
        >
          <div
            className="w-full max-h-[88vh] overflow-y-auto rounded-t-3xl ofl-glass-drawer border-t border-white/80 shadow-2xl p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Maniglia trascinamento & Bottone chiusura comodo */}
            <div className="flex items-center justify-between border-b border-slate-300/40 pb-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-400/60" />
              <button
                type="button"
                onClick={() => setActiveMunicipality(null)}
                aria-label="Chiudi scheda"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-950 ofl-btn-frost transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheda dei 30 Secondi completa */}
            <div id="drawer-title">
              <QuickCard30s municipality={activeMunicipality} year={2025} />
            </div>

            {/* Smart Alert Sorpassi se presenti */}
            {(activeMunicipality.summary_30s.active_overruns_count ?? 0) > 0 && (
              <CreditAlertBanner
                municipalityName={activeMunicipality.name}
                slug={activeMunicipality.slug}
                hasOverruns={true}
                overrunCount={activeMunicipality.summary_30s.active_overruns_count}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
