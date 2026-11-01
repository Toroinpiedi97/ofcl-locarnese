"use client";

import { useState, useId } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  Calculator,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Info,
  Building2,
  Users,
  Briefcase,
  HelpCircle,
  Coins,
} from "lucide-react";

export interface TaxImpactSimulatorProps {
  municipality: MunicipalityData;
  className?: string;
}

export function TaxImpactSimulator({
  municipality,
  className = "",
}: TaxImpactSimulatorProps) {
  const [subjectType, setSubjectType] = useState<"PF" | "PG">("PF");
  const [baseChf, setBaseChf] = useState<number>(4000);
  const [includeWasteFee, setIncludeWasteFee] = useState<boolean>(false);
  const inputId = useId();

  // Moltiplicatore attivo per il soggetto selezionato
  const activeMultiplier =
    subjectType === "PG" && municipality.has_differentiated_pg
      ? municipality.tax_multiplier_pg
      : municipality.tax_multiplier_pf;

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
  const districtMultipliers = MUNICIPALITIES.map((m) =>
    subjectType === "PG" && m.has_differentiated_pg
      ? m.tax_multiplier_pg
      : m.tax_multiplier_pf
  );
  const avgDistrictMultiplier =
    districtMultipliers.reduce((a, b) => a + b, 0) / districtMultipliers.length;
  const avgMunicipalTaxCents = Math.round((baseCents * avgDistrictMultiplier) / 100);
  const deltaFromAvgCents = municipalTaxCents - avgMunicipalTaxCents;
  const deltaFromAvgChf = deltaFromAvgCents / 100;

  // Posizione in classifica (1 = più vantaggioso / moltiplicatore più basso)
  const sortedMunicipalities = [...MUNICIPALITIES].sort((a, b) => {
    const multA =
      subjectType === "PG" && a.has_differentiated_pg
        ? a.tax_multiplier_pg
        : a.tax_multiplier_pf;
    const multB =
      subjectType === "PG" && b.has_differentiated_pg
        ? b.tax_multiplier_pg
        : b.tax_multiplier_pf;
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
      className={`bento-card p-6 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm ${className}`}
    >
      {/* Header Simulatore */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0F3854]/10 dark:bg-cyan-950/40 text-[#0F3854] dark:text-cyan-300">
              <Calculator className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F3854] dark:text-cyan-400">
              Simulatore d&apos;Imposta Comunale (Art. 292 segg. LT)
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            Quanto incide il Moltiplicatore a {municipality.name}?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calcolo 100% in memoria nel tuo browser: zero trasmissione dati (tutela privacy nLPD).
          </p>
        </div>

        {/* Toggle PF / PG */}
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubjectType("PF")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              subjectType === "PF"
                ? "bg-white dark:bg-slate-900 text-[#0F3854] dark:text-cyan-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                ? "bg-white dark:bg-slate-900 text-[#0F3854] dark:text-cyan-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Aziende (PG)</span>
          </button>
        </div>
      </div>

      {/* Avviso moltiplicatore differenziato */}
      {municipality.has_differentiated_pg && (
        <div className="mb-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>
            {municipality.name} adotta moltiplicatori differenziati:{" "}
            <strong>{municipality.tax_multiplier_pf}% per PF</strong> e{" "}
            <strong>{municipality.tax_multiplier_pg}% per PG</strong>.
          </span>
          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
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
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <span>Imposta Cantonale Base (100% Cantonale)</span>
              <span
                className="text-slate-400 cursor-help"
                title="Dato riportato sulla tua ultima notifica di tassazione fiscale cantonale (voce 'Imposta cantonale base')"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </label>
            <span className="font-mono text-xs font-bold text-[#0F3854] dark:text-cyan-400">
              {baseChf.toLocaleString("de-CH")} CHF
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setBaseChf(p.value)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left cursor-pointer ${
                  baseChf === p.value
                    ? "bg-[#0F3854] text-white border-[#0F3854] shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                }`}
              >
                <div className="font-mono font-bold tabular-nums">{p.label}</div>
                <div className="text-[10px] opacity-80 truncate">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="500"
              max="30000"
              step="250"
              value={baseChf}
              onChange={(e) => setBaseChf(Number(e.target.value))}
              aria-label="Regola imposta cantonale base"
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00A3C4]"
            />
            <div className="relative w-32 shrink-0">
              <input
                id={inputId}
                type="number"
                min="0"
                max="500000"
                step="50"
                value={baseChf}
                onChange={(e) => setBaseChf(Math.max(0, Number(e.target.value)))}
                aria-label="Imposta cantonale base in CHF"
                className="w-full py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold tabular-nums bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                CHF
              </span>
            </div>
          </div>
        </div>

        {/* Opzione Tassa Base Rifiuti */}
        {municipality.waste_base_fee && (
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">
            <input
              type="checkbox"
              checked={includeWasteFee}
              onChange={(e) => setIncludeWasteFee(e.target.checked)}
              className="rounded border-slate-300 text-[#00A3C4] focus:ring-[#00A3C4] cursor-pointer"
            />
            <span>
              Includi Tassa Base Rifiuti annua verificata (
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {municipality.waste_base_fee}
              </strong>
              )
            </span>
          </label>
        )}
      </div>

      {/* Griglia Risultati Simulazione */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 mb-4">
        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Imposta Comunale Annua
          </span>
          <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">
            {totalAnnualChf.toLocaleString("de-CH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-xs font-normal">CHF</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
            ~ {municipalMonthlyChf.toFixed(2)} CHF / mese
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Scostamento vs Media Distretto
          </span>
          <div
            className={`font-mono text-xl font-bold tabular-nums flex items-center gap-1 mt-0.5 ${
              deltaFromAvgChf < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : deltaFromAvgChf > 0
                ? "text-red-600 dark:text-red-400"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {deltaFromAvgChf < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : deltaFromAvgChf > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : null}
            <span>
              {deltaFromAvgChf > 0 ? "+" : ""}
              {deltaFromAvgChf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              CHF
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {deltaFromAvgChf < 0
              ? "Più conveniente della media locarnese"
              : deltaFromAvgChf > 0
              ? "Superiore alla media locarnese"
              : "Esattamente in linea con la media"}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Classifica Pressione Fiscale
          </span>
          <div className="font-mono text-xl font-bold tabular-nums text-[#0F3854] dark:text-cyan-400 mt-0.5">
            {rankIndex}°{" "}
            <span className="text-xs text-slate-500 font-normal">su 19 Comuni</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Moltiplicatore {activeMultiplier}% ({subjectType})
          </div>
        </div>
      </div>

      {/* Nota Legale & Privacy-by-Design */}
      <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-3 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
        <p>
          Simulazione indicativa sulla sola imposta comunale ordinaria (art. 292 segg. LT).
          Esclude imposta cantonale, imposta immobiliare, imposta ecclesiastica e riparti intercomunali.
          Fanno fede unicamente le notifiche ufficiali di tassazione (art. 192 LOC).
        </p>
      </div>
    </div>
  );
}
