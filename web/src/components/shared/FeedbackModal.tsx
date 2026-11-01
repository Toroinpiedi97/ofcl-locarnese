"use client";

import { useState, useEffect, useId } from "react";
import {
  MessageSquareText,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUstCode?: number;
  municipalityName?: string;
  defaultMetric?: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  defaultUstCode,
  municipalityName,
  defaultMetric,
}: FeedbackModalProps) {
  const pathname = usePathname();
  const messageId = useId();
  const emailId = useId();

  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Chiusura con tasto Escape e blocco scroll
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      // Reset stato alla chiusura
      setTimeout(() => {
        setMessage("");
        setEmail("");
        setErrorMsg(null);
        setSuccess(false);
      }, 200);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (message.trim().length < 10) {
      setErrorMsg("La segnalazione deve contenere almeno 10 caratteri.");
      return;
    }
    if (message.trim().length > 500) {
      setErrorMsg("La segnalazione non può superare i 500 caratteri.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: pathname || "/",
          message: message.trim(),
          reporter_email: email.trim() || undefined,
          target_metric: defaultMetric || undefined,
          ust_code: defaultUstCode || undefined,
          website_hp: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Errore durante l'invio. Riprova più tardi.");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg("Errore di connessione. Verifica la rete e riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pulsante Chiusura */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi finestra"
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Segnalazione Inviata
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Grazie per il tuo contributo civico! Il curatore verificherà la rettifica a mano
                sui documenti ufficiali ex art. 192 LOC.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-6 rounded-xl bg-[#0F3854] hover:bg-[#00A3C4] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <div>
            {/* Header Dialog */}
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-[#0F3854]/10 dark:bg-cyan-950/40 text-[#0F3854] dark:text-cyan-300">
                <MessageSquareText className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F3854] dark:text-cyan-400">
                Civic Ticket Sandbox
              </span>
            </div>
            <h2 id="feedback-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Segnala una Discrepanza o Proponi una Correzione
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Hai notato un refuso o un dato da aggiornare? Ogni segnalazione è sottoposta a verifica
              indipendente dal curatore responsabile.
            </p>

            {/* Contesto Segnalazione (se presente) */}
            {(municipalityName || defaultMetric) && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Riferimento: <strong className="text-slate-900 dark:text-white">{municipalityName || "Generale"}</strong>
                </span>
                {defaultMetric && (
                  <span className="font-mono text-[11px] text-[#00A3C4] font-medium truncate max-w-[180px]">
                    {defaultMetric}
                  </span>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Campo Honeypot anti-bot (invisibile) */}
              <input
                type="text"
                name="website_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={messageId}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Descrizione della discrepanza <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      message.length > 500
                        ? "text-red-500 font-bold"
                        : message.length >= 10
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {message.length} / 500 car.
                  </span>
                </div>
                <textarea
                  id={messageId}
                  rows={4}
                  required
                  minLength={10}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Es. Sulla pagina del Consuntivo 2025 il debito netto indicato differisce dall'allegato d del messaggio municipale..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Indirizzo Email (opzionale)
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@dominio.ch (solo per aggiornarti sull'esito della verifica)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tutela nLPD: IP salato e archiviazione sicura</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={loading || message.trim().length < 10 || message.trim().length > 500}
                    className="flex-1 sm:flex-initial min-h-[44px] px-5 rounded-xl bg-[#0F3854] hover:bg-[#00A3C4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Invio in corso...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Invia Segnalazione</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
