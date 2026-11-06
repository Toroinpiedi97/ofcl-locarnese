import Link from "next/link";
import { LEGAL_CONFIG, LEGAL_DISCLAIMERS } from "@/lib/legal";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Colonna 1: Identità & Indipendenza */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              {LEGAL_CONFIG.portalName}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Piattaforma civica indipendente per la consultazione trasparente e comparata dei bilanci comunali
              (MCA2) del Distretto di Locarno. Non affiliata a enti governativi.
            </p>
          </div>

          {/* Colonna 2: Disclaimer & Art. 192 LOC */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              {LEGAL_DISCLAIMERS.footer.title}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {LEGAL_DISCLAIMERS.footer.body}
            </p>
          </div>

          {/* Colonna 3: Riferimenti & Segnalazioni */}
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Riferimenti & Rettifiche</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link
                  href={LEGAL_CONFIG.legalPageUrl}
                  className="underline decoration-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Note Legali, Fonti & Disclaimer completo
                </Link>
              </li>
              <li>
                <Link
                  href={LEGAL_CONFIG.correctionsUrl}
                  className="underline decoration-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Segnala un'imprecisione contabile (24h)
                </Link>
              </li>
              <li>
                <a
                  href={LEGAL_CONFIG.license.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-slate-400 hover:text-slate-950 dark:hover:text-slate-100"
                >
                  Licenza Open Data: {LEGAL_CONFIG.license.shortName}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-500 dark:text-slate-400 dark:border-slate-800/80">
          Agli effetti giuridici fanno fede unicamente gli atti originali affissi agli albi comunali (art. 192 LOC).
          Dati ufficiali elaborati: 19 Comuni del Locarnese & Sezione degli enti locali (SEL, Bellinzona).
        </div>
      </div>
    </footer>
  );
}
