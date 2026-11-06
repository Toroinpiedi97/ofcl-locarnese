"use client";

import { useState } from "react";
import { MessageSquareText, CheckCircle2, Clock, XCircle } from "lucide-react";

interface FeedbackTicket {
  id: string;
  ust_code: number;
  municipality_name: string;
  category: "DISCREPANZA_CIFRA" | "SEGNALAZIONE_ATTO" | "ACCESSIBILITA" | "ALTRO";
  message: string;
  page_url?: string;
  status: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  created_at: string;
}

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
  const [filter, setFilter] = useState<string>("ALL");

  function updateStatus(id: string, newStatus: FeedbackTicket["status"]) {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  }

  const filteredTickets = tickets.filter((t) => {
    if (filter === "ALL") return true;
    return t.status === filter;
  });

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

        <div className="flex items-center gap-2">
          {["ALL", "NEW", "IN_REVIEW", "RESOLVED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filter === st
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
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
                <div className="text-xs text-slate-400">
                  Riferimento URL: <span className="text-cyan-400 font-mono">{ticket.page_url}</span>
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
