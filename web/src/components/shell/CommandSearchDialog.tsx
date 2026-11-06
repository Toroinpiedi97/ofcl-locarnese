"use client";

import { useEffect, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Search, Building2, ArrowRight, ShieldCheck, Database, FileText } from "lucide-react";
import { useCivicLang } from "@/lib/i18n-civic";

interface CommandSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearchDialog({ open, onOpenChange }: CommandSearchDialogProps) {
  const router = useRouter();
  const { t } = useCivicLang();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredMunicipalities = MUNICIPALITIES.filter((m) => {
    const q = deferredQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.ust_code.toString().includes(q) ||
      m.circle.toLowerCase().includes(q)
    );
  });

  const routes = [
    { label: t.navDashboard, path: "/", icon: Building2 },
    { label: t.navConfronta, path: "/confronta", icon: Building2 },
    { label: "Opere & Crediti d'Opera (Art. 15 LOC)", path: "/crediti", icon: ShieldCheck },
    { label: t.navOpenData, path: "/open-data", icon: Database },
    { label: "Biblioteca Documenti & Fascicoli", path: "/documenti", icon: FileText },
  ].filter((r) => !deferredQuery || r.label.toLowerCase().includes(deferredQuery.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function handleSelect(path: string) {
    onOpenChange(false);
    setQuery("");
    router.push(path);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden ofl-card border border-white/80">
        <div className="p-3 border-b border-slate-300/40 flex items-center gap-2.5 bg-slate-100/50">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca comune, codice UST o sezione (es. Locarno, 5091, crediti)..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
          {/* Sezioni */}
          {routes.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Navigazione Rapida
              </div>
              <div className="space-y-0.5">
                {routes.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.path}
                      onClick={() => handleSelect(r.path)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 hover:bg-white hover:shadow-xs transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.label}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comuni */}
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>I 19 Comuni del Locarnese</span>
              <span className="font-mono">{filteredMunicipalities.length} risultati</span>
            </div>
            <div className="space-y-0.5">
              {filteredMunicipalities.map((m) => (
                <button
                  key={m.ust_code}
                  onClick={() => handleSelect(`/comuni/${m.slug}`)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-800 hover:bg-white hover:shadow-xs transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                      {m.ust_code}
                    </span>
                    <span className="font-bold">{m.name}</span>
                    <span className="text-[11px] text-slate-500">Circolo di {m.circle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0F3854]">
                      {m.tax_multiplier_pf}%
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-2 border-t border-slate-300/40 bg-slate-100/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Premi Invio per confermare</span>
          <span className="font-mono">19 Comuni · MCA2 0.01 CHF</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
