import { redirect } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Activity,
} from "lucide-react";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import {
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
} from "@/lib/admin-session-edge";
import { MUNICIPALITIES } from "@/data/municipalities";
import QueueTableClient, { QueueItem } from "./QueueTableClient";

export const dynamic = "force-dynamic";

// Dataset isolato esclusivamente per la sandbox offline / E2E Playwright
const SANDBOX_E2E_QUEUE: QueueItem[] = [
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
    validation_total: 6,
    confidence: 1.0,
    has_overrun: true,
    contains_personal_data: false,
    acquisition: "CRAWLER",
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
    validation_total: 6,
    confidence: 0.98,
    has_overrun: false,
    contains_personal_data: false,
    acquisition: "CRAWLER",
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
    validation_total: 6,
    confidence: 0.95,
    has_overrun: false,
    contains_personal_data: false,
    acquisition: "MANUAL_UPLOAD",
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
    validation_total: 6,
    confidence: 1.0,
    has_overrun: false,
    contains_personal_data: false,
    acquisition: "CRAWLER",
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
    validation_total: 6,
    confidence: 1.0,
    has_overrun: false,
    contains_personal_data: false,
    acquisition: "CRAWLER",
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
    validation_total: 6,
    confidence: 0.99,
    has_overrun: true,
    contains_personal_data: false,
    acquisition: "CRAWLER",
    created_at: "2026-10-28T09:30:00Z",
  },
];

interface PipelineRunSummary {
  id: string;
  stage: string;
  status: string;
  git_sha: string;
  started_at: string;
  finished_at: string | null;
  discovered: number | null;
  downloaded: number | null;
  skippedPrivacy: number | null;
}

