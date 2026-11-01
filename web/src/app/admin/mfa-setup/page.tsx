"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QrCode, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";

export default function MfaSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function enrollFactor() {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "OFCL Locarnese",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setFactorId(data.id);
      setQrCodeUrl(data.totp.qr_code);
      setSecret(data.totp.secret);
    }
    enrollFactor();
  }, [supabase]);

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
        code: verificationCode.trim(),
      });

      if (verifyError) {
        setErrorMsg(verifyError.message);
        setLoading(false);
        return;
      }

      router.push("/admin/queue");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Errore durante l'attivazione MFA");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-cyan-900/40 border border-cyan-500/30 rounded-lg text-cyan-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Configura MFA Obbligatoria</h1>
            <p className="text-xs text-slate-400">Requisito di sicurezza T038 per curatori certificati</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 mb-6 text-center">
          <p className="text-xs text-slate-300 mb-3">
            Inquadra il codice QR con la tua app di autenticazione (Google Authenticator, Bitwarden o 1Password):
          </p>
          {qrCodeUrl ? (
            <div className="flex justify-center my-3 bg-white p-3 rounded-lg w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
              Generazione chiave sicura...
            </div>
          )}
          {secret && (
            <div className="mt-2 text-xs text-slate-400">
              Chiave manuale: <span className="font-mono text-cyan-400 select-all">{secret}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Inserisci il codice generato per confermare
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full text-center text-xl tracking-[0.4em] font-mono py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Attivazione..." : "Attiva MFA ed Entra"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>MFA TOTP crittograficamente firmata (RFC 6238)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
