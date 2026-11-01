"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";

export default function VerifyMfaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [totpCode, setTotpCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp.length) {
        router.push("/admin/mfa-setup");
        return;
      }
      setFactorId(data.totp[0].id);
    }
    loadFactors();
  }, [router, supabase]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setErrorMsg(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode.trim(),
      });

      if (verifyError) {
        setErrorMsg(verifyError.message);
        setLoading(false);
        return;
      }

      router.push("/admin/queue");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Errore durante la verifica del codice");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-900/40 border border-amber-500/30 rounded-lg text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Verifica MFA a 2 Fattori</h1>
            <p className="text-xs text-slate-400">Inserisci il codice monouso TOTP dalla tua app</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-200 text-sm">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Codice di Sicurezza (6 Cifre)
            </label>
            <input
              type="text"
              required
              maxLength={6}
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 bg-slate-900/90 border border-slate-700 rounded-lg text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || totpCode.length !== 6}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Verifica in corso..." : "Conferma e Accedi"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
          <span>Livello di sicurezza AAL2</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Crittografia E2E</span>
          </div>
        </div>
      </div>
    </div>
  );
}
