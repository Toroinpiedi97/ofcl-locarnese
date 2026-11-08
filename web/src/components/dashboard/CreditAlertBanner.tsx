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
  overrunCount = 1,
  overrunDetails = {
    account_code: "615.5010.200",
    description: "Sistemazione tornante Jacomello",
    negative_residual_chf: -16130.65,
    pct_overrun: 4.47,
  },
}: CreditAlertBannerProps) {
  if (hasOverruns) {
    return (
      <div className="ofl-card rounded-2xl p-4 bg-red-50/90 border border-red-200/90 text-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
                Monitoraggio Crediti d&apos;Opera (Art. 15 LOC)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-900 font-bold">
                {overrunCount > 1 ? `${overrunCount} SORPASSI` : "S01 SORPASSO"}
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed break-words">
              Rilevata spesa superiore al credito votato dal Consiglio Comunale per:{" "}
              <strong className="text-slate-950 font-bold">{overrunDetails.description}</strong> ({overrunDetails.account_code}). Residuo negativo:{" "}
              <strong className="text-red-700 font-mono font-bold">
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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Dettaglio Allegato f</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="ofl-card rounded-2xl p-3.5 bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs min-w-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-xs text-slate-700 min-w-0 wrap-anywhere">
          Crediti d&apos;opera conformi per <strong className="text-slate-900">{municipalityName}</strong>: nessuna spesa eccede il credito votato (Art. 15 LOC).
        </span>
      </div>

      <Link
        href={`/comuni/${slug}/crediti`}
        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1 shrink-0"
      >
        <span>Controlla crediti</span>
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
