"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  X,
} from "lucide-react";

export interface QueueItem {
  id: string;
  ust_code: number;
  municipality_name: string;
  document_title: string;
  mm_number: string | null;
  statement_year: number;
  statement_type: "CONSUNTIVO" | "PREVENTIVO" | "CREDITO";
  status: "NEEDS_REVIEW" | "VALIDATED" | "APPROVED" | "PUBLISHED";
  blocking_count: number;
  warning_count: number;
  confidence: number;
  has_overrun: boolean;
  contains_personal_data: boolean;
  created_at: string;
}

export default function QueueTableClient({
  initialItems,
}: {
  initialItems: QueueItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "NEEDS_REVIEW" | "VALIDATED" | "PUBLISHED" | "OVERRUN"
  >("ALL");

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Filtro per stato
      if (statusFilter === "NEEDS_REVIEW" && item.status !== "NEEDS_REVIEW") {
        return false;
      }
      if (statusFilter === "VALIDATED" && item.status !== "VALIDATED") {
        return false;
      }
      if (
        statusFilter === "PUBLISHED" &&
        item.status !== "PUBLISHED" &&
        item.status !== "APPROVED"
      ) {
        return false;
      }
      if (statusFilter === "OVERRUN" && !item.has_overrun) {
        return false;
      }

      // Ricerca testuale
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.municipality_name.toLowerCase().includes(q);
        const matchesTitle = item.document_title.toLowerCase().includes(q);
        const matchesMm = item.mm_number?.toLowerCase().includes(q);
        const matchesYear = String(item.statement_year).includes(q);
        const matchesUst = String(item.ust_code).includes(q);
        return matchesName || matchesTitle || matchesMm || matchesYear || matchesUst;
      }

      return true;
    });
  }, [initialItems, statusFilter, searchQuery]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Barra Ricerca & Filtri Interattivi */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filtri a schede */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            Tutti ({initialItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("NEEDS_REVIEW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === "NEEDS_REVIEW"
                ? "bg-amber-950 text-amber-300 border border-amber-500/40 font-semibold"
                : "text-slate-400 hover:text-amber-300 hover:bg-slate-800/50"
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Da Revisionare</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("VALIDATED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === "VALIDATED"
                ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold"
                : "text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50"
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>Convalidati</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("OVERRUN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === "OVERRUN"
                ? "bg-red-950 text-red-300 border border-red-500/40 font-semibold"
                : "text-slate-400 hover:text-red-300 hover:bg-slate-800/50"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>Sorpassi S01</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold"
                : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/50"
            }`}
          >
            <FileText className="w-3 h-3 text-emerald-400" />
            <span>Pubblicati</span>
          </button>
        </div>

        {/* Input di ricerca */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca comune, MM o anno..."
            className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
              title="Cancella ricerca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabella Fascicoli */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Comune / Atto</th>
              <th className="py-3 px-4">Anno / Tipo</th>
              <th className="py-3 px-4">Stato Pipeline</th>
              <th className="py-3 px-4 text-center">Controlli MCA2</th>
              <th className="py-3 px-4 text-center">Confidenza</th>
              <th className="py-3 px-4 text-center">Allerte</th>
              <th className="py-3 px-4 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-medium text-sm text-slate-300">Nessun fascicolo trovato</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Prova a modificare il filtro di stato o i termini di ricerca.
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-white flex items-center gap-2">
                      <span>{item.municipality_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        UST {item.ust_code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                      {item.document_title}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono text-xs text-slate-200">{item.statement_year}</div>
                    <div className="text-[11px] text-cyan-400/80 font-medium">{item.statement_type}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.status === "NEEDS_REVIEW" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-500/40 text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>NEEDS_REVIEW</span>
                      </span>
                    )}
                    {item.status === "VALIDATED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>VALIDATED</span>
                      </span>
                    )}
                    {(item.status === "APPROVED" || item.status === "PUBLISHED") && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{item.status}</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {item.blocking_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        {item.blocking_count} Blocchi
                      </span>
                    ) : item.warning_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                        {item.warning_count} Avvisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        12/12 OK
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono text-xs">
                    <span
                      className={
                        item.confidence >= 0.98
                          ? "text-emerald-400 font-bold"
                          : item.confidence >= 0.9
                          ? "text-cyan-400"
                          : "text-amber-400 font-bold"
                      }
                    >
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.has_overrun && (
                        <span
                          className="p-1 rounded bg-red-950/80 border border-red-500/40 text-red-400"
                          title="Rilevato sorpasso credito d'investimento (> 10% ex art. 15 LOC)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {item.contains_personal_data && (
                        <span
                          className="p-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-400"
                          title="Fascicolo contenente dati personali (nLPD)"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {!item.has_overrun && !item.contains_personal_data && (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/review/${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white font-medium text-xs transition-colors shadow-sm"
                    >
                      <span>Split-View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
