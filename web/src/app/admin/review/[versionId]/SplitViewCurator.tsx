"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Save,
  Keyboard,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Copy,
  Check,
  Layers,
  FileText,
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
  const [viewMode, setViewMode] = useState<"native" | "bbox">("native");
  const [copiedBbox, setCopiedBbox] = useState(false);

  const activeCell = cells[activeCellIndex];

  // Sincronizza la pagina attiva al cambio di cella e auto-scroll della riga
  const selectCell = useCallback((index: number) => {
    if (index >= 0 && index < cells.length) {
      setActiveCellIndex(index);
      const page = cells[index].page;
      if (page) setActivePage(page);
      const rowEl = document.getElementById(`cell-row-${index}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [cells]);

  const handleCopyBbox = useCallback(() => {
    if (!activeCell?.bbox) return;
    const str = `[${activeCell.bbox.map((n) => Math.round(n * 10) / 10).join(", ")}]`;
    navigator.clipboard?.writeText(str);
    setCopiedBbox(true);
    setTimeout(() => setCopiedBbox(false), 2000);
  }, [activeCell]);

  // Gestione scorciatoie tastiera (J/K, E, Esc, A, P)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Se l'utente preme Escape mentre è in editing, chiudi la form
      if (e.key === "Escape" && editingId) {
        e.preventDefault();
        setEditingId(null);
        setEditReason("");
        return;
      }

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
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (activeCell) {
          setEditingId(activeCell.id);
          setEditAmount(activeCell.amount_chf);
        }
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
  }, [activeCellIndex, selectCell, editingId, activeCell]);

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
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode("native")}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === "native"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Visualizza il documento PDF originale"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PDF Nativo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("bbox")}
                  className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === "bbox"
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Visualizza la sovrapposizione geometrica BBOX"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Overlay BBOX</span>
                </button>
              </div>

              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-400 text-[11px]">
                Pag. {activePage}
              </span>

              {activeCell?.bbox && (
                <button
                  type="button"
                  onClick={handleCopyBbox}
                  className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-[10px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copia coordinate BBOX negli appunti"
                >
                  {copiedBbox ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>
                    BBOX [{activeCell.bbox.map((n) => Math.round(n)).join(", ")}]
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 75))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                title="Riduci Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px]">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 200))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
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

          {/* PDF Viewer Frame / SVG BBOX Canvas */}
          <div className="flex-1 bg-slate-950 p-3 overflow-auto flex items-center justify-center relative">
            {viewMode === "native" ? (
              <iframe
                key={`pdf-page-${activePage}-${zoomLevel}`}
                src={`${pdfUrl}#page=${activePage}&zoom=${zoomLevel}`}
                className="w-full h-full rounded border border-slate-800 bg-white"
                title="PDF Originale"
              />
            ) : (
              <div
                className="relative bg-slate-900/60 p-4 rounded-xl border border-slate-800 shadow-2xl flex items-center justify-center max-w-full max-h-full overflow-auto"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
              >
                <svg
                  viewBox="0 0 595 842"
                  className="w-[480px] h-[679px] max-w-full drop-shadow-2xl rounded border border-slate-700 select-none"
                  aria-label="Rappresentazione geometrica A4 coordinate BBOX"
                >
                  {/* Foglio A4 Bianco */}
                  <rect width="595" height="842" fill="#ffffff" rx="4" />

                  {/* Intestazione Geometrica Simulatore Atto */}
                  <text x="45" y="48" fontSize="12" fontWeight="bold" fill="#0f172a" fontFamily="sans-serif">
                    {municipalityName.toUpperCase()} · DICASTERO FINANZE
                  </text>
                  <text x="45" y="66" fontSize="9" fill="#475569" fontFamily="sans-serif">
                    {documentTitle} — Coordinate Ge.Co.Ti. Web (Pagina {activePage})
                  </text>
                  <line x1="45" y1="78" x2="550" y2="78" stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Righe guida del tabulato finanziario */}
                  {[120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640, 680, 720].map((y) => (
                    <line key={y} x1="45" y1={y} x2="550" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  ))}

                  {/* Altre celle sulla stessa pagina */}
                  {cells
                    .filter((c, idx) => c.page === activePage && idx !== activeCellIndex)
                    .map((c) => {
                      const x0 = c.bbox[0];
                      const top = c.bbox[1];
                      const w = Math.max(c.bbox[2] - c.bbox[0], 25);
                      const h = Math.max(c.bbox[3] - c.bbox[1], 12);
                      return (
                        <g key={c.id}>
                          <rect
                            x={x0}
                            y={top}
                            width={w}
                            height={h}
                            fill="rgba(148, 163, 184, 0.15)"
                            stroke="#94a3b8"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                            rx="2"
                          />
                          <text
                            x={x0}
                            y={Math.max(top - 3, 15)}
                            fontSize="7"
                            fill="#64748b"
                            fontFamily="monospace"
                          >
                            {c.metric_key}
                          </text>
                        </g>
                      );
                    })}

                  {/* Cella attiva con evidenziazione geometrica ad alto contrasto */}
                  {activeCell && activeCell.page === activePage && (
                    <g>
                      {/* Alone pulsante */}
                      <rect
                        x={activeCell.bbox[0] - 3}
                        y={activeCell.bbox[1] - 3}
                        width={Math.max(activeCell.bbox[2] - activeCell.bbox[0] + 6, 36)}
                        height={Math.max(activeCell.bbox[3] - activeCell.bbox[1] + 6, 20)}
                        rx="4"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity="0.8"
                        className="animate-pulse"
                      />
                      {/* Box principale evidenziato */}
                      <rect
                        x={activeCell.bbox[0]}
                        y={activeCell.bbox[1]}
                        width={Math.max(activeCell.bbox[2] - activeCell.bbox[0], 30)}
                        height={Math.max(activeCell.bbox[3] - activeCell.bbox[1], 14)}
                        rx="2"
                        fill="rgba(6, 182, 212, 0.3)"
                        stroke="#0891b2"
                        strokeWidth="2"
                      />
                      {/* Badge coordinate e valore */}
                      <g
                        transform={`translate(${Math.min(activeCell.bbox[0], 380)}, ${
                          activeCell.bbox[1] > 35 ? activeCell.bbox[1] - 22 : activeCell.bbox[1] + 24
                        })`}
                      >
                        <rect x="0" y="0" width="170" height="18" rx="3" fill="#0f172a" />
                        <text
                          x="6"
                          y="13"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#38bdf8"
                          fontFamily="monospace"
                        >
                          {Number(activeCell.amount_chf).toLocaleString("de-CH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          CHF · [{activeCell.bbox.map((n) => Math.round(n)).join(",")}]
                        </text>
                      </g>
                    </g>
                  )}
                </svg>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Hint Bar */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-cyan-400 font-semibold">[J/K]</span> Righe
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-amber-400 font-semibold">[E]</span> Rettifica
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-slate-400 font-semibold">[Esc]</span> Annulla
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-emerald-400 font-semibold">[A]</span> Approva
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-purple-400 font-semibold">[P]</span> Toggle PII
              </span>
            </div>
            <span className="text-slate-500 hidden sm:inline">Coordinate A4 [0..595, 0..842]</span>
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
                  id={`cell-row-${idx}`}
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
