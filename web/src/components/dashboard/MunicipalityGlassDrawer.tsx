"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Download,
  ArrowUpRight,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import type { MunicipalityData } from "@/data/municipalities";
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
      className="ofl-glass-drawer lg:sticky absolute top-0 right-0 bottom-0 w-full sm:w-[280px] rounded-l-2xl p-4 flex flex-col justify-between z-20 select-none overflow-y-auto space-y-4"
      aria-label={`${t.drawerTitle} ${municipality.name}`}
    >
      <div className="space-y-4">
        {/* Intestazione + X di chiusura */}
        <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-200/80">
          <div>
            <div className="text-[10px] font-mono font-bold text-sky-800 uppercase tracking-wider">
              SCHEDA ANALITICA MCA2
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 truncate">
              {municipality.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi pannello per vedere tutta la tabella"
            title="Chiudi pannello per vedere tutta la tabella"
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Civico & Dati Sintetici */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-9 rounded-b-xl rounded-t-md bg-[#0F3854] text-white flex flex-col items-center justify-between p-0.5 shrink-0">
              <span className="font-mono text-[8px] font-bold">+ TI</span>
              <span className="font-mono text-[9px] font-bold">{municipality.ust_code}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Circolo di {municipality.circle}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {municipality.population.toLocaleString("de-CH")} ab.
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-extrabold text-[#0F3854]">
              {municipality.tax_multiplier_pf}%
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Moltiplicatore</div>
          </div>
        </div>

        {/* Banner sorpasso crediti se attivo ex Art. 15 LOC */}
        {hasOverruns && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs space-y-1">
            <div className="flex items-center gap-1 font-bold text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>S01 SORPASSO CREDITI</span>
            </div>
            <p className="text-[11px] text-red-900 leading-tight">
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

        {/* Indicatori Finanziari SEL Cantone Ticino */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Indicatori SEL (Sezione Enti Locali)</span>
            <span className="text-emerald-700 font-bold">{municipality.summary_30s.sel_conformity}</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded-lg bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Autofinanziamento</span>
              <span className="font-mono font-bold text-emerald-700">
                CHF {(municipality.summary_30s.autofinanziamento_chf / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Debito Netto p.c.</span>
              <span className="font-mono font-bold text-slate-900">
                CHF {Math.round(municipality.summary_30s.debito_netto_pc_chf).toLocaleString("de-CH")}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600">Investimenti Netti</span>
              <span className="font-mono font-bold text-slate-900">
                CHF {(municipality.summary_30s.investimenti_netti_chf / 1_000_000).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Micro-Cruscotto a 8 segmenti SEL */}
        <div className="pt-1 border-t border-slate-200/60">
          <IndicatorsSelBar
            scoreConform={municipality.summary_30s.sel_conformity}
            compact
          />
        </div>

        {/* Checklist Contabile MCA2 Ufficiale */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Verifica Contabile MCA2
          </div>
          <ul className="space-y-1 text-xs font-medium text-slate-700">
            <li className="flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dati MCA2 completi e quadrati</span>
            </li>
            <li className="flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rendiconto finanziario validato</span>
            </li>
            <li className="flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Allegato f (Crediti) verificato</span>
            </li>
          </ul>
        </div>

        {/* Azioni Tattili: Scheda Completa & Scarica CSV */}
        <div className="space-y-2 pt-1">
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
            className="ofl-btn-frost w-full rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span>{t.drawerDownload}</span>
          </button>
        </div>
      </div>

      {/* Sezione Basso: Ticket e Segnalazioni */}
      <div className="pt-3 border-t border-slate-200/80">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
          <span className="flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.drawerTicketsTitle}</span>
          </span>
          <CultPopoverTicket
            initialUstCode={municipality.ust_code}
            triggerButton={
              <button
                type="button"
                className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
              >
                + Apri Segnalazione
              </button>
            }
          />
        </div>

        <CultExpandableTicketCard municipalityName={municipality.name} />
      </div>
    </aside>
  );
}
