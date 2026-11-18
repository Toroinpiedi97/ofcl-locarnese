"use client";

import { useState, useMemo } from "react";
import {
  MessageSquareText,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  X,
  AlertTriangle,
} from "lucide-react";
import { updateTicketStatusAction, type FeedbackTicketDto } from "./actions";

export function TicketsClient({
  initialTickets,
  isSandbox,
  dbError,
}: {
  initialTickets: FeedbackTicketDto[];
  isSandbox: boolean;
  dbError?: string | null;
}) {
  const [tickets, setTickets] = useState<FeedbackTicketDto[]>(initialTickets);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function updateStatus(
    id: string,
    newStatus: FeedbackTicketDto["status"]
  ) {
    const previous = tickets;
    setActionError(null);
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    const res = await updateTicketStatusAction(id, newStatus);
    if (!res.success) {
      setTickets(previous);
      setActionError(res.message || "Impossibile aggiornare lo stato del ticket.");
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMsg = t.message.toLowerCase().includes(q);
        const matchesMun = t.municipality_name.toLowerCase().includes(q);
        const matchesUst = String(t.ust_code).includes(q);
        return matchesMsg || matchesMun || matchesUst;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <MessageSquareText className="w-7 h-7 text-amber-400" />
            <span>Segnalazioni Civiche & Ticket</span>
            {isSandbox && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                Sandbox
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Feedback e richieste di rettifica ricevute dai cittadini (Tabella{" "}
            <code>audit.feedback_ticket</code>).
          </p>
        </div>

        {/* Filtri di Stato */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {[
            { key: "ALL", label: "Tutti" },
            { key: "NEW", label: "Nuovi" },
            { key: "IN_REVIEW", label: "In Revisione" },
            { key: "RESOLVED", label: "Risolti" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === key
                  ? "bg-slate-800 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(dbError || actionError) && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>{dbError || actionError}</div>
        </div>
      )}

      {/* Seconda Barra Filtri: Categorie & Ricerca */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Categoria:</span>
          </span>
          {[
            { key: "ALL", label: "Tutte" },
            { key: "DISCREPANZA_CIFRA", label: "Discrepanza Cifra" },
            { key: "SEGNALAZIONE_ATTO", label: "Segnalazione Atto" },
            { key: "ACCESSIBILITA", label: "Accessibilità" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === key
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca testo o comune..."
            className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full md:w-56"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          <MessageSquareText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">
            {tickets.length === 0
              ? "Nessuna segnalazione civica presente in audit.feedback_ticket."
              : "Nessun ticket corrisponde ai filtri selezionati."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-white text-sm">
                    {ticket.municipality_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    UST {ticket.ust_code}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {ticket.category}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(ticket.created_at).toLocaleString("it-CH")}
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  &ldquo;{ticket.message}&rdquo;
                </p>

                {ticket.page_url && (
                  <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                    <span>Riferimento URL:</span>
                    <a
                      href={ticket.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] transition-colors"
                      title={`Apri ${ticket.page_url} in nuova scheda`}
                    >
                      <span>{ticket.page_url}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    ticket.status === "NEW"
                      ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                      : ticket.status === "IN_REVIEW"
                        ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                        : ticket.status === "RESOLVED"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {ticket.status}
                </span>

                <div className="flex items-center gap-1 mt-2">
                  {ticket.status !== "IN_REVIEW" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ticket.id, "IN_REVIEW")}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Prendi in carico"
                      aria-label="Prendi in carico"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  )}
                  {ticket.status !== "RESOLVED" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ticket.id, "RESOLVED")}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Segna come risolto"
                      aria-label="Segna come risolto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {ticket.status !== "DISMISSED" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ticket.id, "DISMISSED")}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Archivia / Non pertinente"
                      aria-label="Archivia / Non pertinente"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
