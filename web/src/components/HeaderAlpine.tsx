"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
  Coins,
  Shield,
  ArrowRight,
  X,
  Command,
} from "lucide-react";
import { MUNICIPALITIES, type MunicipalityData } from "@/data/municipalities";

export function HeaderAlpine() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Non mostrare l'header pubblico all'interno della console curatore /admin
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // Filtra i comuni istantaneamente in-memory (zero latenza di rete)
  const filtered = searchQuery.trim()
    ? MUNICIPALITIES.filter((m) => {
        const q = searchQuery.toLowerCase().trim();
        return (
          m.name.toLowerCase().includes(q) ||
          m.ust_code.toString().includes(q) ||
          m.circle.toLowerCase().includes(q)
        );
      })
    : MUNICIPALITIES.slice(0, 8); // Mostra i primi 8 come default

  // Gestione shortcut Cmd+K / Ctrl+K & Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Focus automatico sull'input alla comparsa del modale
  useEffect(() => {
    if (isSearchOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [isSearchOpen]);

  // Gestione frecce Su/Giù e Invio nel menu di ricerca
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigateToMunicipality(filtered[selectedIndex].slug);
    }
  }

  function navigateToMunicipality(slug: string) {
    setIsSearchOpen(false);
    router.push(`/comuni/${slug}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-alpine-header transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Marchio Istituzionale Neutro */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0F3854] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-sm group-hover:bg-[#00A3C4] transition-colors">
              <span className="font-mono">CH</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                OFCL <span className="text-slate-400 font-normal">·</span> Locarnese
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline tracking-tight">
                Osservatorio Finanze Comunali MCA2
              </span>
            </div>
          </Link>

          {/* Navigazione Primaria */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Comuni
            </Link>
            <Link
              href="/confronta"
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Confronta</span>
            </Link>
            <Link
              href="/crediti"
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Crediti d&apos;Opera</span>
            </Link>
            <Link
              href="/open-data"
              className="px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Open Data</span>
            </Link>
          </nav>

          {/* Quick Search Button & Curator Link */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500"
              title="Cerca un comune del Locarnese o filtra per codice UST (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Cerca Comune...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>

            <Link
              href="/admin/queue"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Accesso Console Curatore /admin"
            >
              <Shield className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Modale Ricerca Istantanea Cmd+K */}
      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Campo di ricerca rapido */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Digita il nome del comune o codice UST (es. Ascona, 5096, Navegna)..."
                className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista Comuni Risultanti */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nessun comune trovato per &quot;{searchQuery}&quot;. Verifica nome o codice UST.
                </div>
              ) : (
                filtered.map((m, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={m.ust_code}
                      onClick={() => navigateToMunicipality(m.slug)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                          {m.ust_code}
                        </span>
                        <div>
                          <div className="text-xs font-semibold">{m.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Circolo di {m.circle} · {m.population.toLocaleString("de-CH")} ab.
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                            {m.tax_multiplier_pf}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.has_differentiated_pg ? `PG: ${m.tax_multiplier_pg}%` : "PF = PG"}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con scorciatoie */}
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>[↑↓] Scorri</span>
                <span>·</span>
                <span>[Invio] Apri Scheda</span>
              </div>
              <div>[Esc] Chiudi</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
