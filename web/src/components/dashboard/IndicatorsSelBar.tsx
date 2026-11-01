"use client";

import { useState } from "react";

export interface SingleIndicatorItem {
  code: string;
  name: string;
  short_label: string;
  value: number | null;
  unit: string;
  band: "OTTIMO" | "BUONO" | "ACCETTABILE" | "SUFFICIENTE" | "MEDIO" | "NORMALE" | "DEBOLE" | "ECCESSIVO" | "CRITICO" | "ALTO" | "ELEVATO" | "MOLTO_ELEVATO" | "RIDOTTO" | "BASSO" | "N_A";
  formula: string;
  threshold_hint: string;
}

export interface IndicatorsSelBarProps {
  indicators?: SingleIndicatorItem[];
  scoreConform?: string; // es. "8/8" o "6/8"
  compact?: boolean;
}

// 8 Indicatori Finanziari Ufficiali SEL ex art. 22 lett. o RGFCC
const DEFAULT_INDICATORS: SingleIndicatorItem[] = [
  {
    code: "NET_DEBT_RATIO",
    name: "1. Tasso di indebitamento netto",
    short_label: "T. Indeb.",
    value: 228.5,
    unit: "%",
    band: "ECCESSIVO",
    formula: "(Debito netto / Gettito imposta base) * 100",
    threshold_hint: "< 100% Buono | 100-150% Accettabile | > 150% Eccessivo",
  },
  {
    code: "SELF_FINANCING_DEGREE",
    name: "2. Grado di autofinanziamento",
    short_label: "Autofin.",
    value: 54.6,
    unit: "%",
    band: "DEBOLE",
    formula: "(Autofinanziamento / Investimenti netti BA) * 100",
    threshold_hint: "> 100% Buono | 70-100% Accettabile | < 70% Debole (C-03h)",
  },
  {
    code: "INTEREST_BURDEN_RATIO",
    name: "3. Quota spese per interessi",
    short_label: "Interessi",
    value: -0.8,
    unit: "%",
    band: "BUONO",
    formula: "((Spese interessi 340 - Ricavi interessi 440) / Ricavi correnti) * 100",
    threshold_hint: "≤ 4% Buono | 4-9% Sufficiente | > 9% Eccessivo",
  },
  {
    code: "NET_DEBT_PER_CAPITA",
    name: "4. Debito pubblico netto pro capite",
    short_label: "Debito p.c.",
    value: 11856.7,
    unit: "CHF/ab",
    band: "ECCESSIVO",
    formula: "Debito netto / Popolazione residente permanente",
    threshold_hint: "< 1'000 CHF Basso | 1'000-3'000 Medio | 3'000-5'000 Elevato | > 5'000 Eccessivo",
  },
  {
    code: "INVESTMENT_RATIO",
    name: "5. Quota degli investimenti",
    short_label: "Quota Inv.",
    value: 21.4,
    unit: "%",
    band: "ELEVATO",
    formula: "(Investimenti lordi BA / Uscite consolidate) * 100",
    threshold_hint: "> 30% Molto elevata | 20-30% Elevata | 10-20% Media | < 10% Ridotta",
  },
  {
    code: "EQUITY_RATIO",
    name: "6. Quota di capitale proprio",
    short_label: "Cap. Proprio",
    value: 14.5,
    unit: "%",
    band: "MEDIO",
    formula: "(Capitale proprio / Totale passivi) * 100",
    threshold_hint: "> 40% Eccessivo | 20-40% Buono | 10-20% Medio | < 10% Debole",
  },
  {
    code: "CAPITAL_SERVICE_RATIO",
    name: "7. Quota degli oneri finanziari",
    short_label: "Oneri Fin.",
    value: 4.8,
    unit: "%",
    band: "BUONO",
    formula: "(Oneri finanziari / Ricavi correnti) * 100",
    threshold_hint: "< 5% Buono/Basso impatto | 5-15% Sopportabile | > 15% Elevato",
  },
  {
    code: "SELF_FINANCING_CAPACITY",
    name: "8. Capacità di autofinanziamento",
    short_label: "Capac. Autof.",
    value: 14.6,
    unit: "%",
    band: "MEDIO",
    formula: "(Autofinanziamento / Ricavi correnti) * 100",
    threshold_hint: "> 20% Buona | 10-20% Media | < 10% Debole",
  },
];

function getBandColor(band: SingleIndicatorItem["band"]): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  switch (band) {
    case "BUONO":
    case "NORMALE":
    case "OTTIMO":
    case "BASSO":
      return {
        bg: "bg-emerald-500",
        border: "border-emerald-600",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "🟢",
      };
    case "ACCETTABILE":
    case "SUFFICIENTE":
    case "MEDIO":
    case "ELEVATO":
    case "RIDOTTO":
      return {
        bg: "bg-amber-500",
        border: "border-amber-600",
        text: "text-amber-700 dark:text-amber-400",
        dot: "🟡",
      };
    case "DEBOLE":
    case "ECCESSIVO":
    case "CRITICO":
    case "ALTO":
    case "MOLTO_ELEVATO":
      return {
        bg: "bg-red-500",
        border: "border-red-600",
        text: "text-red-700 dark:text-red-400",
        dot: "🔴",
      };
    default:
      return {
        bg: "bg-slate-300 dark:bg-slate-700",
        border: "border-slate-400",
        text: "text-slate-500 dark:text-slate-400",
        dot: "⚪",
      };
  }
}

export function IndicatorsSelBar({
  indicators = DEFAULT_INDICATORS,
  scoreConform,
  compact = false,
}: IndicatorsSelBarProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Calcola il punteggio di conformità (buono o accettabile)
  const conformCount = indicators.filter(
    (i) => i.band === "BUONO" || i.band === "NORMALE" || i.band === "OTTIMO" || i.band === "BASSO"
  ).length;

  const displayScore = scoreConform || `${conformCount}/${indicators.length}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
          <span>Indicatori SEL (Art. 22 RGFCC)</span>
        </span>
        <span
          className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
            conformCount >= 6
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
              : conformCount >= 4
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
          }`}
          title="Numero di indicatori finanziari in fascia verde/conforme rispetto alle soglie ufficiali SEL"
        >
          {displayScore} Conformi
        </span>
      </div>

      {/* Barra micro-segmenti a 8 tacche con tooltip interattivo */}
      <div className="relative flex items-center gap-1 w-full">
        {indicators.map((ind, idx) => {
          const colors = getBandColor(ind.band);
          const isHovered = activeTooltip === idx;

          return (
            <div
              key={ind.code}
              className="relative flex-1 group"
              onMouseEnter={() => setActiveTooltip(idx)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div
                className={`w-full ${
                  compact ? "h-2" : "h-2.5"
                } rounded-full transition-all duration-150 cursor-pointer ${colors.bg} hover:opacity-90 hover:scale-y-125`}
              />

              {/* Tooltip con formula SEL e soglia ufficiale */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none">
                  <div className="flex items-center justify-between font-semibold border-b border-slate-800 pb-1 mb-1.5">
                    <span className="text-slate-200">{ind.name}</span>
                    <span className="text-sm">{colors.dot}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Valore registrato:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {ind.value !== null ? `${ind.value} ${ind.unit}` : "n.d."}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span className="text-slate-400">Fascia cantonale:</span>
                    <span className={`font-semibold ${colors.text}`}>{ind.band}</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 leading-tight">
                    <div>
                      <span className="text-slate-500">Formula:</span> {ind.formula}
                    </div>
                    <div className="mt-0.5 text-slate-500">{ind.threshold_hint}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
