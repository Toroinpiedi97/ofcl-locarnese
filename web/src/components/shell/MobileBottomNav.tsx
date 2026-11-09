"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, BarChart3, Scale, Building2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useCivicLang();
  const [isOpen, setIsOpen] = useState(false);

  // Chiusura automatica al cambio di route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Chiusura con tasto Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Escludi console curatore /admin
  if (pathname?.startsWith("/admin")) return null;

  const items = [
    {
      id: "dashboard",
      href: "/",
      label: t.navDashboard || "Panoramica",
      icon: BarChart3,
      isActive: pathname === "/",
    },
    {
      id: "confronta",
      href: "/confronta",
      label: t.navConfronta || "Confronta",
      icon: Scale,
      isActive: pathname === "/confronta",
    },
    {
      id: "comuni",
      href: "/comuni/locarno",
      label: t.navComuni || "19 Comuni",
      icon: Building2,
      isActive: pathname.startsWith("/comuni"),
    },
    {
      id: "segnala",
      href: "/segnala",
      label: t.navSegnala || "Segnala",
      icon: Ticket,
      isActive: pathname === "/segnala",
      isAmber: true,
    },
  ];

  return (
    <>
      {/* Sfondo Oscurato Leggero quando il menu circolare è aperto */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1.5px] lg:hidden animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Action Speed Dial Container (In basso a destra) */}
      <div
        className="fixed bottom-6 right-5 z-40 lg:hidden flex flex-col items-end gap-3 select-none pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Navigazione rapida mobile"
      >
        {/* I 4 Pulsanti Rotondi (Visibili solo se espanso) */}
        {isOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            aria-label="Opzioni rapide"
            className="flex flex-col items-end gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center gap-2.5">
                  {/* Etichetta Pill Scura Descrittiva */}
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold shadow-md border pointer-events-none whitespace-nowrap",
                      item.isAmber
                        ? "bg-amber-900/90 text-amber-100 border-amber-700/50"
                        : "bg-slate-900/90 text-white border-slate-700/50"
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Pulsante Rotondo Opzione */}
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    aria-label={item.label}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border",
                      item.isActive
                        ? item.isAmber
                          ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300"
                          : "bg-[#0F3854] text-white border-sky-400 ring-2 ring-sky-300/60"
                        : item.isAmber
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-white/95 text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        item.isActive ? "stroke-[2.5]" : "stroke-[2]"
                      )}
                    />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pulsante Rotondo Principale Toggle (+) */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isOpen ? "Chiudi opzioni rapide" : "Apri opzioni rapide (+)"}
          className={cn(
            "w-13 h-13 rounded-full bg-[#0F3854] text-white flex items-center justify-center cursor-pointer",
            "shadow-xl shadow-[#0F3854]/30 hover:bg-[#0c2e46] active:scale-95 transition-all duration-200",
            "border border-white/20 focus:outline-none focus:ring-3 focus:ring-sky-400"
          )}
        >
          <Plus
            className={cn(
              "w-6 h-6 stroke-[2.5] transition-transform duration-200 ease-in-out",
              isOpen && "rotate-45"
            )}
          />
        </button>
      </div>
    </>
  );
}
