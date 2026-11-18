"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, KeyRound } from "lucide-react";

interface LoginClientProps {
  hasPasswordMode: boolean;
  hasSupabaseAuth: boolean;
}

export default function LoginClient({
  hasPasswordMode,
  hasSupabaseAuth,
}: LoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/admin/queue";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          redirectTo,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        nextPath?: string;
      };

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || "Credenziali non valide.");
        setLoading(false);
        return;
      }

      router.refresh();
      router.push(data.nextPath || "/admin/queue");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Errore di rete durante l'accesso"
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-61px)] bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              OFCL Curator Console
            </h1>
            <p className="text-xs text-slate-400">
              {hasPasswordMode && hasSupabaseAuth
                ? "Accesso con password curatore o account Supabase"
                : hasPasswordMode
                ? "Accesso protetto con password curatore"
                : "Accesso riservato con email e password istituzionale"}
            </p>
          </div>
        </div>

        {!hasPasswordMode && !hasSupabaseAuth && (
          <div className="mb-6 p-3.5 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-200 text-xs leading-relaxed">
            Configurazione richiesta: imposta <code>CURATOR_PASSWORD</code> oppure{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> nelle variabili d&apos;ambiente del
            progetto.
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mb-6 p-3 bg-red-950/60 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-200 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {hasSupabaseAuth && (
            <div>
              <label
                htmlFor="curator-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Email Curatore{" "}
                {hasPasswordMode ? (
                  <span className="text-slate-500 font-normal lowercase">
                    (opzionale con password console)
                  </span>
                ) : null}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  id="curator-email"
                  type="email"
                  required={!hasPasswordMode}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="curatore@ofcl.ch"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="curator-password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Password Curatore
            </label>
            <div className="relative">
              {hasPasswordMode && !hasSupabaseAuth ? (
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              )}
              <input
                id="curator-password"
                type="password"
                required
                autoFocus={!hasSupabaseAuth}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Verifica credenziali..." : "Accedi alla Console"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            OFCL Locarnese · Conforme nLPD & Audit Guardrail C-01.
          </p>
        </div>
      </div>
    </div>
  );
}
