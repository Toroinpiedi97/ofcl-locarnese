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
import { IndicatorsSelBar } from "./IndicatorsSelBar";

export interface QuickCard30sProps {
  municipality: MunicipalityData;
  year?: number;
}

export function QuickCard30s({ municipality }: QuickCard30sProps) {
  const { summary_30s } = municipality;

  const isAvanzo = summary_30s.risultato_ordinario_chf >= 0;

  return (
    <div className="bento-card p-6 flex flex-col justify-between h-full bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur shadow-sm">
      {/* Header Comune & Titolo dei 30 Secondi */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                UST {municipality.ust_code}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Circolo di {municipality.circle}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {municipality.name}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Moltiplicatore 2026
            </span>
            <div className="font-mono text-xl font-bold tabular-nums text-[#0F3854] dark:text-cyan-400">
              {municipality.tax_multiplier_pf}%
            </div>
            {municipality.has_differentiated_pg && (
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-300 block">
                PG: {municipality.tax_multiplier_pg}%
              </span>
            )}
          </div>
        </div>

        {/* 4 Grandi Cifre Contabili al centesimo (0.01 CHF) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-4">
          {/* 1. Risultato Ordinario (Avanzo / Disavanzo) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                {isAvanzo ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                )}
                <span>Risultato Ordinario</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-600 dark:text-slate-400 underline decoration-dotted cursor-help"
                title="Citazione: Pagina 5 del Conto Economico MCA2 (CE)"
              >
                CE p.5 ↗
              </span>
            </div>
            <div
              className={`font-mono text-lg font-bold tabular-nums ${
                isAvanzo ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
              }`}
            >
              {isAvanzo ? "+" : ""}
              {summary_30s.risultato_ordinario_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
              {isAvanzo ? "Avanzo d'esercizio" : "Disavanzo d'esercizio"}
            </div>
          </div>

          {/* 2. Autofinanziamento Indiretto */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <PiggyBank className="w-3.5 h-3.5 text-cyan-600" />
                <span>Autofinanziamento</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-600 dark:text-slate-400 underline decoration-dotted cursor-help"
                title="Citazione: Prospetto del Flusso di Finanziamento MCA2 (CF)"
              >
                CF p.5 ↗
              </span>
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {summary_30s.autofinanziamento_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Risorse proprie generate</div>
          </div>

          {/* 3. Investimenti Netti BA */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Investimenti Netti</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-600 dark:text-slate-400 underline decoration-dotted cursor-help"
                title="Citazione: Conto degli Investimenti MCA2 (CI, Onere netto)"
              >
                CI p.5 ↗
              </span>
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {summary_30s.investimenti_netti_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF</span>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Beni amministrativi (BA)</div>
          </div>

          {/* 4. Debito Pubblico Netto pro Capite */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>Debito Netto p.c.</span>
              </span>
              <span
                className="text-[10px] font-mono text-slate-600 dark:text-slate-400 underline decoration-dotted cursor-help"
                title="Citazione: Bilancio MCA2 (Capitale terzi - Beni patrimoniali) / Abitanti"
              >
                BIL/ab ↗
              </span>
            </div>
            <div className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {summary_30s.debito_netto_pc_chf.toLocaleString("de-CH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-xs font-normal">CHF/ab</span>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
              Popolazione: {municipality.population.toLocaleString("de-CH")} ab.
            </div>
          </div>
        </div>

        {/* Micro-Cruscotto a 8 segmenti SEL */}
        <div className="pt-2">
          <IndicatorsSelBar scoreConform={summary_30s.sel_conformity} />
        </div>
      </div>

      {/* Footer Scheda & Azione Principale */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px]">
            Atto Ufficiale: <strong className="text-slate-700 dark:text-slate-300">{summary_30s.latest_mm_reference}</strong>
          </span>
        </div>

        <Link
          href={`/comuni/${municipality.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F3854] hover:bg-[#00A3C4] text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
        >
          <span>Apri Scheda Completa</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
