"use client";

import { useState, useId } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { MUNICIPALITIES, getMunicipalityYearData } from "@/data/municipalities";
import {
  Calculator,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaxImpactSimulatorProps {
  municipality: MunicipalityData;
  selectedYear?: string;
  className?: string;
}

export function TaxImpactSimulator({
  municipality,
  selectedYear,
  className = "",
}: TaxImpactSimulatorProps) {
  const [subjectType, setSubjectType] = useState<"PF" | "PG">("PF");
  const [baseChf, setBaseChf] = useState<number>(4000);
  const [includeWasteFee, setIncludeWasteFee] = useState<boolean>(false);
  const inputId = useId();

  const yearData = getMunicipalityYearData(municipality, selectedYear ?? "2025");

  // Moltiplicatore attivo per il soggetto selezionato
  const activeMultiplier =
    subjectType === "PG" && municipality.has_differentiated_pg
      ? yearData.tax_multiplier_pg
      : yearData.tax_multiplier_pf;

  // Calcolo centesimale esatto (0.01 CHF) dell'imposta comunale ordinaria
  // base in CHF -> centesimi interi per evitare errori floating-point
  const baseCents = Math.round(baseChf * 100);
  const municipalTaxCents = Math.round((baseCents * activeMultiplier) / 100);
  const municipalTaxChf = municipalTaxCents / 100;
  const municipalMonthlyChf = municipalTaxChf / 12;

  // Estrazione Tassa Rifiuti Base (se abilitata e disponibile)
  const parsedWasteFee = parseFloat(
    municipality.waste_base_fee.replace(/[^0-9.]/g, "")
  ) || 0;
  const wasteFeeCents = includeWasteFee ? Math.round(parsedWasteFee * 100) : 0;
  const totalAnnualCents = municipalTaxCents + wasteFeeCents;
  const totalAnnualChf = totalAnnualCents / 100;

  // Calcolo media del distretto per il confronto
  const districtMultipliers = MUNICIPALITIES.map((m) => {
    const dYear = getMunicipalityYearData(m, selectedYear ?? "2025");
    return subjectType === "PG" && m.has_differentiated_pg
      ? dYear.tax_multiplier_pg
      : dYear.tax_multiplier_pf;
  });
  const avgDistrictMultiplier =
    districtMultipliers.reduce((a, b) => a + b, 0) / districtMultipliers.length;
  const avgMunicipalTaxCents = Math.round((baseCents * avgDistrictMultiplier) / 100);
  const deltaFromAvgCents = municipalTaxCents - avgMunicipalTaxCents;
  const deltaFromAvgChf = deltaFromAvgCents / 100;

  // Posizione in classifica (1 = più vantaggioso / moltiplicatore più basso)
  const sortedMunicipalities = [...MUNICIPALITIES].sort((a, b) => {
    const dYearA = getMunicipalityYearData(a, selectedYear ?? "2025");
    const dYearB = getMunicipalityYearData(b, selectedYear ?? "2025");
    const multA =
      subjectType === "PG" && a.has_differentiated_pg
        ? dYearA.tax_multiplier_pg
        : dYearA.tax_multiplier_pf;
    const multB =
      subjectType === "PG" && b.has_differentiated_pg
        ? dYearB.tax_multiplier_pg
        : dYearB.tax_multiplier_pf;
    return multA - multB;
  });
  const rankIndex =
    sortedMunicipalities.findIndex((m) => m.ust_code === municipality.ust_code) + 1;

  // Preset rapidi imposta cantonale base
  const presets = [
    { label: "2'000 CHF", value: 2000, desc: "Reddito medio-basso / giovane" },
    { label: "4'000 CHF", value: 4000, desc: "Singolo / coppia medio Ticino" },
    { label: "7'500 CHF", value: 7500, desc: "Famiglia media con figli" },
    { label: "12'000 CHF", value: 12000, desc: "Reddito elevato / PMI" },
  ];

  return (
    <div
      className={cn(
        "ofl-card rounded-2xl p-4 @sm:p-6 min-w-0 shadow-xs @container",
        className
      )}
    >
      {/* Header Simulatore */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0F3854]/10 text-[#0F3854] shrink-0">
              <Calculator className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F3854]">
              Simulatore d&apos;Imposta Comunale (Art. 292 segg. LT)
            </span>
          </div>
          <h3 className="text-lg @sm:text-xl font-bold text-slate-900 mt-1 min-w-0 wrap-anywhere">
            Quanto incide il Moltiplicatore a {municipality.name}?
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Calcolo 100% in memoria nel tuo browser: zero trasmissione dati (tutela privacy nLPD).
          </p>
        </div>

        {/* Toggle PF / PG */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white/80 p-0.5 self-start sm:self-auto shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => setSubjectType("PF")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              subjectType === "PF"
                ? "bg-[#0F3854] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Privati (PF)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubjectType("PG")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              subjectType === "PG"
                ? "bg-[#0F3854] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Aziende (PG)</span>
          </button>
        </div>
      </div>

      {/* Avviso moltiplicatore differenziato */}
      {municipality.has_differentiated_pg && (
        <div className="mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap">
          <span>
            {municipality.name} adotta moltiplicatori differenziati:{" "}
            <strong>{yearData.tax_multiplier_pf}% per PF</strong> e{" "}
            <strong>{yearData.tax_multiplier_pg}% per PG</strong>.
          </span>
          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
            Attivo: {activeMultiplier}%
          </span>
        </div>
      )}

      {/* Controlli Input Imposta Cantonale Base */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor={inputId}
              className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <span>Imposta Cantonale Base (100% Cantonale)</span>
              <span
                className="text-slate-500 cursor-help"
                title="Dato riportato sulla tua ultima notifica di tassazione fiscale cantonale (voce 'Imposta cantonale base')"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </label>
            <span className="font-mono text-xs font-bold text-[#0F3854]">
              {baseChf.toLocaleString("de-CH")} CHF
            </span>
          </div>

          <div className="grid grid-cols-2 @sm:grid-cols-4 gap-2 mb-3">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setBaseChf(p.value)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left cursor-pointer min-w-0 ${
                  baseChf === p.value
                    ? "bg-[#0F3854] text-white border-[#0F3854] shadow-xs"
                    : "bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="font-mono font-bold tabular-nums whitespace-nowrap">{p.label}</div>
                <div className="text-[10px] opacity-80 truncate">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col @sm:flex-row items-stretch @sm:items-center gap-3">
            <input
              type="range"
              min="500"
              max="30000"
              step="250"
              value={baseChf}
              onChange={(e) => setBaseChf(Number(e.target.value))}
              aria-label="Regola imposta cantonale base"
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00A3C4]"
            />
            <div className="relative w-full @sm:w-36 shrink-0">
              <input
                id={inputId}
                type="number"
                min="0"
                max="500000"
                step="50"
                value={baseChf}
                onChange={(e) => setBaseChf(Math.max(0, Number(e.target.value)))}
                aria-label="Imposta cantonale base in CHF"
                className="w-full py-1.5 px-2.5 pr-10 rounded-lg text-base @sm:text-xs font-mono font-bold tabular-nums bg-white border border-slate-300 text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 pointer-events-none">
                CHF
              </span>
            </div>
          </div>
        </div>

        {/* Opzione Tassa Base Rifiuti */}
        {municipality.waste_base_fee && (
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={includeWasteFee}
              onChange={(e) => setIncludeWasteFee(e.target.checked)}
              className="rounded border-slate-300 text-[#00A3C4] focus:ring-[#00A3C4] cursor-pointer"
            />
            <span>
              Includi Tassa Base Rifiuti annua verificata (
              <strong className="text-slate-900 font-mono">
                {municipality.waste_base_fee}
              </strong>
              )
            </span>
          </label>
        )}
      </div>

      {/* Griglia Risultati Simulazione */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white/70 border border-slate-200/80 mb-4 min-w-0">
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-600 block truncate">
            Imposta Comunale Annua
          </span>
          <div className="font-mono text-xl @sm:text-2xl font-bold tabular-nums text-slate-900 mt-0.5 whitespace-nowrap">
            {totalAnnualChf.toLocaleString("de-CH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-xs font-normal">CHF</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
            ~ {municipalMonthlyChf.toFixed(2)} CHF / mese
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-600 block truncate">
            Scostamento vs Media Distretto
          </span>
          <div
            className={`font-mono text-lg @sm:text-xl font-bold tabular-nums flex items-center gap-1 mt-0.5 whitespace-nowrap ${
              deltaFromAvgChf < 0
                ? "text-emerald-700"
                : deltaFromAvgChf > 0
                ? "text-red-700"
                : "text-slate-700"
            }`}
          >
            {deltaFromAvgChf < 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : deltaFromAvgChf > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-700 shrink-0" />
            ) : null}
            <span className="whitespace-nowrap tabular-nums">
              {deltaFromAvgChf > 0 ? "+" : ""}
              {deltaFromAvgChf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              CHF
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {deltaFromAvgChf < 0
              ? "Più conveniente della media locarnese"
              : deltaFromAvgChf > 0
              ? "Superiore alla media locarnese"
              : "Esattamente in linea con la media"}
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-600 block truncate">
            Classifica Pressione Fiscale
          </span>
          <div className="font-mono text-lg @sm:text-xl font-bold tabular-nums text-[#0F3854] mt-0.5 whitespace-nowrap">
            {rankIndex}°{" "}
            <span className="text-xs text-slate-600 font-normal">su 19 Comuni</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Moltiplicatore {activeMultiplier}% ({subjectType})
          </div>
        </div>
      </div>

      {/* Nota Legale & Privacy-by-Design */}
      <div className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200/80 pt-3 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          Simulazione indicativa sulla sola imposta comunale ordinaria (art. 292 segg. LT).
          Esclude imposta cantonale, imposta immobiliare, imposta ecclesiastica e riparti intercomunali.
          Fanno fede unicamente le notifiche ufficiali di tassazione (art. 192 LOC).
        </p>
      </div>
    </div>
  );
}
