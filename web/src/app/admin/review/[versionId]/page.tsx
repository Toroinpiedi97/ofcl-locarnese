import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import {
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
} from "@/lib/admin-session-edge";
import { getPresignedPdfUrl } from "@/lib/r2";
import { MUNICIPALITIES } from "@/data/municipalities";
import SplitViewCurator, {
  CellItem,
  ValidationItem,
} from "./SplitViewCurator";

export const dynamic = "force-dynamic";

const SANDBOX_VERSION_ID = "168f1f85-c517-0156-0f1c-b3d06cb74f9c";

const SEED_CELLS: CellItem[] = [
  {
    id: "cell-01",
    metric_key: "spese_operative",
    label: "Spese Operative (Stadio 1)",
    statement: "CE",
    amount_chf: "3057410.26",
    page: 5,
    bbox: [306.7, 135.5, 363.0, 145.5],
    status: "VALIDATED",
  },
  {
    id: "cell-02",
    metric_key: "ricavi_operativi",
    label: "Ricavi Operativi (Stadio 1)",
    statement: "CE",
    amount_chf: "2991727.57",
    page: 5,
    bbox: [306.7, 148.0, 363.0, 158.0],
    status: "VALIDATED",
  },
  {
    id: "cell-03",
    metric_key: "risultato_operativo",
    label: "Risultato Operativo (Disavanzo)",
    statement: "CE",
    amount_chf: "-65682.69",
    page: 5,
    bbox: [389.9, 160.0, 436.6, 170.0],
    status: "VALIDATED",
  },
  {
    id: "cell-04",
    metric_key: "risultato_ordinario",
    label: "Risultato Ordinario d'Esercizio",
    statement: "CE",
    amount_chf: "163418.01",
    page: 5,
    bbox: [393.7, 220.0, 442.5, 230.0],
    status: "VALIDATED",
  },
  {
    id: "cell-05",
    metric_key: "onere_netto_investimenti",
    label: "Onere Netto per Investimenti",
    statement: "CI",
    amount_chf: "801495.78",
    page: 5,
    bbox: [395.1, 339.3, 444.0, 349.2],
    status: "VALIDATED",
  },
  {
    id: "cell-06",
    metric_key: "autofinanziamento",
    label: "Autofinanziamento Indiretto",
    statement: "CF",
    amount_chf: "437731.39",
    page: 5,
    bbox: [395.1, 388.7, 444.0, 398.7],
    status: "VALIDATED",
  },
  {
    id: "cell-07",
    metric_key: "risultato_globale",
    label: "Risultato Globale di Finanziamento",
    statement: "CF",
    amount_chf: "-363764.39",
    page: 5,
    bbox: [389.9, 410.0, 436.6, 420.0],
    status: "VALIDATED",
  },
  {
    id: "cell-08",
    metric_key: "totale_attivi",
    label: "Totale Attivi (Bilancio)",
    statement: "BIL",
    amount_chf: "9722206.84",
    page: 5,
    bbox: [387.7, 474.0, 444.0, 484.0],
    status: "VALIDATED",
  },
  {
    id: "cell-09",
    metric_key: "tornante_jacomello",
    label: "All. f: Tornante Jacomello (615.5010.200)",
    statement: "CRED",
    amount_chf: "377130.65",
    page: 126,
    bbox: [100.0, 250.0, 450.0, 265.0],
    status: "NEEDS_REVIEW",
    is_overrun: true,
    suggested_correction: "361000.00",
  },
];

const SEED_CHECKS: ValidationItem[] = [
  {
    code: "V01",
    passed: true,
    message:
      "Risultato Operativo: 2'991'727.57 - 3'057'410.26 = -65'682.69 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V03",
    passed: true,
    message:
      "Risultato Ordinario: -65'682.69 + 229'100.70 = 163'418.01 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V07",
    passed: true,
    message:
      "Onere Netto Investimenti: 823'840.43 - 22'344.65 = 801'495.78 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V09",
    passed: true,
    message: "Pareggio Bilancio Attivi = Passivi = 9'722'206.84 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V10",
    passed: true,
    message: "Controllo Crediti Allegato f: 17/17 formule riga verificate",
    severity: "BLOCKING",
  },
  {
    code: "V11",
    passed: true,
    message:
      "Coerenza Spese CI (823'840.43 CHF) == All. f totale (823'840.43 CHF)",
    severity: "WARNING",
  },
];

