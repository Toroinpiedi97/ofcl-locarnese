"use client";

import { useState, useId, Suspense } from "react";
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

    if (!ustCode) {
      setErrorMsg("Seleziona il comune di riferimento.");
      return;
    }

    if (!metric || metric.trim().length < 2) {
      setErrorMsg(
        "Indica l'oggetto o il riferimento all'atto ufficiale (es. Consuntivo 2024 · p. 18)."
      );
      return;
    }

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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="ofl-card p-6 sm:p-8">
        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Segnalazione Ricevuta
              </h2>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Grazie per il tuo contributo alla trasparenza civica! La tua segnalazione è stata
                registrata nel registro di audit dell&apos;Osservatorio. Il curatore verificherà
                l&apos;atto ufficiale entro 24–48 ore.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/"
                className="ofl-btn-blue inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold"
              >
                <span>Torna alla Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#1e232b] text-white">
                <MessageSquareText className="w-4 h-4 text-cyan-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Civic Ticket Sandbox · Triage Pubblico
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Segnala una Discrepanza o Proponi una Correzione
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
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
                  className="text-xs font-bold text-slate-700 block mb-1"
                >
                  Comune di Riferimento <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id={ustId}
                  value={ustCode || ""}
                  required
                  onChange={(e) => setUstCode(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-600 cursor-pointer"
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
                  className="text-xs font-bold text-slate-700 block mb-1"
                >
                  Riferimento Atto Ufficiale o Cifra Contabile <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  id="metric-input"
                  type="text"
                  required
                  minLength={2}
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  placeholder="Es. Consuntivo 2024 · p. 18, Moltiplicatore 2026, Residuo Credito tornante..."
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
                />
              </div>

              {/* Testo Segnalazione */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={messageId}
                    className="text-xs font-bold text-slate-700"
                  >
                    Dettaglio della Segnalazione <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      message.length > 500
                        ? "text-red-600 font-bold"
                        : message.length >= 10
                        ? "text-emerald-700 font-bold"
                        : "text-slate-500"
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
                  className="w-full p-3 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 resize-none leading-relaxed font-medium"
                />
              </div>

              {/* Email opzionale */}
              <div>
                <label
                  htmlFor={emailId}
                  className="text-xs font-bold text-slate-700 block mb-1"
                >
                  Indirizzo Email (opzionale)
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@dominio.ch (solo per ricevere riscontro sulla verifica)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-xs text-red-800 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 self-start sm:self-auto font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Tutela nLPD: massimo 3 ticket/ora/IP, hashing SHA-256</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || message.trim().length < 10 || message.trim().length > 500}
                  className="ofl-btn-blue w-full sm:w-auto min-h-[44px] px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Caricamento...</div>}>
      <SegnalaContent />
    </Suspense>
  );
}
