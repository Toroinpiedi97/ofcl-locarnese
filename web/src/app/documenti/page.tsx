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
    <div className="space-y-6 pb-12">
      <header className="ofl-card p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e232b] text-white text-xs font-semibold mb-2">
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Archivio Pubblico Ufficiale · Tracciabilità SHA-256</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Biblioteca Documenti & Fascicoli MCA2
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Tutti i Messaggi Municipali di Preventivo, Consuntivo e Crediti d&apos;Investimento dei 19 Comuni del Locarnese,
            indicizzati con firma crittografica e conformità rigorosa alle norme sulla privacy (nLPD).
          </p>
        </div>
      </header>

      <main className="space-y-6">
        {/* Barra Filtri */}
        <div className="ofl-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Tipologia */}
            <div className="inline-flex rounded-xl border border-slate-300 bg-white/70 p-1 gap-1">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedKind === tab.id
                      ? "bg-[#1e232b] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-950"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dropdown Comune */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                value={selectedUst}
                onChange={(e) =>
                  setSelectedUst(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                }
                className="py-1.5 px-2.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-600 cursor-pointer"
              >
                <option value="ALL">Tutti i 19 Comuni</option>
                {MUNICIPALITIES.map((m) => (
                  <option key={m.ust_code} value={m.ust_code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ricerca Testuale */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per titolo o MM..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 font-medium"
            />
          </div>
        </div>

        {/* Griglia Documenti */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isConsuntivo = doc.document_kind === "CONSUNTIVO";
            const isPreventivo = doc.document_kind === "PREVENTIVO";

            return (
              <div
                key={doc.id}
                className="ofl-card p-5 flex flex-col justify-between hover:border-slate-400 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        isConsuntivo
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : isPreventivo
                          ? "bg-purple-100 text-purple-900 border border-purple-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {doc.document_kind} {doc.fiscal_year}
                    </span>
                    <Link
                      href={`/comuni/${doc.municipality_slug}`}
                      className="text-[11px] font-bold text-slate-800 hover:text-cyan-700 hover:underline"
                    >
                      {doc.municipality_name}
                    </Link>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5">
                    {doc.title}
                  </h2>

                  <div className="text-[11px] font-mono text-slate-600 flex items-center gap-2 mb-3">
                    <span>{doc.mm_reference}</span>
                    <span>·</span>
                    <span>{doc.pages} pag.</span>
                    <span>·</span>
                    <span>{(doc.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                  </div>

                  {/* Hash SHA-256 */}
                  <div className="p-2 rounded-lg bg-slate-900/5 border border-slate-200/80 mb-3 text-[10px] font-mono text-slate-600 truncate">
                    <span className="font-bold text-slate-800">SHA-256:</span> {doc.sha256}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 font-medium">
                    {doc.approval_date ? `Approvato: ${doc.approval_date}` : "In consultazione"}
                  </div>

                  <a
                    href={doc.original_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ofl-btn-frost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-900"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Scarica PDF</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDocs.length === 0 && (
          <div className="p-12 text-center ofl-card border-dashed">
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900">
              Nessun documento trovato
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Modifica i filtri per visualizzare altri atti ufficiali archiviati.
            </p>
          </div>
        )}

        {/* Note di conformità nLPD */}
        <div className="ofl-card p-5 text-xs text-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-700" />
            <span>Garanzia di Integrità e Conformità nLPD / LPDP</span>
          </div>
          <p className="leading-relaxed text-slate-600">
            Tutti i fascicoli PDF ospitati nell&apos;archivio OFCL sono sottoposti a controllo d&apos;integrità con hash crittografico
            SHA-256 calcolato all&apos;atto della prima indicizzazione. In ottemperanza alla Legge federale sulla protezione dei dati (nLPD)
            e alla Legge cantonale (LPDP), i Messaggi Municipali contenenti elenchi nominativi (es. imposte cantonali, condoni, sussidi nominativi)
            sono esclusi dall&apos;indicizzazione automatica o anonimizzati preventivamente.
          </p>
        </div>
      </main>
    </div>
  );
}
