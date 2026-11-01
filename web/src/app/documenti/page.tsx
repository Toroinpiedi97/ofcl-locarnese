"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { OFFICIAL_DOCUMENTS, type OfficialDocument } from "@/data/documents";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Hash,
} from "lucide-react";

export default function DocumentiPage() {
  const [selectedKind, setSelectedKind] = useState<string>("ALL");
  const [selectedUst, setSelectedUst] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDocs = useMemo(() => {
    return OFFICIAL_DOCUMENTS.filter((doc) => {
      if (selectedKind !== "ALL" && doc.document_kind !== selectedKind) return false;
      if (selectedUst !== "ALL" && doc.ust_code !== selectedUst) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.mm_reference.toLowerCase().includes(q) ||
          doc.municipality_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedKind, selectedUst, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="bg-gradient-to-b from-[#0F3854]/10 via-transparent to-transparent pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna alla Dashboard</span>
            </Link>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F3854]/10 dark:bg-cyan-950/40 border border-[#0F3854]/20 dark:border-cyan-500/30 text-[#0F3854] dark:text-cyan-300 text-xs font-semibold mb-2">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Archivio Pubblico Ufficiale · Tracciabilità SHA-256</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Biblioteca Documenti & Fascicoli MCA2
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Tutti i Messaggi Municipali di Preventivo, Consuntivo e Crediti d&apos;Investimento dei 19 Comuni del Locarnese,
                indicizzati con firma crittografica e conformità rigorosa alle norme sulla privacy (nLPD).
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Barra Filtri */}
        <div className="bento-card p-4 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Tipologia */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 p-0.5">
              {[
                { id: "ALL", label: "Tutti gli Atti" },
                { id: "CONSUNTIVO", label: "Consuntivi" },
                { id: "PREVENTIVO", label: "Preventivi" },
                { id: "CREDITO_OPERA", label: "Crediti d'Opera" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedKind(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    selectedKind === tab.id
                      ? "bg-white dark:bg-slate-900 text-[#0F3854] dark:text-cyan-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtro Comune */}
            <select
              value={selectedUst}
              onChange={(e) =>
                setSelectedUst(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              }
              className="py-1.5 px-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A3C4] cursor-pointer"
            >
              <option value="ALL">Tutti i 19 Comuni</option>
              {MUNICIPALITIES.map((m) => (
                <option key={m.ust_code} value={m.ust_code}>
                  {m.name} (UST {m.ust_code})
                </option>
              ))}
            </select>
          </div>

          {/* Ricerca */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per titolo o MM..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3C4]"
            />
          </div>
        </div>

        {/* Lista Documenti */}
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const sizeMb = (doc.file_size_bytes / (1024 * 1024)).toFixed(1);

            return (
              <div
                key={doc.id}
                className="bento-card p-5 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {doc.document_kind} {doc.fiscal_year}
                    </span>
                    <Link
                      href={`/comuni/${doc.municipality_slug}`}
                      className="text-xs font-bold text-[#0F3854] dark:text-cyan-400 hover:underline"
                    >
                      {doc.municipality_name}
                    </Link>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {doc.mm_reference}
                    </span>
                    {doc.approval_date && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Deliberato {doc.approval_date}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {doc.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                    <span>{doc.pages} pagine</span>
                    <span>·</span>
                    <span>{sizeMb} MB</span>
                    <span>·</span>
                    <span className="flex items-center gap-1" title={doc.sha256}>
                      <Hash className="w-3 h-3 text-[#00A3C4]" />
                      <span>SHA-256: {doc.sha256.slice(0, 12)}...</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/comuni/${doc.municipality_slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <span>Vedi Comune</span>
                  </Link>

                  {doc.original_url && (
                    <a
                      href={doc.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F3854] hover:bg-[#00A3C4] text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <span>Albo Ufficiale</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nessun fascicolo trovato con i filtri correnti
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Prova a selezionare &quot;Tutti gli Atti&quot; o a modificare la ricerca.
              </p>
            </div>
          )}
        </div>

        {/* Nota Legale & Esclusione nLPD */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            I documenti qui indicizzati provengono direttamente dagli Albi comunali e dai siti istituzionali dei 19 Comuni.
            In ossequio alla legge federale e cantonale sulla protezione dei dati (nLPD / LPDP), i messaggi municipali
            contenenti dati personali (naturalizzazioni, contenziosi o espropri privati) sono esclusi dall&apos;archivio pubblico.
            Fanno fede gli atti esposti all&apos;Albo ex art. 192 LOC.
          </p>
        </div>
      </main>
    </div>
  );
}
