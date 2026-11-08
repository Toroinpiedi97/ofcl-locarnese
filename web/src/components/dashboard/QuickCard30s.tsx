"use client";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  PiggyBank,
  Wallet,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
import { getMunicipalityYearData, getMunicipalitySelIndicators } from "@/data/municipalities";
import { IndicatorsSelBar } from "./IndicatorsSelBar";
import { cn } from "@/lib/utils";

export interface QuickCard30sProps {
  municipality: MunicipalityData;
  year?: number;
  selectedYear?: string;
  isDetailPage?: boolean;
  className?: string;
}

export function QuickCard30s({
  municipality,
  year,
  selectedYear,
  isDetailPage = false,
  className,
}: QuickCard30sProps) {
  const activeYear = selectedYear ?? (year ? String(year) : "2025");
  const yearData = getMunicipalityYearData(municipality, activeYear);
  const isAvanzo = yearData.risultato_ordinario_chf >= 0;
  const selIndicators = getMunicipalitySelIndicators(municipality);

  return (
    <div
      className={cn(
        "ofl-card rounded-2xl p-4 @sm:p-6 flex flex-col justify-between h-full min-w-0 @container",
        className
      )}
    >
      {/* Header Comune & Titolo dei 30 Secondi */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-semibold">
                UST {municipality.ust_code}
              </span>
              <span className="text-xs font-medium text-slate-500 truncate">
                Circolo di {municipality.circle} · Anno {activeYear}
              </span>
            </div>
            <h3
              title={municipality.name}
              className="text-xl @sm:text-2xl font-bold tracking-tight text-slate-900 mt-1 min-w-0 line-clamp-2 wrap-anywhere"
            >
              {municipality.name}
            </h3>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Moltiplicatore {activeYear}
            </span>
            <div className="font-mono text-xl @sm:text-2xl font-black tabular-nums whitespace-nowrap text-[#0F3854]">
              {yearData.tax_multiplier_pf}%
            </div>
            {municipality.has_differentiated_pg && (
              <span className="text-[10px] font-mono text-amber-800 block">
                PG: {yearData.tax_multiplier_pg}%
              </span>
            )}
          </div>
        </div>

        {/* 4 Grandi Cifre Contabili al centesimo (0.01 CHF) */}
        <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3 my-4">
          {/* 1. Risultato Ordinario (Avanzo / Disavanzo) */}
          <div className="p-3 @sm:p-3.5 rounded-xl bg-white/75 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="flex items-center gap-1.5 font-medium truncate">
                {isAvanzo ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
                <span className="truncate">Risultato Ordinario</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-500 underline decoration-dotted cursor-help shrink-0 ml-1"
                title="Citazione: Pagina 5 del Conto Economico MCA2 (CE)"
              >
                CE p.5 ↗
              </span>
            </div>
            <div
              className={`font-mono text-base @sm:text-lg font-bold tabular-nums whitespace-nowrap ${
                isAvanzo ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {isAvanzo ? "+" : ""}
              {yearData.risultato_ordinario_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {isAvanzo ? "Avanzo d'esercizio" : "Disavanzo d'esercizio"}
            </div>
          </div>

          {/* 2. Autofinanziamento Indiretto */}
          <div className="p-3 @sm:p-3.5 rounded-xl bg-white/75 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <PiggyBank className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="truncate">Autofinanziamento</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-500 underline decoration-dotted cursor-help shrink-0 ml-1"
                title="Citazione: Prospetto del Flusso di Finanziamento MCA2 (CF)"
              >
                CF p.5 ↗
              </span>
            </div>
            <div className="font-mono text-base @sm:text-lg font-bold tabular-nums whitespace-nowrap text-slate-900">
              {yearData.autofinanziamento_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">Risorse proprie generate</div>
          </div>

          {/* 3. Investimenti Netti BA */}
          <div className="p-3 @sm:p-3.5 rounded-xl bg-white/75 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Investimenti Netti</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-500 underline decoration-dotted cursor-help shrink-0 ml-1"
                title="Citazione: Conto degli Investimenti MCA2 (CI, Onere netto)"
              >
                CI p.5 ↗
              </span>
            </div>
            <div className="font-mono text-base @sm:text-lg font-bold tabular-nums whitespace-nowrap text-slate-900">
              {yearData.investimenti_netti_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">Beni amministrativi (BA)</div>
          </div>

          {/* 4. Debito Pubblico Netto pro Capite */}
          <div className="p-3 @sm:p-3.5 rounded-xl bg-white/75 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Debito Netto p.c.</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-500 underline decoration-dotted cursor-help shrink-0 ml-1"
                title="Citazione: Bilancio MCA2 (Capitale terzi - Beni patrimoniali) / Abitanti"
              >
                BIL/ab ↗
              </span>
            </div>
            <div className="font-mono text-base @sm:text-lg font-bold tabular-nums whitespace-nowrap text-slate-900">
              {yearData.debito_netto_pc_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF/ab</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              Popolazione: {yearData.population.toLocaleString("de-CH")} ab.
            </div>
          </div>
        </div>

        {/* Micro-Cruscotto a 8 segmenti SEL */}
        <div className="pt-2">
          <IndicatorsSelBar
            indicators={selIndicators}
            scoreConform={yearData.sel_conformity}
          />
        </div>
      </div>

      {/* Footer Scheda & Azione Principale */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] truncate">
            Atto Ufficiale: <strong className="text-slate-800">{yearData.latest_mm_reference}</strong>
          </span>
        </div>

        {isDetailPage ? (
          <Link
            href={`/comuni/${municipality.slug}/crediti`}
            className="ofl-btn-frost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <span>Opere & Allegato f</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href={`/comuni/${municipality.slug}`}
            className="ofl-btn-blue inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
          >
            <span>Apri Scheda Completa</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
