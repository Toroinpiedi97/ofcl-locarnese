"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Ticket, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TicketCardData {
  id: number | string;
  title: string;
  badge: "In corso" | "Verificato" | "Risolto" | "Critico";
  ref: string;
  note: string;
}

interface CultExpandableTicketCardProps {
  tickets?: TicketCardData[];
  municipalityName: string;
}

export function CultExpandableTicketCard({
  tickets,
  municipalityName,
}: CultExpandableTicketCardProps) {
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const defaultTicket: TicketCardData = {
    id: 124,
    title: `Ticket #124 - Verifica voce di spesa 310 (${municipalityName})`,
    badge: "In corso",
    ref: "CE #page=18 · Sottoconto 310",
    note: "Quadratura V03 confermata al centesimo (0.00 CHF). Dettaglio sottoconto e fattura in verifica con la cancelleria.",
  };

  const list = tickets && tickets.length > 0 ? tickets : [defaultTicket];

  function toggle(id: number | string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-2">
      {list.map((t) => {
        const isExp = expandedId === t.id;
        const isVerificato = t.badge === "Verificato" || t.badge === "Risolto";

        return (
          <div
            key={t.id}
            className="ofl-ticket-card rounded-xl p-2.5 transition-all text-xs border border-white/70"
          >
            <div
              onClick={() => toggle(t.id)}
              className="flex items-start justify-between gap-1 cursor-pointer select-none"
            >
              <div className="min-w-0 pr-1">
                <div className="font-bold text-slate-900 truncate leading-snug">{t.title}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      "font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0",
                      isVerificato
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    )}
                  >
                    {t.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate">{t.ref}</span>
                </div>
              </div>

              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-transform shrink-0"
                aria-label="Espandi dettagli ticket"
              >
                <ChevronDown
                  className={cn("w-3.5 h-3.5 transition-transform duration-200", isExp && "rotate-180")}
                />
              </button>
            </div>

            {isExp && (
              <div className="mt-2 pt-2 border-t border-slate-300/40 text-[11px] text-slate-700 leading-relaxed animate-in fade-in-0 duration-150">
                <p>{t.note}</p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Tracciato in audit.feedback_ticket</span>
                  <span className="underline decoration-dotted cursor-help">{t.ref}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
