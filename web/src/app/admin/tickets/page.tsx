"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquareText,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  X,
} from "lucide-react";
import {
  fetchLiveTicketsAction,
  updateTicketStatusAction,
  type FeedbackTicketDto,
} from "./actions";

type FeedbackTicket = FeedbackTicketDto;

const INITIAL_TICKETS: FeedbackTicket[] = [
  {
    id: "t-001",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    category: "DISCREPANZA_CIFRA",
    message: "Sul credito tornante Jacomello è indicato un residuo negativo di -16'130.65 CHF. È stato votato un credito suppletorio?",
    page_url: "/comuni/brione-sopra-minusio/crediti",
    status: "NEW",
    created_at: "2026-11-01T14:30:00Z",
  },
  {
    id: "t-002",
    ust_code: 5113,
    municipality_name: "Locarno",
    category: "SEGNALAZIONE_ATTO",
    message: "È uscito all'albo il nuovo Preventivo 2027 per la Città di Locarno (MM 12). Verrà caricato presto?",
    page_url: "/comuni/locarno",
    status: "IN_REVIEW",
    created_at: "2026-10-31T09:15:00Z",
  },
  {
    id: "t-003",
    ust_code: 5115,
    municipality_name: "Losone",
    category: "ACCESSIBILITA",
    message: "La tabella sul contrasto per i daltonici è ottima, ma potreste aggiungere anche l'export CSV dei soli crediti?",
    page_url: "/crediti",
    status: "RESOLVED",
    created_at: "2026-10-28T16:45:00Z",
  },
];

export default function CuratorTicketsPage() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>(INITIAL_TICKETS);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchLiveTicketsAction()
      .then((live) => {
        if (live && live.length > 0) {
          const liveIds = new Set(live.map((t) => t.id));
          setTickets([
            ...live,
            ...INITIAL_TICKETS.filter((t) => !liveIds.has(t.id)),
          ]);
        }
      })
      .catch(() => {});
  }, []);

  async function updateStatus(id: string, newStatus: FeedbackTicket["status"]) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    await updateTicketStatusAction(id, newStatus);
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
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
            <span>Segnalazioni Civiche & Ticket Sandbox</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Feedback e richieste di rettifica ricevute dai cittadini (Tabella <code>audit.feedback_ticket</code>).
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

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-start justify-between gap-4"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm">{ticket.municipality_name}</span>
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

            {/* Azioni di Stato Curatore */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  ticket.status === "NEW"
                    ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                    : ticket.status === "IN_REVIEW"
                    ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {ticket.status}
              </span>

              <div className="flex items-center gap-1 mt-2">
                {ticket.status !== "IN_REVIEW" && (
                  <button
                    onClick={() => updateStatus(ticket.id, "IN_REVIEW")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Prendi in carico"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                {ticket.status !== "RESOLVED" && (
                  <button
                    onClick={() => updateStatus(ticket.id, "RESOLVED")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                    title="Segna come risolto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {ticket.status !== "DISMISSED" && (
                  <button
                    onClick={() => updateStatus(ticket.id, "DISMISSED")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                    title="Archivia / Non pertinente"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
