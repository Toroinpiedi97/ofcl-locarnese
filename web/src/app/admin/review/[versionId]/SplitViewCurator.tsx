"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Send,
  Save,
  Keyboard,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from "lucide-react";
import {
  saveLedgerCorrectionAction,
  approveAndPublishAction,
  togglePiiAction,
} from "./actions";

export interface CellItem {
  id: string;
  metric_key: string;
  label: string;
  statement: string;
  amount_chf: string;
  page: number;
  bbox: number[]; // [x0, top, x1, bottom]
  status: "NEEDS_REVIEW" | "VALIDATED" | "APPROVED";
  suggested_correction?: string;
  is_overrun?: boolean;
}

export interface ValidationItem {
  code: string;
  passed: boolean;
  message: string;
  severity: "BLOCKING" | "WARNING" | "INFO";
}

export interface SplitViewProps {
  versionId: string;
  municipalityName: string;
  ustCode: number;
  documentTitle: string;
  mmNumber: string;
  year: number;
  status: "NEEDS_REVIEW" | "VALIDATED" | "APPROVED" | "PUBLISHED";
  pdfUrl: string;
  documentId: string;
  initialCells: CellItem[];
  checks: ValidationItem[];
}

export default function SplitViewCurator({
  versionId,
  municipalityName,
  ustCode,
  documentTitle,
  mmNumber,
  year,
  status,
  pdfUrl,
  documentId,
  initialCells,
  checks,
}: SplitViewProps) {
  const router = useRouter();

  const [cells, setCells] = useState<CellItem[]>(initialCells);
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const [activePage, setActivePage] = useState(cells[0]?.page || 1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(125);
  const [containsPii, setContainsPii] = useState(false);

  const activeCell = cells[activeCellIndex];

  // Sincronizza la pagina attiva al cambio di cella
  const selectCell = useCallback((index: number) => {
    if (index >= 0 && index < cells.length) {
      setActiveCellIndex(index);
      const page = cells[index].page;
      if (page) setActivePage(page);
    }
  }, [cells]);

  // Gestione scorciatoie tastiera (J/K, A, R, P)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignora se l'utente sta scrivendo in un input o textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault();
        selectCell(activeCellIndex + 1);
      } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault();
        selectCell(activeCellIndex - 1);
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleApprove();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handleTogglePii();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCellIndex, selectCell]);

  async function handleSaveCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    if (editReason.trim().length < 10) {
      setFeedbackMsg({ text: "La motivazione deve contenere almeno 10 caratteri (vincolo audit).", type: "err" });
      return;
    }

    setSubmitting(true);
    const res = await saveLedgerCorrectionAction(versionId, editingId, editAmount, editReason);
    setSubmitting(false);

    if (res.success) {
      setFeedbackMsg({ text: res.message, type: "ok" });
      setCells((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, amount_chf: editAmount, status: "VALIDATED" } : c))
      );
      setEditingId(null);
      setEditReason("");
    } else {
      setFeedbackMsg({ text: res.message, type: "err" });
    }
  }

  async function handleApprove() {
    if (!confirm("Confermi l'approvazione e la pubblicazione del fascicolo sul portale pubblico OFCL?")) return;
    setSubmitting(true);
    const res = await approveAndPublishAction(versionId);
    setSubmitting(false);
    if (res.success) {
      setFeedbackMsg({ text: res.message, type: "ok" });
      router.push("/admin/queue");
    } else {
      setFeedbackMsg({ text: res.message, type: "err" });
    }
  }

  async function handleTogglePii() {
    const nextPii = !containsPii;
    const reason = prompt("Inserisci la motivazione per la modifica del flag privacy nLPD (min 10 car.):");
    if (!reason || reason.trim().length < 10) return;

    setSubmitting(true);
    const res = await togglePiiAction(documentId, versionId, nextPii, reason);
    setSubmitting(false);
    if (res.success) {
      setContainsPii(nextPii);
      setFeedbackMsg({ text: res.message, type: "ok" });
    } else {
      setFeedbackMsg({ text: res.message, type: "err" });
    }
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-slate-950">
      {/* Top Review Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/queue"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Torna alla Coda"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {municipalityName} (UST {ustCode}) · {mmNumber} {documentTitle}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-semibold">
                Anno {year}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                {status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Quadrature: {checks.filter((c) => c.passed).length}/{checks.length} OK</span>
              <span>·</span>
              <span className="text-cyan-400">Cella attiva: {activeCell?.label || "Nessuna"}</span>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePii}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              containsPii
                ? "bg-purple-950 text-purple-300 border border-purple-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
            title="Tasto rapido [P]: Toggle dati personali nLPD"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{containsPii ? "PII Rilevati [P]" : "Segna PII [P]"}</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={submitting}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
            title="Tasto rapido [A]: Approva e pubblica online"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approva & Pubblica [A]</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`px-6 py-2 text-xs flex items-center justify-between shrink-0 ${
            feedbackMsg.type === "ok" ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-mono underline ml-4">
            Chiudi
          </button>
        </div>
      )}

      {/* Main Split-View Pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: PDF Viewer (50%) */}
        <div className="w-full md:w-1/2 flex flex-col border-r border-slate-800 bg-slate-900/40 overflow-hidden">
          {/* PDF Toolbar */}
          <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">PDF Originale</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-400">
                Pag. {activePage}
              </span>
              {activeCell?.bbox && (
                <span className="text-[10px] font-mono text-slate-400">
                  BBOX [{activeCell.bbox.map((n) => Math.round(n)).join(", ")}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 75))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Riduci Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px]">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 200))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Aumenta Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <a
                href={`${pdfUrl}#page=${activePage}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-2"
                title="Apri PDF in Nuova Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* PDF Viewer Frame */}
          <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center relative">
            <iframe
              key={`pdf-page-${activePage}-${zoomLevel}`}
              src={`${pdfUrl}#page=${activePage}&zoom=${zoomLevel}`}
              className="w-full h-full rounded border border-slate-800 bg-white"
              title="PDF Originale"
            />
          </div>

          {/* Keyboard Shortcuts Hint Bar */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-cyan-400 font-semibold">[J/K]</span> Scorri righe
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-emerald-400 font-semibold">[A]</span> Approva
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-purple-400 font-semibold">[P]</span> Toggle PII
              </span>
            </div>
            <span className="text-slate-500">Sincronizzazione automatica su coordinate #page</span>
          </div>
        </div>

        {/* Right Pane: Extracted Values Grid & In-place Correction (50%) */}
        <div className="w-full md:w-1/2 flex flex-col bg-slate-950 overflow-hidden">
          {/* Header Griglia */}
          <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Griglia Valori Estratti ({cells.length} Voci)
              </h3>
              <p className="text-[11px] text-slate-400">
                Fai clic su una riga o usa [J/K] per visualizzare la cella nel PDF
              </p>
            </div>
          </div>

          {/* Lista Celle */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-4 space-y-2">
            {cells.map((cell, idx) => {
              const isSelected = idx === activeCellIndex;
              const isEditing = editingId === cell.id;

              return (
                <div
                  key={cell.id}
                  onClick={() => selectCell(idx)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/20"
                      : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{cell.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {cell.statement} · Pag. {cell.page}
                      </span>
                      {cell.is_overrun && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 font-semibold">
                          SORPASSO S01
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-white tracking-tight">
                        {Number(cell.amount_chf).toLocaleString("de-CH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        CHF
                      </div>
                    </div>
                  </div>

                  {/* Azione di Rettifica In-Place per la Cella Selezionata */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      {isEditing ? (
                        <form onSubmit={handleSaveCorrection} className="w-full space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              placeholder="Nuovo importo CHF (es. 295570.00)"
                              className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                              autoFocus
                            />
                            {cell.suggested_correction && (
                              <button
                                type="button"
                                onClick={() => setEditAmount(cell.suggested_correction || "")}
                                className="text-[11px] text-cyan-400 hover:underline"
                              >
                                Applica suggerito: {cell.suggested_correction}
                              </button>
                            )}
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="Motivo rettifica (obbligatorio, min 10 caratteri ex audit trigger)"
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 rounded text-slate-400 hover:text-white"
                            >
                              Annulla
                            </button>
                            <button
                              type="submit"
                              disabled={submitting || editReason.trim().length < 10}
                              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salva Rettifica</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">
                            Stato cella: <strong className="text-emerald-400">{cell.status}</strong>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(cell.id);
                              setEditAmount(cell.amount_chf);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-medium"
                          >
                            Rettifica Cifra
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Validation Checks Footer */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 shrink-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verifiche Contabili MCA2 (V01-V12)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {checks.map((c) => (
                <div
                  key={c.code}
                  className={`p-2 rounded border flex items-start gap-2 ${
                    c.passed
                      ? "bg-slate-950/60 border-slate-800/60 text-slate-300"
                      : c.severity === "BLOCKING"
                      ? "bg-red-950/40 border-red-500/40 text-red-300"
                      : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  }`}
                >
                  {c.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span className="text-[11px] truncate leading-tight" title={c.message}>
                    <strong>{c.code}:</strong> {c.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
