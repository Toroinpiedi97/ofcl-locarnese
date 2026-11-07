"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Ticket, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CultPopoverTicketProps {
  initialUstCode?: number;
  initialMetric?: string;
  triggerButton?: React.ReactNode;
}

type TicketCategory = "MCA2" | "Cantiere" | "Tariffe" | "Dati";

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: "MCA2", label: "Quadratura MCA2" },
  { id: "Cantiere", label: "Opere e Cantieri" },
  { id: "Tariffe", label: "Tasse e Tariffe" },
  { id: "Dati", label: "Rendiconto Ufficiale" },
];

export function CultPopoverTicket({
  initialUstCode = 5113,
  initialMetric = "Consuntivo 2024 · p. 18 (Voce 310)",
  triggerButton,
}: CultPopoverTicketProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<TicketCategory>("MCA2");
  const [ustCode, setUstCode] = useState<number>(initialUstCode);
  const [targetRef, setTargetRef] = useState<string>(initialMetric);
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedMuni =
    MUNICIPALITIES.find((m) => m.ust_code === ustCode) || MUNICIPALITIES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validazione campi obbligatori per un ticket verificabile
    if (!ustCode) {
      setErrorMsg("Il comune di riferimento è obbligatorio.");
      return;
    }

    const cleanRef = targetRef.trim();
    if (cleanRef.length < 3) {
      setErrorMsg(
        "Il riferimento all'atto ufficiale (es. Consuntivo 2024 · p. 18 o Voce 310) è obbligatorio per consentire la verifica."
      );
      return;
    }

    const cleanMsg = message.trim();
    if (cleanMsg.length < 10) {
      setErrorMsg("La descrizione della discrepanza deve contenere almeno 10 caratteri.");
      return;
    }
    if (cleanMsg.length > 500) {
      setErrorMsg("La descrizione non può superare i 500 caratteri.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Formato email non valido. Lascia vuoto il campo per invio anonimo.");
      return;
    }

    setLoading(true);
    try {
      const categoryLabel =
        CATEGORIES.find((c) => c.id === category)?.label || category;

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: typeof window !== "undefined" ? window.location.pathname || "/" : "/",
          message: `[${categoryLabel}] ${cleanMsg}`,
          reporter_email: email.trim() || undefined,
          target_metric: cleanRef,
          ust_code: ustCode,
          website_hp: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Errore durante l'invio della segnalazione.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setMessage("");
        }, 2200);
      }
    } catch {
      setErrorMsg("Errore di connessione. Verifica la rete e riprova.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setErrorMsg(null);
      setSuccess(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <button
            type="button"
            className="ofl-btn-amber rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span>Segnala / Apri Ticket</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg w-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold font-mono border border-slate-200">
              {selectedMuni.ust_code} · {selectedMuni.name}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
            Segnalazione di Rettifica Contabile
          </DialogTitle>
          <p className="text-xs text-slate-500 font-medium">
            Verifica e riconciliazione dati MCA2 · Osservatorio Locarnese
          </p>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Segnalazione Ricevuta</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              La segnalazione è stata registrata nel registro di audit dell&apos;Osservatorio.
              Il curatore verificherà l&apos;atto ufficiale del Comune indicato entro 24–48 ore.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Honeypot anti-bot silenzioso */}
            <input
              type="text"
              name="website_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Ambito della segnalazione (Segmented tabs sobrie, no cartoon emoji) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-800">
                  Ambito della Segnalazione <span className="text-red-500 font-bold">*</span>
                </label>
                <span className="text-[10px] text-slate-500">Seleziona tipologia</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-semibold">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "rounded-lg px-2.5 py-2 text-center transition-all cursor-pointer border text-[11px]",
                        isActive
                          ? "bg-[#0F3854] text-white font-bold border-[#0F3854] shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300"
                      )}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Riga con Comune e Riferimento Atto Ufficiale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Comune di Riferimento <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  value={ustCode}
                  onChange={(e) => setUstCode(Number(e.target.value))}
                  required
                  className="w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0F3854] cursor-pointer"
                >
                  {MUNICIPALITIES.map((m) => (
                    <option key={m.ust_code} value={m.ust_code}>
                      {m.ust_code} · {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Riferimento Atto Ufficiale <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={targetRef}
                  onChange={(e) => setTargetRef(e.target.value)}
                  placeholder="Es. Consuntivo 2024 · p. 18 (Voce 310)"
                  required
                  minLength={3}
                  className="w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3854]"
                />
              </div>
            </div>

            {/* Descrizione della discrepanza */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-800">
                  Descrizione della discrepanza rilevata <span className="text-red-500 font-bold">*</span>
                </label>
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    message.length > 500
                      ? "text-red-600 font-bold"
                      : message.length >= 10
                      ? "text-emerald-700 font-medium"
                      : "text-slate-500"
                  )}
                >
                  {message.length} / 500 car.
                </span>
              </div>
              <textarea
                rows={3}
                required
                minLength={10}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Indica con precisione il valore riscontrato nell'atto ufficiale comunale e la discrepanza rilevata rispetto ai dati esposti nel portale..."
                className="w-full rounded-xl p-3 text-xs text-slate-900 bg-white border border-slate-300 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3854] resize-none leading-relaxed"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Minimo 10 caratteri. Fornisci cifre precise o riferimenti al bilancio per consentire l&apos;istruttoria.
              </p>
            </div>

            {/* Email di contatto facoltativa (nLPD) */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Email per riscontro istruttoria (facoltativa)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.ch (facoltativo)"
                className="w-full rounded-lg px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F3854]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Conforme LPDP / nLPD. Utilizzata esclusivamente dal curatore per inviare l&apos;esito della verifica contabile.
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="text-[10px] text-slate-500 font-medium pt-1">
              <span className="text-red-500 font-bold">*</span> Campi obbligatori per garantire la verificabilità e l&apos;istruttoria del ticket contabile.
            </div>

            {/* Footer con azioni e disclaimer curatore */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">
                Istruttoria a cura del curatore indipendente OFCL
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#0F3854] hover:bg-[#082132] text-white rounded-lg px-4 py-2 text-xs font-bold cursor-pointer hover:shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Invia Segnalazione</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