export default async function CuratorReviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    redirect("/admin/login");
  }

  const { versionId } = await params;
  const sandboxMode = isOfflineDevSandbox();
  const liveDbMode = hasLiveSupabaseConfig() && !sandboxMode;

  if (!liveDbMode && sandboxMode && versionId === SANDBOX_VERSION_ID) {
    const sandboxPdfUrl = await getPresignedPdfUrl(
      "pdf/5096/168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf",
      900
    );
    return (
      <SplitViewCurator
        versionId={versionId}
        municipalityName="Brione sopra Minusio"
        ustCode={5096}
        documentTitle="MM 566 Consuntivo 2025"
        mmNumber="2026/566"
        year={2025}
        status="NEEDS_REVIEW"
        pdfUrl={sandboxPdfUrl}
        originUrl={null}
        documentId="doc-5096-2025"
        initialContainsPii={false}
        initialCells={SEED_CELLS}
        checks={SEED_CHECKS}
      />
    );
  }

  let dbError: string | null = null;
  try {
    const db = await getAdminDbClient();
    const [verRes, clsRes, ledRes, valRes, credRes] = await Promise.all([
      db
        .schema("raw")
        .from("document_version")
        .select(
          `
          id,
          document_id,
          storage_path,
          status,
          document:document_id (
            id,
            ust_code,
            title_raw,
            origin_url,
            contains_personal_data
          )
        `
        )
        .eq("id", versionId)
        .maybeSingle(),
      db
        .schema("core")
        .from("classification")
        .select("*")
        .eq("version_id", versionId)
        .maybeSingle(),
      db
        .schema("core")
        .from("ledger_value")
        .select("*")
        .eq("version_id", versionId)
        .order("page", { ascending: true })
        .limit(150),
      db
        .schema("core")
        .from("validation_result")
        .select("*")
        .eq("version_id", versionId)
        .order("rule_code", { ascending: true }),
      db
        .schema("core")
        .from("credit_snapshot")
        .select(
          `
          version_id,
          credit_id,
          fiscal_year,
          spent_total,
          amount_voted,
          residual,
          overrun,
          page,
          credit:credit_id (
            account_full,
            title
          )
        `
        )
        .eq("version_id", versionId)
        .order("page", { ascending: true })
        .limit(100),
    ]);

    if (verRes.error) {
      dbError = verRes.error.message;
    } else if (!verRes.data) {
      return (
        <div className="p-8 max-w-3xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-white">
              Fascicolo non trovato
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Nessuna versione trovata in <code>raw.document_version</code> per
              ID <code className="text-cyan-400">{versionId}</code>.
            </p>
            <Link
              href="/admin/queue"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna alla Coda di Revisione</span>
            </Link>
          </div>
        </div>
      );
    } else {
      const vData = verRes.data;
      const doc = Array.isArray(vData.document)
        ? vData.document[0]
        : vData.document;
      const cls = clsRes.data;

      const ustCode = doc?.ust_code ?? 5113;
      const municipalityName =
        MUNICIPALITIES.find((m) => m.ust_code === ustCode)?.name ||
        `Comune UST ${ustCode}`;
      const documentTitle = doc?.title_raw || `Fascicolo ${municipalityName}`;
      const mmNumber = cls?.mm_number || "n.d.";
      const year = cls?.fiscal_year || new Date().getUTCFullYear();
      const status =
        vData.status === "SUPERSEDED" ? "REJECTED" : vData.status;

      const cellStatus: CellItem["status"] =
        status === "APPROVED" || status === "PUBLISHED"
          ? "APPROVED"
          : status === "VALIDATED"
            ? "VALIDATED"
            : "NEEDS_REVIEW";

      const cells: CellItem[] = (ledRes.data || []).map((row) => ({
        id: String(row.id),
        metric_key: row.account_code || row.function_code || "voce_mca2",
        label:
          row.label_raw ||
          `Conto ${row.account_code || row.function_code || "MCA2"}`,
        statement: row.statement || "CE",
        amount_chf: String(row.amount_chf ?? row.amount_raw ?? "0.00"),
        page: Number(row.page) || 1,
        bbox:
          Array.isArray(row.bbox) && row.bbox.length === 4
            ? row.bbox.map(Number)
            : [100, 100, 400, 115],
        status: cellStatus,
      }));

      for (const cs of credRes.data || []) {
        const cr = Array.isArray(cs.credit) ? cs.credit[0] : cs.credit;
        cells.push({
          id: `cred-${cs.credit_id}`,
          metric_key: cr?.account_full || "credito",
          label: `All. f: ${cr?.title || "Credito d'opera"} (${cr?.account_full || "-"})`,
          statement: "CRED",
          amount_chf: String(cs.spent_total ?? "0.00"),
          page: Number(cs.page) || 1,
          bbox: [80, 220, 480, 236],
          status: cs.overrun ? "NEEDS_REVIEW" : cellStatus,
          is_overrun: Boolean(cs.overrun),
          suggested_correction:
            cs.overrun && cs.amount_voted !== null
              ? String(cs.amount_voted)
              : undefined,
        });
      }

      const checks: ValidationItem[] = (valRes.data || []).map((v) => ({
        code: v.rule_code,
        passed: Boolean(v.passed),
        message: v.message,
        severity:
          v.severity === "WARNING"
            ? "WARNING"
            : v.severity === "INFO"
              ? "INFO"
              : "BLOCKING",
      }));

      const presignedPdfUrl = vData.storage_path
        ? await getPresignedPdfUrl(vData.storage_path, 900)
        : null;

      return (
        <SplitViewCurator
          versionId={versionId}
          municipalityName={municipalityName}
          ustCode={ustCode}
          documentTitle={documentTitle}
          mmNumber={mmNumber}
          year={year}
          status={status}
          pdfUrl={presignedPdfUrl}
          originUrl={doc?.origin_url ?? null}
          documentId={vData.document_id}
          initialContainsPii={Boolean(doc?.contains_personal_data)}
          initialCells={cells}
          checks={checks}
        />
      );
    }
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Errore connessione Supabase in Split-View.";
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-6 text-red-200">
        <h1 className="text-base font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span>Impossibile caricare il fascicolo {versionId}</span>
        </h1>
        {dbError && (
          <p className="text-xs font-mono mt-2 text-red-300">{dbError}</p>
        )}
        <Link
          href="/admin/queue"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla Coda</span>
        </Link>
      </div>
    </div>
  );
}
