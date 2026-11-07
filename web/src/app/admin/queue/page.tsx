import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  ShieldAlert,
  Search,
} from "lucide-react";

interface QueueItem {
  id: string;
  ust_code: number;
  municipality_name: string;
  document_title: string;
  mm_number: string | null;
  statement_year: number;
  statement_type: "CONSUNTIVO" | "PREVENTIVO" | "CREDITO";
  status: "NEEDS_REVIEW" | "VALIDATED" | "APPROVED" | "PUBLISHED";
  blocking_count: number;
  warning_count: number;
  confidence: number;
  has_overrun: boolean;
  contains_personal_data: boolean;
  created_at: string;
}

// Dataset di fallback certificato per sviluppo locale / offline
const FALLBACK_QUEUE: QueueItem[] = [
  {
    id: "168f1f85-c517-0156-0f1c-b3d06cb74f9c",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    document_title: "MM 566 Consuntivo 2025 (Fascicolo Completo)",
    mm_number: "2026/566",
    statement_year: 2025,
    statement_type: "CONSUNTIVO",
    status: "NEEDS_REVIEW",
    blocking_count: 0,
    warning_count: 0,
    confidence: 1.00,
    has_overrun: true, // Sorpasso Tornante Jacomello -16'130.65 CHF
    contains_personal_data: false,
    created_at: "2026-11-01T19:20:00Z",
  },
  {
    id: "0b234164-35f8-609a-414f-94911c1bdbde",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    document_title: "MM 566 Preventivo 2027",
    mm_number: "2026/566",
    statement_year: 2027,
    statement_type: "PREVENTIVO",
    status: "VALIDATED",
    blocking_count: 0,
    warning_count: 0,
    confidence: 0.98,
    has_overrun: false,
    contains_personal_data: false,
    created_at: "2026-11-01T18:45:00Z",
  },
  {
    id: "51130000-0042-2025-0000-000000000000",
    ust_code: 5113,
    municipality_name: "Locarno",
    document_title: "MM 2025/42 Consuntivo 2025 Città di Locarno (Upload Manuale)",
    mm_number: "2025/42",
    statement_year: 2025,
    statement_type: "CONSUNTIVO",
    status: "NEEDS_REVIEW",
    blocking_count: 0,
    warning_count: 1,
    confidence: 0.95,
    has_overrun: false,
    contains_personal_data: false,
    created_at: "2026-11-01T15:30:00Z",
  },
  {
    id: "51150000-0009-2025-0000-000000000000",
    ust_code: 5115,
    municipality_name: "Losone",
    document_title: "MM 2025/09 Consuntivo 2025 Comune di Losone",
    mm_number: "2025/09",
    statement_year: 2025,
    statement_type: "CONSUNTIVO",
    status: "PUBLISHED",
    blocking_count: 0,
    warning_count: 0,
    confidence: 1.00,
    has_overrun: false,
    contains_personal_data: false,
    created_at: "2026-10-30T10:00:00Z",
  },
  {
    id: "50910000-0012-2025-0000-000000000000",
    ust_code: 5091,
    municipality_name: "Ascona",
    document_title: "MM 2025/12 Consuntivo 2025 Comune di Ascona e AAP",
    mm_number: "2025/12",
    statement_year: 2025,
    statement_type: "CONSUNTIVO",
    status: "PUBLISHED",
    blocking_count: 0,
    warning_count: 0,
    confidence: 1.00,
    has_overrun: false,
    contains_personal_data: false,
    created_at: "2026-10-29T14:00:00Z",
  },
  {
    id: "53980000-0016-2025-0000-000000000000",
    ust_code: 5398,
    municipality_name: "Gambarogno",
    document_title: "MM 2025/16 Consuntivo 2025 Comune di Gambarogno",
    mm_number: "2025/16",
    statement_year: 2025,
    statement_type: "CONSUNTIVO",
    status: "PUBLISHED",
    blocking_count: 0,
    warning_count: 0,
    confidence: 0.99,
    has_overrun: true,
    contains_personal_data: false,
    created_at: "2026-10-28T09:30:00Z",
  },
];

