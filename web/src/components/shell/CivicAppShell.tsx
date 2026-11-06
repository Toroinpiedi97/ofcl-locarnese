"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CivicSidebar } from "./CivicSidebar";
import { CommandSearchDialog } from "./CommandSearchDialog";
import { useCivicLang } from "@/lib/i18n-civic";

interface CivicAppShellProps {
  children: React.ReactNode;
}

export function CivicAppShell({ children }: CivicAppShellProps) {
  const pathname = usePathname();
  const { t } = useCivicLang();
  const [searchOpen, setSearchOpen] = useState(false);

  // Isolamento totale della console curatore (/admin)
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#1b2028] text-slate-900">
      {/* Skip Link per Accessibilità Tastiera WAI-ARIA */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#0F3854] focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        Salta al contenuto principale
      </a>

      {/* Sidebar Civica Sinistra */}
      <CivicSidebar onOpenSearch={() => setSearchOpen(true)} />

      {/* Canvas Principale Satinato */}
      <div className="ofl-canvas flex-1 flex flex-col justify-between min-w-0 min-h-screen relative overflow-hidden">
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>

        {/* Footer Istituzionale nel Canvas */}
        <footer className="px-5 lg:px-6 py-3 border-t border-slate-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
          <div>
            <span>{t.footerLegalSeal}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 font-medium">
            <Link href="/crediti" className="hover:text-slate-950 transition-colors">
              Opere Art. 15 LOC
            </Link>
            <Link href="/documenti" className="hover:text-slate-950 transition-colors">
              Atti &amp; PDF
            </Link>
            <Link href="/metodologia" className="hover:text-slate-950 transition-colors">
              Metodologia
            </Link>
            <Link href="/stato" className="hover:text-slate-950 transition-colors">
              Stato
            </Link>
            <Link href="/changelog-dati" className="hover:text-slate-950 transition-colors">
              Changelog
            </Link>
            <Link href="/note-legali" className="hover:text-slate-950 transition-colors">
              Note Legali
            </Link>
            <a
              href="/feed.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0F3854] font-bold hover:underline"
            >
              Feed RSS
            </a>
          </div>
        </footer>
      </div>

      {/* Modale Ricerca Globale Cmd+K */}
      <CommandSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