export default async function CuratorQueuePage() {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    redirect("/admin/login");
  }

  const sandboxMode = isOfflineDevSandbox();
  const liveDbMode = hasLiveSupabaseConfig() && !sandboxMode;

  let queueItems: QueueItem[] = sandboxMode ? SANDBOX_E2E_QUEUE : [];
  let latestRun: PipelineRunSummary | null = null;
  let dbError: string | null = null;

  if (liveDbMode) {
    try {
      const db = await getAdminDbClient();

      const [verRes, classRes, valRes, credRes, munRes, runsRes] =
        await Promise.all([
          db
            .schema("raw")
            .from("document_version")
            .select(
              `
              id,
              status,
              fetched_at,
              document:document_id (
                ust_code,
                origin_url,
                title_raw,
                acquisition,
                contains_personal_data
              )
            `
            )
            .order("fetched_at", { ascending: false })
            .limit(100),
          db.schema("core").from("classification").select("*"),
          db
            .schema("core")
            .from("validation_result")
            .select("version_id, severity, passed"),
          db
            .schema("core")
            .from("credit_snapshot")
            .select("version_id, overrun")
            .eq("overrun", true),
          db.schema("ref").from("municipality").select("ust_code, name"),
          db
            .schema("raw")
            .from("pipeline_run")
            .select("id, stage, status, git_sha, started_at, finished_at, report")
            .order("started_at", { ascending: false })
            .limit(3),
        ]);

      if (verRes.error) {
        dbError = `Errore lettura raw.document_version: ${verRes.error.message}`;
      } else {
        const munMap = new Map<number, string>(
          (munRes.data || []).map((m) => [m.ust_code, m.name])
        );
        const classMap = new Map(
          (classRes.data || []).map((c) => [c.version_id, c])
        );
        const overrunSet = new Set<string>(
          (credRes.data || []).map((c) => c.version_id)
        );
        const valStats = new Map<
          string,
          { blocking: number; warning: number; total: number }
        >();
        for (const v of valRes.data || []) {
          const curr = valStats.get(v.version_id) || {
            blocking: 0,
            warning: 0,
            total: 0,
          };
          curr.total += 1;
          if (!v.passed) {
            if (v.severity === "BLOCKING") curr.blocking += 1;
            else if (v.severity === "WARNING") curr.warning += 1;
          }
          valStats.set(v.version_id, curr);
        }

        queueItems = (verRes.data || []).map((row) => {
          const doc = Array.isArray(row.document)
            ? row.document[0]
            : row.document;
          const cls = classMap.get(row.id);
          const vStat = valStats.get(row.id) || {
            blocking: 0,
            warning: 0,
            total: 0,
          };
          const ustCode = doc?.ust_code ?? 5113;
          const munName =
            munMap.get(ustCode) ||
            MUNICIPALITIES.find((m) => m.ust_code === ustCode)?.name ||
            `Comune UST ${ustCode}`;

          const rawDocType = cls?.doc_type;
          const statementType: QueueItem["statement_type"] =
            rawDocType === "PREVENTIVO"
              ? "PREVENTIVO"
              : rawDocType === "CREDITO_INVESTIMENTO"
                ? "CREDITO"
                : rawDocType === "PIANO_FINANZIARIO"
                  ? "PIANO_FINANZIARIO"
                  : rawDocType === "CONSUNTIVO"
                    ? "CONSUNTIVO"
                    : "ALTRO";

          return {
            id: row.id,
            ust_code: ustCode,
            municipality_name: munName,
            document_title:
              doc?.title_raw ||
              `${statementType} ${cls?.fiscal_year ?? ""} (${munName})`.trim(),
            mm_number: cls?.mm_number ?? null,
            statement_year: cls?.fiscal_year ?? null,
            statement_type: statementType,
            status: row.status === "SUPERSEDED" ? "REJECTED" : row.status,
            blocking_count: vStat.blocking,
            warning_count: vStat.warning,
            validation_total: vStat.total,
            confidence:
              cls?.confidence !== undefined ? Number(cls.confidence) : null,
            has_overrun: overrunSet.has(row.id),
            contains_personal_data: Boolean(doc?.contains_personal_data),
            acquisition: doc?.acquisition,
            origin_url: doc?.origin_url ?? null,
            created_at: row.fetched_at || new Date().toISOString(),
          };
        });
      }

      if (!runsRes.error && runsRes.data && runsRes.data.length > 0) {
        const r = runsRes.data[0];
        const rep =
          r.report && typeof r.report === "object" && !Array.isArray(r.report)
            ? (r.report as Record<string, unknown>)
            : null;
        const sc =
          rep?.status_counts &&
          typeof rep.status_counts === "object" &&
          !Array.isArray(rep.status_counts)
            ? (rep.status_counts as Record<string, unknown>)
            : null;

        latestRun = {
          id: r.id,
          stage: r.stage,
          status: r.status,
          git_sha: r.git_sha,
          started_at: r.started_at,
          finished_at: r.finished_at,
          discovered:
            typeof rep?.total_discovered_docs === "number"
              ? rep.total_discovered_docs
              : null,
          downloaded:
            typeof sc?.DOWNLOADED === "number" ? sc.DOWNLOADED : null,
          skippedPrivacy:
            typeof sc?.SKIPPED_PRIVACY === "number" ? sc.SKIPPED_PRIVACY : null,
        };
      }
    } catch (err) {
      dbError =
        err instanceof Error
          ? err.message
          : "Errore di connessione a Supabase nella coda curatore.";
    }
  }

  const needsReviewCount = queueItems.filter(
    (i) =>
      i.status === "NEEDS_REVIEW" ||
      i.status === "DOWNLOADED" ||
      i.status === "CLASSIFIED" ||
      i.status === "EXTRACTED"
  ).length;
  const validatedCount = queueItems.filter(
    (i) => i.status === "VALIDATED"
  ).length;
  const overrunCount = queueItems.filter((i) => i.has_overrun).length;
  const publishedCount = queueItems.filter(
    (i) => i.status === "PUBLISHED" || i.status === "APPROVED"
  ).length;

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header & Statistiche Coda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Coda di Revisione e Validazione</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono">
              {queueItems.length} Documenti
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verifica geometrica dei tabulati MCA2, risoluzione squadrature e
            autorizzazione alla pubblicazione.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Fonte:{" "}
              {liveDbMode ? "PostgreSQL / Supabase Live" : "Sandbox E2E"}
            </span>
          </div>
        </div>
      </div>

      {/* Banner Errore DB Esplicito (Mai mascherato da dati finti) */}
      {dbError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Errore caricamento dati reali</p>
            <p className="mt-1 font-mono text-[11px]">{dbError}</p>
          </div>
        </div>
      )}

      {/* Telemetria Sonda Settimanale (raw.pipeline_run) */}
      {liveDbMode && (
        <div className="mb-6 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Telemetria Sonda Settimanale</span>
                {latestRun ? (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      latestRun.status === "OK"
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : latestRun.status === "PARTIAL"
                          ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                          : "bg-red-950/60 border-red-500/40 text-red-300"
                    }`}
                  >
                    {latestRun.stage} · {latestRun.status}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    Nessun run registrato
                  </span>
                )}
              </div>
              {latestRun ? (
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Ultimo run:{" "}
                  {new Date(latestRun.started_at).toLocaleString("it-CH")} ·
                  Scoperti: {latestRun.discovered ?? "n.d."} · Scaricati:{" "}
                  {latestRun.downloaded ?? "n.d."} · Esclusi nLPD:{" "}
                  {latestRun.skippedPrivacy ?? 0} · Commit{" "}
                  {latestRun.git_sha.slice(0, 7)}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  Avvia il workflow <code>Crawl Settimanale</code> su GitHub
                  Actions oppure <code>ofcl crawl --ingest-http</code> per
                  popolare automaticamente i fascicoli dei 19 Comuni.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards di Coda Dinamiche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-950/50 border border-amber-500/30 rounded-lg text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">
              {needsReviewCount}
            </div>
            <div className="text-xs text-slate-400">
              In Attesa / Da Revisionare
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-950/50 border border-cyan-500/30 rounded-lg text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">
              {validatedCount}
            </div>
            <div className="text-xs text-slate-400">
              Quadratura V01-V12 OK (VALIDATED)
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-lg text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">
              {overrunCount}
            </div>
            <div className="text-xs text-slate-400">
              Sorpassi Credito Rilevati (S01)
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">
              {publishedCount}
            </div>
            <div className="text-xs text-slate-400">
              Pubblicati Online (PUBLISHED)
            </div>
          </div>
        </div>
      </div>

      {/* Tabella Coda Revisioni Reattiva con Ricerca e Filtri */}
      <QueueTableClient initialItems={queueItems} />
    </div>
  );
}
