"use client";

import { useState, useEffect } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import {
  AVAILABLE_FISCAL_YEARS,
  getMunicipalityYearData,
  parseFiscalYear,
} from "@/data/municipalities";
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
  ShieldCheck,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMobileProps {
  municipalities: MunicipalityData[];
}

export function DashboardMobile({ municipalities }: DashboardMobileProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [activeMunicipality, setActiveMunicipality] = useState<MunicipalityData | null>(null);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);

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
      {/* Card Hero di Benvenuto & Presentazione Civica (Collassabile) */}
      <div className="ofl-card rounded-2xl p-4 shadow-xs border border-white/80 transition-all">
        {isHeroCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-100 text-sky-800">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-900">
                OFCL · 19 Comuni del Locarnese
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHeroCollapsed(false)}
              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 min-h-[36px] px-2 rounded-lg cursor-pointer"
            >
              <span>Espandi guida</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-[#0F3854] text-[10px] font-bold font-mono border border-sky-200">
                <ShieldCheck className="w-3 h-3 text-[#0F3854]" />
                <span>PRESIDIO CIVICO INDIPENDENTE</span>
              </span>

              <button
                type="button"
                onClick={() => setIsHeroCollapsed(true)}
                aria-label="Comprimi presentazione"
                className="text-slate-400 hover:text-slate-700 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg cursor-pointer"
                title="Comprimi presentazione"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-sm sm:text-base font-extrabold text-slate-950 tracking-tight mt-2 leading-snug">
              I Bilanci dei 19 Comuni del Locarnese
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              Osservatorio per la trasparenza finanziaria: conti armonizzati MCA2 al centesimo (<span className="font-mono font-semibold text-slate-800">0.01 CHF</span>), indicatori ufficiali SEL e sorpassi dei crediti d&apos;opera (art. 15 LOC).
            </p>

            {/* 3 Metriche Chiave del Distretto */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-slate-200/80 text-center">
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 min-w-0">
                <div className="font-mono text-xs sm:text-sm font-extrabold text-[#0F3854]">19</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">Comuni UST</div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 min-w-0">
                <div className="font-mono text-xs sm:text-sm font-extrabold text-[#0F3854]">~66&apos;000</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">Abitanti</div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 min-w-0">
                <div className="font-mono text-xs sm:text-sm font-extrabold text-emerald-700 whitespace-nowrap tabular-nums">0.01 CHF</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">MCA2 Esatto</div>
              </div>
            </div>

            {/* Guida Rapida Collassabile */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setShowQuickGuide((prev) => !prev)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-700 hover:text-slate-950 py-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-sky-800">
                  <Info className="w-3.5 h-3.5 text-sky-700" />
                  <span>Come esplorare i dati? (30 secondi)</span>
                </div>
                {showQuickGuide ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {showQuickGuide && (
                <div className="mt-2 space-y-1.5 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-sky-700 shrink-0">1.</span>
                    <span>Tocca un comune dalla lista per aprire la <strong>Scheda Rapida 30s</strong> (moltiplicatore, debito netto pro capite e autofinanziamento).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-sky-700 shrink-0">2.</span>
                    <span>Usa il selettore per cambiare esercizio tra <strong>2024</strong>, <strong>2025</strong> e <strong>Preventivo 2026</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-sky-700 shrink-0">3.</span>
                    <span>Apri il menu in alto <span className="font-bold">☰</span> o la barra inferiore per confrontare i comuni o accedere agli atti PDF.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selettore Anno Mobile Compatto (2024, 2025, 01.2026) */}
      <div className="flex items-center justify-between p-2 px-2.5 sm:px-3 rounded-2xl ofl-card shadow-xs flex-wrap gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Calendar className="w-3.5 h-3.5 text-sky-700" />
          <span>Esercizio:</span>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          {AVAILABLE_FISCAL_YEARS.map((yr) => {
            const isSel = selectedYear === yr;
            const isPrev = yr.includes("2026");
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={cn(
                  "px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all font-mono flex items-center gap-0.5 sm:gap-1 cursor-pointer",
                  isSel
                    ? "bg-white text-[#0F3854] shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-900"
                )}
                title={isPrev ? "Preventivo 01.2026" : `Consuntivo ${yr}`}
              >
                <span>{yr}</span>
                {isPrev && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-sans font-medium">
                    Prev.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra di ricerca rapida con target comodo */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Cerca comune o codice UST (es. Locarno, 5091)..."
          className="ofl-input-pill w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Lista verticale card con tap target >= 44px */}
      <div className="space-y-2.5" role="list">
        {filtered.map((m) => {
          const yearData = getMunicipalityYearData(m, selectedYear);
          const isAvanzo = yearData.risultato_ordinario_chf >= 0;
          const hasOverruns = (yearData.active_overruns_count ?? 0) > 0;

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
                    Circolo di {m.circle} · {yearData.population.toLocaleString("de-CH")} ab.
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
                    {yearData.tax_multiplier_pf.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 font-medium">
                    PF {selectedYear}
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
                      {(yearData.risultato_ordinario_chf / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
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
            className="w-full max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl ofl-glass-drawer border-t border-white/80 shadow-2xl p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Maniglia trascinamento & Bottone chiusura comodo */}
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
              <button
                type="button"
                onClick={() => setActiveMunicipality(null)}
                aria-label="Chiudi scheda"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-600 hover:text-slate-950 ofl-btn-frost transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scheda dei 30 Secondi completa con anno dinamico */}
            <div id="drawer-title">
              <QuickCard30s
                municipality={activeMunicipality}
                year={parseFiscalYear(selectedYear)}
              />
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
