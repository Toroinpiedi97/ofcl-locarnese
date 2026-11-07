"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCivicLang } from "@/lib/i18n-civic";
import {
  BarChart3,
  Scale,
  Building2,
  Ticket,
  Download,
  Settings,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Search,
  Activity,
  History,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MUNICIPALITIES } from "@/data/municipalities";
import { CultPopoverTicket } from "@/components/cult/CultPopoverTicket";

interface CivicSidebarProps {
  onOpenSearch?: () => void;
  className?: string;
}

export function CivicSidebar({ onOpenSearch, className }: CivicSidebarProps) {
  const pathname = usePathname();
  const { lang, setLang, t } = useCivicLang();

  const navItems = [
    {
      id: "dashboard",
      href: "/",
      label: t.navDashboard,
      icon: BarChart3,
      isActive: pathname === "/",
    },
    {
      id: "confronta",
      href: "/confronta",
      label: t.navConfronta,
      icon: Scale,
      isActive: pathname === "/confronta",
    },
    {
      id: "comuni",
      href: "/comuni/locarno",
      label: t.navComuni,
      icon: Building2,
      isActive: pathname.startsWith("/comuni/"),
      hasPopover: true,
    },
    {
      id: "segnala",
      href: "/segnala",
      label: t.navSegnala,
      icon: Ticket,
      isActive: pathname === "/segnala",
      isTicketTrigger: true,
    },
    {
      id: "opendata",
      href: "/open-data",
      label: t.navOpenData,
      icon: Download,
      isActive: pathname === "/open-data",
    },
  ];

  return (
    <aside
      className={cn(
        "ofl-sidebar w-64 shrink-0 p-5 hidden lg:flex flex-col justify-between text-slate-800 z-20 select-none",
        className
      )}
    >
      <div className="space-y-5">
        {/* Micro-barra civica Trasparenza + Selettore Lingua IT | DE */}
        <div className="flex items-center justify-between pb-3 pt-0.5 border-b border-slate-200/80 text-slate-500 text-xs">
          <span className="text-[11px] font-semibold truncate pr-2 text-slate-600">
            {t.microBarTitle}
          </span>
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLang("IT")}
              className={cn(
                "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                lang === "IT"
                  ? "bg-sky-100 text-sky-800 font-bold"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              IT
            </button>
            <span className="opacity-40">|</span>
            <button
              type="button"
              onClick={() => setLang("DE")}
              className={cn(
                "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                lang === "DE"
                  ? "bg-sky-100 text-sky-800 font-bold"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              DE
            </button>
          </div>
        </div>

        {/* Emblem Civico Stylized + OFL */}
        <Link href="/" className="flex items-center gap-3 px-1 py-1 group">
          <div className="w-10 h-11 rounded-b-2xl rounded-t-lg bg-gradient-to-b from-slate-50 to-slate-200 p-0.5 shadow-xs border border-slate-300/80 flex flex-col items-center justify-between shrink-0">
            <div className="w-full rounded-t bg-[#0F3854] text-white text-center font-mono text-[9px] font-extrabold py-0.5">
              + TI
            </div>
            <div className="w-4 h-4 text-sky-600 flex items-center justify-center font-black text-xs">
              ☩
            </div>
            <div className="w-full h-2 rounded-b-xl bg-gradient-to-r from-red-600 to-amber-500" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
              OFL
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5 font-mono">
              Locarnese MCA2
            </div>
          </div>
        </Link>

        {/* Input Ricerca Rapida Cmd+K */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/90 hover:bg-white border border-slate-200 text-xs text-slate-600 shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cerca nel distretto...</span>
            </div>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200/80">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Menu Navigazione Civica */}
        <nav className="space-y-1" aria-label="Menu principale">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 pt-1 pb-1">
            Navigazione Civica
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isTicketTrigger) {
              return (
                <CultPopoverTicket
                  key={item.id}
                  triggerButton={
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                        item.isActive
                          ? "ofl-nav-active font-bold"
                          : "ofl-nav-idle"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    </button>
                  }
                />
              );
            }

            if (item.hasPopover) {
              return (
                <Popover key={item.id}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left",
                        item.isActive
                          ? "ofl-nav-active font-bold"
                          : "ofl-nav-idle"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 opacity-80 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="w-64 p-2 ofl-card border border-white/90 max-h-80 overflow-y-auto shadow-xl"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Seleziona Comune (19 Comuni)
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {MUNICIPALITIES.map((m) => (
                        <Link
                          key={m.ust_code}
                          href={`/comuni/${m.slug}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-800 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                              {m.ust_code}
                            </span>
                            <span className="font-semibold">{m.name}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-[#0F3854]">
                            {m.tax_multiplier_pf}%
                          </span>
                        </Link>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                  item.isActive
                    ? "ofl-nav-active font-bold"
                    : "ofl-nav-idle"
                )}
              >
                <Icon className="w-4 h-4 opacity-80 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Sottomenu Impostazioni & Documenti */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ofl-nav-idle transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 opacity-80 shrink-0" />
                  <span>{t.navImpostazioni}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="end"
              className="w-72 p-3 ofl-card border border-white/90 space-y-2.5 shadow-xl"
            >
              <div className="text-xs font-bold text-slate-900 border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                <span>Pagine di Presidio &amp; Trasparenza</span>
                <span className="text-[10px] font-mono text-slate-500">LOC / SEL</span>
              </div>

              <div className="space-y-1 text-xs">
                <Link
                  href="/crediti"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tracker Crediti (Art. 15 LOC)</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/documenti"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Biblioteca Fascicoli MCA2</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/metodologia"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Metodologia &amp; Regole V01-V12</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/stato"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Stato Connettori (19/19)</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/changelog-dati"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>Changelog &amp; Versioni Dati</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/note-legali"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-slate-600" />
                    <span>Note Legali &amp; Art. 192 LOC</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <div className="pt-2 border-t border-slate-200/60">
                  <Link
                    href="/admin/queue"
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors font-mono text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Console Curatore /admin</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </Link>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </nav>
      </div>

      {/* Stato certificazione discreto in basso */}
      <div className="pt-4 border-t border-slate-200/80 text-xs text-slate-500 space-y-1">
        <div className="flex items-center justify-between font-bold text-slate-700">
          <span>{t.certificationStatus}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <div className="text-slate-500 text-[11px] font-mono leading-snug">{t.precisionMca2}</div>
      </div>
    </aside>
  );
}
