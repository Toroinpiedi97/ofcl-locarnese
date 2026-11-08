"use client";

import { useState, useCallback } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Lock, X } from "lucide-react";
import { MUNICIPALITIES } from "@/data/municipalities";
import { uploadDocumentManualAction } from "./actions";

export default function CuratorUploadPage() {
  const [municipality, setMunicipality] = useState("5113"); // Default: Città di Locarno
  const [statementType, setStatementType] = useState("CONSUNTIVO");
  const [year, setYear] = useState("2025");
  const [mmNumber, setMmNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const validateAndSetFile = useCallback((selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf") && selectedFile.type !== "application/pdf") {
      setFeedback({ text: "Il file deve essere in formato PDF valido (.pdf).", type: "err" });
      setFile(null);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setFeedback({ text: "La dimensione del file supera il limite consentito di 50 MB.", type: "err" });
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setFeedback(null);
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setFeedback({ text: "Seleziona un file PDF valido.", type: "err" });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("municipality", municipality);
      formData.append("statementType", statementType);
      formData.append("year", year);
      formData.append("mmNumber", mmNumber);
      formData.append("notes", notes);

      const res = await uploadDocumentManualAction(formData);
      setUploading(false);
      setFeedback({
        text: res.message,
        type: res.success ? "ok" : "err",
      });
      if (res.success) {
        setFile(null);
        setMmNumber("");
        setNotes("");
      }
    } catch {
      setUploading(false);
      setFeedback({
        text: "Errore imprevisto durante il caricamento del fascicolo.",
        type: "err",
      });
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <UploadCloud className="w-7 h-7 text-emerald-400" />
          <span>Upload Manuale Fascicoli Ufficiali</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Canale autorizzato per il deposito di bilanci acquisiti manualmente (Città di Locarno, risposte LIT o atti scansionati).
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="mb-6 p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg flex items-start gap-3 text-xs text-cyan-200">
          <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Guardrail C-02 & C-04:</strong> Il caricamento manuale calcola l&apos;hash crittografico immutabile SHA-256,
            applica la verifica preventiva di assenza dati personali (nLPD) e registra la provenienza <code>MANUAL_UPLOAD</code> in <code>raw.document</code>.
          </span>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm ${
              feedback.type === "ok"
                ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-200"
                : "bg-red-950/60 border border-red-500/30 text-red-200"
            }`}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Comune di Riferimento
              </label>
              <select
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="5113">Città di Locarno (UST 5113)</option>
                {MUNICIPALITIES.filter((m) => m.ust_code !== 5113).map((m) => (
                  <option key={m.ust_code} value={String(m.ust_code)}>
                    {m.name} (UST {m.ust_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Tipo Documento & Anno
              </label>
              <div className="flex gap-2">
                <select
                  value={statementType}
                  onChange={(e) => setStatementType(e.target.value)}
                  className="w-2/3 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="CONSUNTIVO">Consuntivo (CC)</option>
                  <option value="PREVENTIVO">Preventivo (CC)</option>
                  <option value="CREDITO">Messaggio Credito d&apos;Opera</option>
                  <option value="PIANO_FIN">Piano Finanziario</option>
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-1/3 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="2027">2027</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Numero Messaggio Municipale (MM)
              </label>
              <input
                type="text"
                value={mmNumber}
                onChange={(e) => setMmNumber(e.target.value)}
                placeholder="es. 030/2024 oppure MM 566"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Origine / Riscontro LIT
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="es. Richiesta accesso atti LIT prot. 2026/89"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Area File Drop / Select */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              File PDF Ufficiale (max 50 MB)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) validateAndSetFile(dropped);
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/30 scale-[1.01]"
                  : "border-slate-700 hover:border-cyan-500/80 bg-slate-950/60"
              }`}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                id="pdf-file-input"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) validateAndSetFile(selected);
                }}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-full text-emerald-400 mb-3">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-semibold text-white tracking-tight">
                    {file.name}
                  </span>
                  <span className="text-xs font-mono text-cyan-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · File pronto per l&apos;invio
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rimuovi file</span>
                  </button>
                </div>
              ) : (
                <label htmlFor="pdf-file-input" className="cursor-pointer flex flex-col items-center">
                  <FileText className="w-10 h-10 text-cyan-400 mb-3" />
                  <span className="text-sm font-medium text-white">
                    Trascina qui il file PDF o fai clic per selezionarlo
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Formato accettato: solo documenti digitali PDF validi (%PDF-, max 50 MB)
                  </span>
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            {uploading ? "Caricamento e calcolo SHA-256..." : "Carica su Cloudflare R2 e Invia alla Coda"}
          </button>
        </form>
      </div>
    </div>
  );
}
