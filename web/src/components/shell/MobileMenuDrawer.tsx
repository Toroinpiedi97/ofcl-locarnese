"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  BarChart3,
  Building2,
  Scale,
  ShieldCheck,
  FileText,
  Download,
  Activity,
  History,
  Ticket,
  Lock,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCivicLang } from "@/lib/i18n-civic";

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch?: () => void;
}

export function MobileMenuDrawer({
  open,
  onClose,
  onOpenSearch,
}: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const { t } = useCivicLang();

  // Chiusura con tasto Escape e blocco scroll di background
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Elenco unico continuo e compatto, ordinato rigorosamente per frequenza d'uso
  const navItems = [
    {
      href: "/",
      label: t.navDashboard || "Panoramica Distretto",
      icon: BarChart3,
      badge: "Home",
      isActive: pathname === "/",
    },
    {
      href: "/comuni/locarno",
      label: t.navComuni || "I 19 Comuni",
      icon: Building2,
      badge: "19 Comuni",
      isActive: pathname.startsWith("/comuni"),
    },
    {
      href: "/confronta",
      label: t.navConfronta || "Confronta i Comuni",
      icon: Scale,
      badge: "Benchmark",
      isActive: pathname === "/confronta",
    },
    {
      href: "/crediti",
      label: "Controllo Crediti d'Opera",
      icon: ShieldCheck,
      badge: "Art. 15 LOC",
      isActive: pathname === "/crediti",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      href: "/documenti",
      label: "Atti, Delibere & PDF",
      icon: FileText,
      badge: "MCA2",
      isActive: pathname === "/documenti",
    },
    {
      href: "/open-data",
      label: t.navOpenData || "Open Data & API",
      icon: Download,
      badge: "JSON/CSV",
      isActive: pathname === "/open-data",
    },
    {
      href: "/metodologia",
      label: "Metodologia MCA2 & Indicatori",
      icon: BarChart3,
      badge: "V01-V12",
      isActive: pathname === "/metodologia",
    },
    {
      href: "/stato",
      label: "Monitoraggio Albi & Crawler",
      icon: Activity,
      badge: "19/19 Live",
      isActive: pathname === "/stato",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      href: "/changelog-dati",
      label: "Changelog Versioni Dati",
      icon: History,
      isActive: pathname === "/changelog-dati",
    },
    {
      href: "/segnala",
      label: t.navSegnala || "Segnala una Discrepanza",
      icon: Ticket,
      badge: "Supporto Civico",
      isActive: pathname === "/segnala",
      isAmber: true,
      badgeColor: "bg-amber-500 text-white font-bold",
    },
    {
      href: "/note-legali",
      label: "Note Legali & Disclaimer LOC",
      icon: Scale,
      badge: "Art. 192",
      isActive: pathname === "/note-legali",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu di navigazione principale"
      className="fixed inset-0 z-50 flex justify-end lg:hidden animate-in fade-in duration-200 select-none"
    >
      {/* Sfondo Oscurato Touch-Friendly */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Pannello Scorrevole Laterale Satinato */}
      <div className="relative w-5/6 max-w-sm h-full bg-white/95 backdrop-blur-2xl border-l border-slate-200 shadow-2xl flex flex-col z-10">
        {/* Header Drawer */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-9 rounded-b-xl rounded-t-md bg-[#0F3854] text-white flex flex-col items-center justify-between p-0.5 shrink-0 shadow-xs">
              <span className="font-mono text-[8px] font-bold">+ TI</span>
              <span className="text-sky-300 text-xs">☩</span>
              <span className="w-full h-1 bg-red-600 rounded-b-lg"></span>
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">
                OFCL
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Locarnese MCA2
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pulsante Ricerca Rapida Interno al Drawer */}
        {onOpenSearch && (
          <div className="p-3 border-b border-slate-100">
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-medium flex items-center justify-between border border-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-sky-700" />
                <span>Cerca comune o codice UST...</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                Cmd+K
              </span>
            </button>
          </div>
        )}

        {/* Elenco Unico Continuo Scrollabile */}
        <nav
          className="flex-1 overflow-y-auto p-3 space-y-1"
          aria-label="Voci del menu"
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "min-h-[46px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer",
                  item.isActive
                    ? "bg-sky-50 text-sky-900 font-bold border border-sky-200 shadow-xs"
                    : item.isAmber
                    ? "bg-amber-50/80 text-amber-900 border border-amber-200/80 hover:bg-amber-100/90"
                    : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-950"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      item.isActive
                        ? "text-sky-700 stroke-[2.5]"
                        : item.isAmber
                        ? "text-amber-600"
                        : "text-slate-500"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border",
                        item.badgeColor ||
                          (item.isActive
                            ? "bg-sky-200/80 text-sky-950 border-sky-300"
                            : "bg-slate-100 text-slate-600 border-slate-200")
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer Drawer con Accesso Curatore Riservato */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/90">
          <Link
            href="/admin/login"
            onClick={onClose}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-between text-xs font-mono font-medium transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Console Curatore /admin</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              Auth MFA
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
