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
        "ofl-sidebar w-full lg:w-[225px] shrink-0 p-4 flex flex-col justify-between text-slate-200 z-20 select-none",
        className
      )}
    >
      <div>
        {/* Micro-barra civica Trasparenza + Selettore Lingua IT | DE */}
        <div className="flex items-center justify-between pb-3 pt-0.5 px-1 border-b border-white/10 text-slate-400">
          <span className="text-[11px] font-medium truncate pr-2 text-slate-300">
            {t.microBarTitle}
          </span>
          <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLang("IT")}
              className={cn(
                "px-1.5 py-0.5 rounded cursor-pointer transition-colors",
                lang === "IT" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
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
                lang === "DE" ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
              )}
            >
              DE
            </button>
          </div>
        </div>

        {/* Emblem Civico Stylized + OFL (Conforme LPSt, zero stemmi araldici ufficiali) */}
        <Link href="/" className="flex items-center gap-3 px-1.5 pt-4 pb-6 group">
          <div className="w-10 h-11 rounded-b-2xl rounded-t-md bg-gradient-to-b from-slate-100 to-slate-300 p-0.5 shadow-md shrink-0">
            <svg viewBox="0 0 44 48" className="w-full h-full">
              <path
                d="M2 3 H42 V28 C42 38 22 46 22 46 C22 46 2 38 2 28 Z"
                fill="#f8fafc"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <path d="M3 4 H22 V23 H3 Z" fill="#eab308" />
              <path d="M22 4 H41 V23 H22 Z" fill="#dc2626" />
              <rect x="7" y="13" width="3" height="7" rx="1" fill="#1e293b" />
              <rect x="12" y="9" width="3" height="11" rx="1" fill="#1e293b" />
              <rect x="17" y="11" width="3" height="9" rx="1" fill="#1e293b" />
              <circle cx="31.5" cy="13.5" r="4.5" fill="none" stroke="#ffffff" strokeWidth="2.2" />
              <path
                d="M3 23 H41 V28 C41 37 22 44.5 22 44.5 C22 44.5 3 37 3 28 Z"
                fill="#1d4ed8"
              />
              <path
                d="M9 31 Q15 27 22 31 T35 31"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M13 36 Q18 33 22 36 T31 36"
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight text-white leading-none">OFL</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Locarnese MCA2</div>
          </div>
        </Link>

        {/* Pulsante Ricerca Rapida Cmd+K */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cerca...</span>
            </div>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-bold">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Menu Navigazione Civica */}
        <nav className="space-y-1.5" aria-label="Menu principale">
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
                        "nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left",
                        item.isActive ? "ofl-nav-active font-semibold" : "ofl-nav-idle"
                      )}
                    >
                      <Icon className="w-4 h-4 opacity-80 shrink-0 text-amber-400" />
                      <span>{item.label}</span>
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
                        "nav-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left",
                        item.isActive ? "ofl-nav-active font-semibold" : "ofl-nav-idle"
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
                    className="w-64 p-2 ofl-card border border-white/80 max-h-80 overflow-y-auto"
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
                  "nav-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                  item.isActive ? "ofl-nav-active font-semibold" : "ofl-nav-idle"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", item.isActive && "text-sky-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Voce Impostazioni & Hub Vigilanza Civica */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="nav-btn ofl-nav-idle w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left"
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
              className="w-72 p-3 ofl-card border border-white/80 space-y-2.5"
            >
              <div className="text-xs font-bold text-slate-900 border-b border-slate-300/40 pb-1.5 flex items-center justify-between">
                <span>Pagine di Presidio & Trasparenza</span>
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
                    <span>Metodologia & Regole V01-V12</span>
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
                    <span>Changelog & Versioni Dati</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  href="/note-legali"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white text-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-slate-600" />
                    <span>Note Legali & Art. 192 LOC</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>

                <div className="pt-2 border-t border-slate-300/40">
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
      <div className="pt-4 border-t border-white/10 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>{t.certificationStatus}</span>
        </div>
        <div className="text-slate-400 leading-snug">{t.precisionMca2}</div>
      </div>
    </aside>
  );
}
