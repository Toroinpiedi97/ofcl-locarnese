"use client";

import { useState, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Ticket, Send, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CultPopoverTicketProps {
  initialUstCode?: number;
  initialMetric?: string;
  triggerButton?: React.ReactNode;
}

export function CultPopoverTicket({
  initialUstCode = 5113,
  initialMetric = "CE p.18 · Voce 310",
  triggerButton,
}: CultPopoverTicketProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<"MCA2" | "Cantiere" | "Tariffe" | "Dati">("MCA2");
  const [ustCode, setUstCode] = useState<number>(initialUstCode);
  const [targetRef, setTargetRef] = useState<string>(initialMetric);
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (message.trim().length < 10) {
      setErrorMsg("La nota deve contenere almeno 10 caratteri.");
      return;
    }
    if (message.trim().length > 500) {
      setErrorMsg("La nota non può superare i 500 caratteri.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: window.location.pathname || "/",
          message: `[${category}] ${message.trim()}`,
          reporter_email: email.trim() || undefined,
          target_metric: targetRef.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Segnala Discrepanza / Apri Ticket</DialogTitle>
            <span className="rounded-full bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 font-bold font-mono">
              Audit Civico
            </span>
          </div>
          <p className="text-xs text-slate-600 font-mono">
            POST /api/feedback · Cruscotto di rettifica nLPD/LPDP
          </p>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Segnalazione Ricevuta!</h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Registrata nel registro di audit dell&apos;Osservatorio. Verifica entro 24–48 ore.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Honeypot anti-bot */}
            <input
              type="text"
              name="website_hp"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Categorie cult-ui selectable pills */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Tipologia Segnalazione</label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
                {[
                  { id: "MCA2", label: "📊 Quadratura MCA2" },
                  { id: "Cantiere", label: "🏗️ Cantiere (Art. 15 LOC)" },
                  { id: "Tariffe", label: "🗑️ Tassa Rifiuti / Acqua" },
                  { id: "Dati", label: "📄 Rendiconto / Dati" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={cn(
                      "rounded-lg p-1.5 text-center transition-all cursor-pointer",
                      category === cat.id
                        ? "bg-[#0F3854] text-white font-bold shadow-xs"
                        : "bg-white/80 text-slate-700 border border-slate-300/80 hover:bg-white"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Comune</label>
                <select
                  value={ustCode}
                  onChange={(e) => setUstCode(Number(e.target.value))}
                  className="ofl-input-pill w-full rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 font-bold cursor-pointer"
                >
                  {MUNICIPALITIES.map((m) => (
                    <option key={m.ust_code} value={m.ust_code}>
                      {m.name} ({m.ust_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Voce / Pagina PDF Ufficiale</label>
                <input
                  type="text"
                  value={targetRef}
                  onChange={(e) => setTargetRef(e.target.value)}
                  placeholder="Es. CE p.18 · Voce 310"
                  className="ofl-input-pill w-full rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nota per il Curatore (nessun dato personale nLPD)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Indica il valore esatto rilevato sull'atto ufficiale comunale..."
                className="ofl-input-pill w-full rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none"
              />
              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                <span>🛡️ Hash rate-limited · Audit curatore obbligatorio</span>
                <span className="font-mono">{message.length} / 500 car.</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-lg bg-red-100 border border-red-300 text-red-800 text-[11px] flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-300/40">
              <span className="text-[11px] text-slate-500 font-mono">audit.feedback_ticket</span>
              <button
                type="submit"
                disabled={loading}
                className="ofl-btn-blue rounded-full px-5 py-2 text-xs font-bold cursor-pointer hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Invia Segnalazione ➔</span>
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
