"use client";

import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

interface MobileTopBarProps {
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}

export function MobileTopBar({ onOpenSearch, onOpenMenu }: MobileTopBarProps) {
  const { lang, setLang } = useCivicLang();

  return (
    <header
      className="sticky top-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-b border-slate-200/90 px-3.5 py-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between lg:hidden shadow-xs select-none"
      aria-label="Barra superiore mobile"
    >
      {/* Marchio Istituzionale OFL Fisso */}
      <Link href="/" className="flex items-center gap-2.5 active:opacity-80 transition-opacity">
        <div className="w-7 h-8 rounded-b-xl rounded-t-md bg-[#0F3854] text-white flex flex-col items-center justify-between p-0.5 shrink-0 shadow-xs">
          <span className="font-mono text-[7px] font-bold">+ TI</span>
          <span className="text-sky-300 text-[10px] leading-none">☩</span>
          <span className="w-full h-1 bg-red-600 rounded-b-lg"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight">
            OFL
          </span>
          <span className="text-[9px] text-slate-500 font-mono tracking-tight leading-none">
            Locarnese MCA2
          </span>
        </div>
      </Link>

      {/* Azioni Rapide: Cerca Cmd+K, Switch IT/DE, Hamburger Menu */}
      <div className="flex items-center gap-2">
        {/* Pulsante Cerca Rapido */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Cerca comune o codice UST"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <Search className="w-4 h-4 text-sky-700" />
        </button>

        {/* Selettore Lingua IT | DE */}
        <div className="flex items-center gap-0.5 font-mono text-[10px] font-bold bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setLang("IT")}
            aria-label="Imposta lingua italiana"
            className={cn(
              "min-h-[30px] px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center",
              lang === "IT"
                ? "bg-white text-sky-800 shadow-xs font-extrabold"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            IT
          </button>
          <button
            type="button"
            onClick={() => setLang("DE")}
            aria-label="Deutsche Sprache einstellen"
            className={cn(
              "min-h-[30px] px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center",
              lang === "DE"
                ? "bg-white text-sky-800 shadow-xs font-extrabold"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            DE
          </button>
        </div>

        {/* Bottone Hamburger Menu */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Apri menu navigazione"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
}