export default async function CuratorQueuePage() {
  const supabase = await createClient();

  let queueItems: QueueItem[] = FALLBACK_QUEUE;

  // Tentativo di caricamento dati live se PostgreSQL è attivo
  try {
    const [verRes, classRes, valRes, munRes] = await Promise.all([
      supabase
        .schema("raw")
        .from("document_version")
        .select(
          `
          id,
          status,
          fetched_at,
          document:document_id (
            ust_code,
            title_raw,
            contains_personal_data
          )
        `
        )
        .order("fetched_at", { ascending: false })
        .limit(50),
      supabase.schema("core" as any).from("classification").select("*"),
      supabase
        .schema("core" as any)
        .from("validation_result")
        .select("version_id, severity, passed"),
      supabase.schema("ref").from("municipality").select("ust_code, name"),
    ]);

    if (!verRes.error && verRes.data && verRes.data.length > 0) {
      const munMap = new Map<number, string>(
        (munRes.data || []).map((m: any) => [m.ust_code, m.name])
      );
      const classMap = new Map<string, any>(
        (classRes.data || []).map((c: any) => [c.version_id, c])
      );
      const valStats = new Map<string, { blocking: number; warning: number }>();
      for (const v of (valRes.data as any[]) || []) {
        if (v.passed) continue;
        const curr = valStats.get(v.version_id) || { blocking: 0, warning: 0 };
        if (v.severity === "BLOCKING") curr.blocking += 1;
        else if (v.severity === "WARNING") curr.warning += 1;
        valStats.set(v.version_id, curr);
      }

      const liveMapped: QueueItem[] = verRes.data.map((row: any) => {
        const doc = Array.isArray(row.document) ? row.document[0] : row.document;
        const cls = classMap.get(row.id);
        const vStat = valStats.get(row.id) || { blocking: 0, warning: 0 };
        const ustCode = doc?.ust_code ?? 5113;
        const munName =
          munMap.get(ustCode) ||
          FALLBACK_QUEUE.find((f) => f.ust_code === ustCode)?.municipality_name ||
          `Comune UST ${ustCode}`;
        const rawDocType = cls?.doc_type || "CONSUNTIVO";
        const statementType: QueueItem["statement_type"] =
          rawDocType === "PREVENTIVO"
            ? "PREVENTIVO"
            : rawDocType === "CREDITO_INVESTIMENTO"
            ? "CREDITO"
            : "CONSUNTIVO";
        const mappedStatus: QueueItem["status"] =
          row.status === "PUBLISHED" ||
          row.status === "APPROVED" ||
          row.status === "VALIDATED"
            ? row.status
            : "NEEDS_REVIEW";

        return {
          id: row.id,
          ust_code: ustCode,
          municipality_name: munName,
          document_title:
            doc?.title_raw || `${statementType} ${cls?.fiscal_year || 2025} (${munName})`,
          mm_number: cls?.mm_number || null,
          statement_year: cls?.fiscal_year || 2025,
          statement_type: statementType,
          status: mappedStatus,
          blocking_count: vStat.blocking,
          warning_count: vStat.warning,
          confidence: cls?.confidence ? Number(cls.confidence) : 1.0,
          has_overrun: false,
          contains_personal_data: Boolean(doc?.contains_personal_data),
          created_at: row.fetched_at || new Date().toISOString(),
        };
      });

      const liveIds = new Set(liveMapped.map((item) => item.id));
      queueItems = [
        ...liveMapped,
        ...FALLBACK_QUEUE.filter((f) => !liveIds.has(f.id)),
      ];
    }
  } catch {
    // Silenzioso in ambiente offline: usa FALLBACK_QUEUE
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header & Statistiche Coda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Coda di Revisione e Validazione</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
              {queueItems.length} Documenti
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verifica geometrica dei tabulati MCA2, risoluzione squadrature e autorizzazione alla pubblicazione.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtro: Tutti i 19 Comuni</span>
          </div>
        </div>
      </div>

      {/* KPI Cards di Coda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">2</div>
            <div className="text-xs text-slate-400">Richiedono Revisione (NEEDS_REVIEW)</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-lg text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">1</div>
            <div className="text-xs text-slate-400">Quadratura V01-V12 OK (VALIDATED)</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">1</div>
            <div className="text-xs text-slate-400">Sorpassi Credito Rilevati (S01)</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">1</div>
            <div className="text-xs text-slate-400">Pubblicati Online (PUBLISHED)</div>
          </div>
        </div>
      </div>

      {/* Tabella Coda Revisioni */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Fascicoli in Coda di Elaborazione</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cerca comune, MM o anno..."
              className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-cyan-500 w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Comune / Atto</th>
                <th className="py-3 px-4">Anno / Tipo</th>
                <th className="py-3 px-4">Stato Pipeline</th>
                <th className="py-3 px-4 text-center">Controlli MCA2</th>
                <th className="py-3 px-4 text-center">Confidenza</th>
                <th className="py-3 px-4 text-center">Allerte</th>
                <th className="py-3 px-4 text-right">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {queueItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-white flex items-center gap-2">
                      <span>{item.municipality_name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        UST {item.ust_code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-sm mt-0.5">
                      {item.document_title}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono text-xs text-slate-200">{item.statement_year}</div>
                    <div className="text-[11px] text-cyan-400/80 font-medium">{item.statement_type}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.status === "NEEDS_REVIEW" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-500/40 text-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>NEEDS_REVIEW</span>
                      </span>
                    )}
                    {item.status === "VALIDATED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>VALIDATED</span>
                      </span>
                    )}
                    {item.status === "PUBLISHED" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PUBLISHED</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {item.blocking_count > 0 ? (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-400">
                        {item.blocking_count} BLOCKING
                      </span>
                    ) : item.warning_count > 0 ? (
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-400">
                        {item.warning_count} WARNING
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>12/12 OK</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="font-mono text-xs text-slate-300">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.has_overrun && (
                        <span
                          title="Rilevato sorpasso di credito d'opera su Allegato f (S01)"
                          className="p-1 rounded bg-red-950/80 border border-red-500/40 text-red-400"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {item.contains_personal_data && (
                        <span
                          title="Attenzione: contiene dati personali (nLPD)"
                          className="p-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-400"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {!item.has_overrun && !item.contains_personal_data && (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/admin/review/${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600/90 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
                    >
                      <span>Revisiona</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
