"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export interface CreditAlertBannerProps {
  municipalityName: string;
  slug: string;
  hasOverruns: boolean;
  overrunCount?: number;
  overrunDetails?: {
    account_code: string;
    description: string;
    negative_residual_chf: number;
    pct_overrun?: number;
  };
}

export function CreditAlertBanner({
  municipalityName,
  slug,
  hasOverruns,
  overrunDetails = {
    account_code: "615.5010.200",
    description: "Sistemazione tornante Jacomello",
    negative_residual_chf: -16130.65,
    pct_overrun: 4.47,
  },
}: CreditAlertBannerProps) {
  if (hasOverruns) {
    return (
      <div className="rounded-xl p-4 bg-gradient-to-r from-red-950/40 to-amber-950/20 border border-red-500/40 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-900/60 text-red-300 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Monitoraggio Crediti d&apos;Opera (Art. 15 LOC)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 border border-red-500/30 text-red-300 font-semibold">
                S01 SORPASSO
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Rilevata spesa superiore al credito votato dal Consiglio Comunale per:{" "}
              <strong className="text-white">{overrunDetails.description}</strong> ({overrunDetails.account_code}). Residuo negativo:{" "}
              <strong className="text-red-400 font-mono">
                {overrunDetails.negative_residual_chf.toLocaleString("de-CH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                CHF
              </strong>
              .
            </p>
          </div>
        </div>

        <Link
          href={`/comuni/${slug}/crediti`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-white font-medium text-xs transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Dettaglio Allegato f</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3.5 bg-emerald-950/20 border border-emerald-500/30 text-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs text-slate-300">
          Crediti d&apos;opera conformi per <strong className="text-white">{municipalityName}</strong>: nessuna spesa eccede il credito votato (Art. 15 LOC).
        </span>
      </div>

      <Link
        href={`/comuni/${slug}/crediti`}
        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 shrink-0 font-medium"
      >
        <span>Controlla crediti</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
