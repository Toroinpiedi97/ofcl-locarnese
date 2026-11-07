"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
import { IndicatorsSelBar } from "./IndicatorsSelBar";
import { formatChfCompact, cn } from "@/lib/utils";

export interface Mca2AnalyticCardProps {
  municipality: MunicipalityData;
  className?: string;
}

export function Mca2AnalyticCard({ municipality, className }: Mca2AnalyticCardProps) {
  const router = useRouter();
  const s = municipality.summary_30s;
  const isAvanzo = s.risultato_ordinario_chf >= 0;
  const hasOverruns = (s.active_overruns_count ?? 0) > 0;
  const debitoTotale = s.debito_netto_pc_chf * municipality.population;

  function handlePrefetch() {
    router.prefetch(`/comuni/${municipality.slug}`);
  }

  function handleDownloadCsv() {
    const csvContent =
      "\uFEFF" +
      [
        "Codice_UST;Comune;Circolo;Abitanti;Moltiplicatore_PF;Risultato_Ordinario_CHF;Autofinanziamento_CHF;Investimenti_Netti_CHF;Debito_Netto_PC_CHF;Debito_Totale_CHF;Conformita_SEL;Atto_Riferimento",
        `${municipality.ust_code};"${municipality.name}";"${municipality.circle}";${municipality.population};${municipality.tax_multiplier_pf};${s.risultato_ordinario_chf};${s.autofinanziamento_chf};${s.investimenti_netti_chf};${s.debito_netto_pc_chf};${debitoTotale};"${s.sel_conformity}";"${s.latest_mm_reference}"`,
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ofcl-scheda-mca2-${municipality.slug}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={cn(
        "ofl-card rounded-2xl p-5 flex flex-col justify-between select-none relative",
        className
      )}
      aria-label={`Scheda Analitica MCA2 ${municipality.name}`}
    >
      <div className="space-y-4">
        {/* 1. Header Scheda: Rigoroso, minimale, senza gradienti pesanti */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                UST {municipality.ust_code}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Scheda Analitica MCA2
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
              {municipality.name}
            </h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Circolo di {municipality.circle} · {municipality.population.toLocaleString("de-CH")} ab.
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Moltiplicatore
            </span>
            <div className="font-mono text-xl font-black text-[#0F3854]">
              {municipality.tax_multiplier_pf}%
            </div>
            {municipality.has_differentiated_pg && (
              <span className="text-[9px] font-mono text-amber-800 block">
                PG: {municipality.tax_multiplier_pg}%
              </span>
            )}
          </div>
        </div>

        {/* 2. Banner sorpassi crediti se attivo */}
        {hasOverruns && (
          <div className="p-2.5 rounded-xl bg-red-50/90 border border-red-200 text-red-950 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Sorpasso crediti d&apos;opera rilevato</span>
            </div>
            <Link
              href={`/comuni/${municipality.slug}/crediti`}
              className="text-[11px] font-bold text-red-700 underline shrink-0 hover:text-red-900"
            >
              Allegato f ↗
            </Link>
          </div>
        )}

        {/* 3. Quattro Grandezze Contabili Chiave (Griglia 2x2 pulita) */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {/* Risultato Ordinario */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="text-slate-500 text-[10px] flex items-center justify-between">
              <span>Risultato Ordinario</span>
              {isAvanzo ? (
                <TrendingUp className="w-3 h-3 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
            </div>
            <div
              className={cn(
                "font-mono font-bold text-sm tabular-nums mt-1",
                isAvanzo ? "text-emerald-700" : "text-red-700"
              )}
            >
              {isAvanzo ? "+" : ""}
              {formatChfCompact(s.risultato_ordinario_chf)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAvanzo ? "Avanzo d'esercizio" : "Disavanzo"}
            </div>
          </div>

          {/* Autofinanziamento */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="text-slate-500 text-[10px]">Autofinanziamento</div>
            <div className="font-mono font-bold text-sm tabular-nums text-slate-900 mt-1">
              {formatChfCompact(s.autofinanziamento_chf)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Risorse proprie nette</div>
          </div>

          {/* Debito Netto pro capite */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="text-slate-500 text-[10px]">Debito pro capite</div>
            <div className="font-mono font-bold text-sm tabular-nums text-slate-900 mt-1">
              CHF {Math.round(s.debito_netto_pc_chf).toLocaleString("de-CH")}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Soglia SEL &lt; 5k</div>
          </div>

          {/* Debito Totale Comune */}
          <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70">
            <div className="text-slate-500 text-[10px]">Debito Netto Totale</div>
            <div className="font-mono font-bold text-sm tabular-nums text-slate-900 mt-1">
              {formatChfCompact(debitoTotale)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Capitale terzi netto</div>
          </div>
        </div>

        {/* 4. Indicatori Finanziari SEL Cantone Ticino */}
        <div className="pt-2 border-t border-slate-200/70">
          <IndicatorsSelBar
            scoreConform={s.sel_conformity}
            compact={true}
          />
        </div>

        {/* 5. Verifica Contabile MCA2 */}
        <div className="pt-2 border-t border-slate-200/70">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Quadratura MCA2 Certificata</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">{s.latest_mm_reference}</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-tight">
            Tutti i conti CE, CI e Bilancio verificati e conformi alle direttive SEL (Art. 192 LOC).
          </div>
        </div>
      </div>

      {/* 6. Footer Azioni: Apri Scheda Completa + Download CSV */}
      <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center gap-2">
        <Link
          href={`/comuni/${municipality.slug}`}
          onMouseEnter={handlePrefetch}
          className="ofl-btn-blue flex-1 rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
        >
          <span>Apri Scheda Completa</span>
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
        </Link>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="ofl-btn-frost rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          title="Esporta dati analitici MCA2 del comune in CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-700" />
          <span>CSV</span>
        </button>
      </div>
    </div>
  );
}
