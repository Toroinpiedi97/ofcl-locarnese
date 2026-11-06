"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Download,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
import { formatChfExact } from "@/lib/utils";
import { IndicatorsSelBar } from "./IndicatorsSelBar";
import { CultExpandableTicketCard } from "@/components/cult/CultExpandableTicketCard";
import { CultPopoverTicket } from "@/components/cult/CultPopoverTicket";
import { useCivicLang } from "@/lib/i18n-civic";

interface MunicipalityGlassDrawerProps {
  municipality: MunicipalityData;
  onClose: () => void;
  open: boolean;
}

export function MunicipalityGlassDrawer({
  municipality,
  onClose,
  open,
}: MunicipalityGlassDrawerProps) {
  const router = useRouter();
  const { t } = useCivicLang();
  const hasOverruns = (municipality.summary_30s.active_overruns_count ?? 0) > 0;

  if (!open) return null;

  function handlePrefetch() {
    router.prefetch(`/comuni/${municipality.slug}`);
  }

  function handleDownloadCsv() {
    const s = municipality.summary_30s;
    const csvContent =
      "\uFEFF" +
      [
        "Codice_UST;Comune;Circolo;Abitanti;Moltiplicatore_PF;Risultato_Ordinario_CHF;Autofinanziamento_CHF;Investimenti_Netti_CHF;Debito_Netto_PC_CHF;Conformita_SEL;Atto_Rif",
        `${municipality.ust_code};"${municipality.name}";"${municipality.circle}";${municipality.population};${municipality.tax_multiplier_pf};${s.risultato_ordinario_chf};${s.autofinanziamento_chf};${s.investimenti_netti_chf};${s.debito_netto_pc_chf};"${s.sel_conformity}";"${s.latest_mm_reference}"`,
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ofcl-comune-${municipality.slug}-mca2.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <aside
      className="ofl-glass-drawer lg:sticky absolute top-0 right-0 bottom-0 w-full sm:w-[230px] rounded-l-2xl p-3.5 flex flex-col justify-between z-20 select-none overflow-y-auto"
      aria-label={`${t.drawerTitle} ${municipality.name}`}
    >
      <div>
        {/* Intestazione + X di chiusura */}
        <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-300/40">
          <h3 className="text-xs font-bold text-slate-900 truncate">
            {municipality.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Chiudi pannello per vedere tutta la tabella"
            className="w-6 h-6 rounded-full hover:bg-slate-400/30 flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Badge Civico Istituzionale centrato */}
        <div className="flex flex-col items-center my-3">
          <div className="w-14 h-16 rounded-b-3xl rounded-t-lg bg-gradient-to-b from-white to-slate-200 p-1 shadow-md border border-white flex flex-col items-center justify-between">
            <div className="w-full rounded-t bg-[#0F3854] text-white text-center font-mono text-[11px] font-extrabold py-0.5">
              UST {municipality.ust_code}
            </div>
            <div className="text-xs font-extrabold text-slate-900 tracking-tight font-mono">
              {municipality.tax_multiplier_pf}%
            </div>
            <div className="w-full h-2.5 rounded-b-2xl bg-gradient-to-r from-sky-600 to-cyan-500" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1">
            Circolo di {municipality.circle}
          </span>
        </div>

        {/* Banner sorpasso crediti se attivo ex Art. 15 LOC */}
        {hasOverruns && (
          <div className="mb-3 p-2 rounded-xl bg-red-100/90 border border-red-300 text-red-950 text-[11px] space-y-1">
            <div className="flex items-center gap-1 font-bold text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>S01 SORPASSO</span>
            </div>
            <p className="text-[10px] text-red-900 leading-tight">
              {municipality.slug === "brione-sopra-minusio"
                ? "Sistemazione tornante Jacomello (-16'130.65 CHF)"
                : "Rilevata spesa superiore al credito votato."}
            </p>
            <Link
              href={`/comuni/${municipality.slug}/crediti`}
              className="text-[10px] font-bold text-red-700 underline block pt-0.5"
            >
              Vedi Allegato f ↗
            </Link>
          </div>
        )}

        {/* Checklist a 5 punti ufficiale */}
        <ul className="space-y-1.5 text-xs font-semibold text-slate-800 my-3">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Dati MCA2 completi</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Rendiconto finanziario</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Investimenti e cantieri</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Debito pro capite</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Dati aperti (open data)</span>
          </li>
        </ul>

        {/* Micro-Cruscotto a 8 segmenti SEL */}
        <div className="my-3 pt-2 border-t border-slate-300/40">
          <IndicatorsSelBar
            scoreConform={municipality.summary_30s.sel_conformity}
            compact
          />
        </div>

        {/* Azioni Tattili: Scheda Completa & Scarica CSV */}
        <div className="space-y-1.5 mt-3">
          <Link
            href={`/comuni/${municipality.slug}`}
            onMouseEnter={handlePrefetch}
            className="ofl-btn-blue w-full rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
          >
            <span>{t.drawerOpenFull}</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </Link>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="ofl-btn-frost w-full rounded-xl py-1.5 px-3 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3 h-3 text-slate-700" />
            <span>{t.drawerDownload}</span>
          </button>
        </div>
      </div>

      {/* Sezione Basso-Dx: Ticket e Segnalazioni */}
      <div className="pt-3 mt-3 border-t border-slate-300/40">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center rounded bg-amber-400 px-1 py-0.5 text-slate-900 font-mono text-[10px]">
              🎫
            </span>
            <span>{t.drawerTicketsTitle}</span>
          </span>
          <CultPopoverTicket
            initialUstCode={municipality.ust_code}
            triggerButton={
              <button
                type="button"
                className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
              >
                {t.drawerAddTicket}
              </button>
            }
          />
        </div>

        <CultExpandableTicketCard municipalityName={municipality.name} />
      </div>
    </aside>
  );
}
