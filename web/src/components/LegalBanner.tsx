import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { LEGAL_CONFIG, LEGAL_DISCLAIMERS } from "@/lib/legal";

export function LegalBanner() {
  return (
    <aside
      aria-label="Avviso di conformità legale e valore dell'albo comunale"
      className="w-full border-b border-amber-200 bg-amber-50/95 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <p className="leading-snug text-xs">
            {LEGAL_DISCLAIMERS.banner.shortText}{" "}
            <Link
              href={LEGAL_CONFIG.legalPageUrl}
              className="font-medium underline decoration-amber-500 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 ml-1"
            >
              {LEGAL_DISCLAIMERS.banner.linkText} →
            </Link>
          </p>
        </div>
        <Link
          href={LEGAL_CONFIG.correctionsUrl}
          className="hidden shrink-0 rounded border border-amber-300 bg-amber-100/60 px-2 py-0.5 font-medium text-amber-900 transition-colors hover:bg-amber-200/80 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200 sm:inline-block"
        >
          Segnala refuso
        </Link>
      </div>
    </aside>
  );
}
