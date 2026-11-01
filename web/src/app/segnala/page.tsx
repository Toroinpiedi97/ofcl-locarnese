"use client";

import { useState, useId, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  MessageSquareText,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Building2,
  FileText,
} from "lucide-react";

function SegnalaContent() {
  const searchParams = useSearchParams();
  const initialUst = searchParams.get("ust") ? Number(searchParams.get("ust")) : undefined;
  const initialMetric = searchParams.get("metrica") || "";

  const [ustCode, setUstCode] = useState<number | undefined>(initialUst);
  const [metric, setMetric] = useState<string>(initialMetric);
  const [message, setMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const messageId = useId();
  const emailId = useId();
  const ustId = useId();

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
          page_path: "/segnala",
          message: message.trim(),
          reporter_email: email.trim() || undefined,
          target_metric: metric.trim() || undefined,
          ust_code: ustCode || undefined,
          website_hp: honeypot,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Errore durante l'invio. Riprova più tardi.");
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorMsg("Errore di connessione. Verifica la rete e riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Torna alla Dashboard</span>
        </Link>
      </nav>

      <div className="bento-card p-6 sm:p-8 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Segnalazione Ricevuta
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Grazie per il tuo contributo alla trasparenza civica! La tua segnalazione è stata
                registrata nel registro di audit dell&apos;Osservatorio. Il curatore verificherà
                l&apos;atto ufficiale entro 24–48 ore.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F3854] hover:bg-[#00A3C4] text-white text-xs font-semibold transition-colors"
              >
                <span>Torna alla Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#0F3854]/10 dark:bg-cyan-950/40 text-[#0F3854] dark:text-cyan-300">
                <MessageSquareText className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F3854] dark:text-cyan-400">
                Civic Ticket Sandbox · Triage Pubblico
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Segnala una Discrepanza o Proponi una Correzione
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Cittadini, contabili, consiglieri comunali e giornalisti possono segnalare difformità
              riscontrate tra i dati del portale e i fascicoli comunali ufficiali (art. 192 LOC).
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Honeypot invisibile */}
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

              {/* Selettore Comune */}
              <div>
                <label
                  htmlFor={ustId}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Comune di Riferimento
                </label>
                <select
                  id={ustId}
                  value={ustCode || ""}
                  onChange={(e) => setUstCode(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A3C4] cursor-pointer"
                >
                  <option value="">-- Seleziona un Comune (o Generale Distretto) --</option>
                  {MUNICIPALITIES.map((m) => (
                    <option key={m.ust_code} value={m.ust_code}>
                      {m.name} (UST {m.ust_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sezione / Cifra Segnalata */}
              <div>
                <label
                  htmlFor="metric-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Oggetto o Cifra Contabile (opzionale)
                </label>
                <input
                  id="metric-input"
                  type="text"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="Es. Moltiplicatore 2026, Residuo Credito tornante Jacomello, Autofinanziamento..."
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
                />
              </div>

              {/* Testo Segnalazione */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={messageId}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Dettaglio della Segnalazione <span className="text-red-500">*</span>
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
                    {message.length} / 500 caratteri
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
                  placeholder="Descrivi la discrepanza rilevata indicando, se possibile, il messaggio municipale o la pagina del documento..."
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4] resize-none leading-relaxed"
                />
              </div>

              {/* Email opzionale */}
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
                  placeholder="nome@dominio.ch (solo per ricevere riscontro sulla verifica)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tutela nLPD: massimo 3 ticket/ora/IP, hashing SHA-256</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || message.trim().length < 10 || message.trim().length > 500}
                  className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[#0F3854] hover:bg-[#00A3C4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
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
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SegnalaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Caricamento...</div>}>
      <SegnalaContent />
    </Suspense>
  );
}
