"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { INVESTMENT_CREDITS, type InvestmentCredit } from "@/data/credits";
import { MUNICIPALITIES } from "@/data/municipalities";
import { CreditProgressBarChart } from "@/components/charts";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Coins,
  FileText,
  Filter,
  HelpCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

export default function DistrictCreditsPage() {
  const [filterOverrunsOnly, setFilterOverrunsOnly] = useState<boolean>(false);
  const [selectedUst, setSelectedUst] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const totalVoted = INVESTMENT_CREDITS.reduce((acc, c) => acc + c.voted_credit_chf, 0);
  const totalSpent = INVESTMENT_CREDITS.reduce((acc, c) => acc + c.spent_total_chf, 0);
  const totalResidual = INVESTMENT_CREDITS.reduce((acc, c) => acc + c.residual_chf, 0);
  const overrunsList = INVESTMENT_CREDITS.filter((c) => c.is_overrun);
  const totalOverrunAmount = overrunsList.reduce(
    (acc, c) => acc + Math.abs(c.residual_chf),
    0
  );

  const filteredCredits = useMemo(() => {
    return INVESTMENT_CREDITS.filter((c) => {
      if (filterOverrunsOnly && !c.is_overrun) return false;
      if (selectedUst !== "ALL" && c.ust_code !== selectedUst) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        return (
          c.description.toLowerCase().includes(q) ||
          c.account_code.toLowerCase().includes(q) ||
          c.municipality_name.toLowerCase().includes(q) ||
          c.mm_reference.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterOverrunsOnly, selectedUst, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Pagina */}
      <header className="ofl-card p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e232b] text-white text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Controllo Opere Pubbliche & Crediti d&apos;Opera (Allegato f MCA2)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Tracker Crediti d&apos;Investimento (Art. 15 LOC)
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
              Monitoraggio dello stato di avanzamento delle opere deliberate dai Consigli Comunali,
              spese sostenute e rilevazione tempestiva dei sorpassi di spesa che richiedono credito suppletorio.
            </p>
          </div>
        </div>

        {/* Griglia 4 KPI Distrettuali Opere */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6">
          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Crediti Votati Complessivi
            </span>
            <div className="font-mono text-xl sm:text-2xl font-black tabular-nums text-slate-900 mt-1">
              {(totalVoted / 1_000_000).toFixed(2)} M
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              CHF deliberati dai CC
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Spesa Cumulata Totale
            </span>
            <div className="font-mono text-xl sm:text-2xl font-black tabular-nums text-[#0F3854] mt-1">
              {(totalSpent / 1_000_000).toFixed(2)} M
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              CHF consuntivati
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Residuo Totale Disponibile
            </span>
            <div className="font-mono text-xl sm:text-2xl font-black tabular-nums text-emerald-700 mt-1">
              {(totalResidual / 1_000_000).toFixed(2)} M
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              CHF ancora a disposizione
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/70 border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Sorpassi Rilevati (S01)
              </span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-red-100 text-red-800">
                {overrunsList.length} opere
              </span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black tabular-nums text-red-700 mt-1">
              -{(totalOverrunAmount / 1_000).toFixed(1)}k
            </div>
            <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
              CHF da sanare con suppletorio
            </span>
          </div>
        </div>
      </header>

      {/* Grafico Nivo Avanzamento Crediti Principali */}
      <section aria-labelledby="credits-chart-title" className="ofl-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 id="credits-chart-title" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Confronto Grafico: Credito Deliberato vs Spesa Cumulata
          </h2>
          <span className="text-[10px] font-mono text-slate-600 font-medium">Top 5 Opere per Rilevanza</span>
        </div>
        <CreditProgressBarChart credits={filteredCredits} height={200} />
      </section>

      {/* Barra di Controllo Filtri */}
      <div className="ofl-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterOverrunsOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              filterOverrunsOnly
                ? "bg-red-600 text-white border-red-600 shadow-xs"
                : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solo Sorpassi (Art. 15 LOC)</span>
            {overrunsList.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  filterOverrunsOnly ? "bg-red-800 text-white" : "bg-red-100 text-red-800"
                }`}
              >
                {overrunsList.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedUst}
              onChange={(e) =>
                setSelectedUst(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              className="py-1.5 px-2.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-600 cursor-pointer"
            >
              <option value="ALL">Tutti i Comuni del Distretto</option>
              {MUNICIPALITIES.map((m) => (
                <option key={m.ust_code} value={m.ust_code}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca opera o conto..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
          />
        </div>
      </div>

      {/* Lista Opere Pubbliche e Stato Avanzamento */}
      <div className="space-y-4">
        {filteredCredits.map((credit) => {
          const isOverrun = credit.is_overrun;
          const pct = credit.pct_used;

          let barColor = "bg-emerald-600";
          if (isOverrun) {
            barColor = "bg-red-600";
          } else if (pct >= 90) {
            barColor = "bg-amber-600";
          }

          return (
            <div
              key={credit.id}
              className={`ofl-card p-5 border transition-all ${
                isOverrun
                  ? "border-red-400 shadow-xs"
                  : "border-slate-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/comuni/${credit.municipality_slug}`}
                      className="font-bold text-xs text-[#0F3854] hover:underline"
                    >
                      {credit.municipality_name}
                    </Link>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-900/10 text-slate-800 font-medium">
                      Conto: {credit.account_code}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {credit.mm_reference}
                    </span>
                    {credit.vote_date && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Deliberato {credit.vote_date}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {credit.description}
                  </h3>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Credito Votato
                    </span>
                    <div className="font-mono text-base font-bold tabular-nums text-slate-900">
                      {credit.voted_credit_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      CHF
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {isOverrun ? "Sorpasso (Residuo < 0)" : "Credito Residuo"}
                    </span>
                    <div
                      className={`font-mono text-base font-bold tabular-nums ${
                        isOverrun ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {credit.residual_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      CHF
                    </div>
                  </div>

                  {isOverrun ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-red-100 border border-red-300 text-red-800 shadow-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>S01 SORPASSO +{(pct - 100).toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>In Regola</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Barra Avanzamento Spesa */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-slate-600">
                    Speso a oggi:{" "}
                    <strong className="text-slate-900 font-bold">
                      {credit.spent_total_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      CHF
                    </strong>{" "}
                    (di cui{" "}
                    {credit.spent_year_chf.toLocaleString("de-CH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    CHF nell&apos;anno {credit.fiscal_year})
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isOverrun ? "text-red-700" : "text-slate-800"
                    }`}
                  >
                    {pct.toFixed(1)}% del credito
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-300 overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>

              {/* Footer Riga con Fonte Ufficiale */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Allegato f (Controllo Crediti) · Pag. {credit.page_ref}</span>
                </span>

                <Link
                  href={`/segnala?ust=${credit.ust_code}&comune=${credit.municipality_slug}&metrica=${encodeURIComponent(
                    credit.description
                  )}`}
                  className="hover:text-slate-900 underline decoration-dotted transition-colors"
                >
                  Segnala una discrepanza su quest&apos;opera
                </Link>
              </div>
            </div>
          );
        })}

        {filteredCredits.length === 0 && (
          <div className="p-12 text-center ofl-card border-dashed">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900">
              Nessuna opera trovata con i filtri correnti
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Prova a disattivare il filtro &quot;Solo Sorpassi&quot; o a modificare il testo di ricerca.
            </p>
          </div>
        )}
      </div>

      {/* Quadro Giuridico Art. 15 LOC */}
      <div className="ofl-card p-5 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <ShieldCheck className="w-4 h-4 text-cyan-700" />
          <span>Cosa prevede la Legge Organica Comunale (Art. 15 LOC)?</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          Se durante l&apos;esecuzione di un&apos;opera pubblica si prevede che la spesa superi il credito
          votato dal Consiglio Comunale, il Municipio ha l&apos;obbligo legale di sottoporre preventivamente
          una richiesta di credito suppletorio. A consuntivo, ogni credito con residuo negativo viene rilevato
          dalla Sezione degli enti locali (SEL) e segnalato alla Commissione della Gestione.
        </p>
      </div>
    </div>
  );
}
