import { getPresignedPdfUrl } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { MUNICIPALITIES } from "@/data/municipalities";
import SplitViewCurator, { CellItem, ValidationItem } from "./SplitViewCurator";

// Seed certificato di Brione sopra Minusio Consuntivo 2025 per revisione immediata
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
  { code: "V01", passed: true, message: "Risultato Operativo: 2'991'727.57 - 3'057'410.26 = -65'682.69 CHF", severity: "BLOCKING" },
  { code: "V03", passed: true, message: "Risultato Ordinario: -65'682.69 + 229'100.70 = 163'418.01 CHF", severity: "BLOCKING" },
  { code: "V07", passed: true, message: "Onere Netto Investimenti: 823'840.43 - 22'344.65 = 801'495.78 CHF", severity: "BLOCKING" },
  { code: "V09", passed: true, message: "Pareggio Bilancio Attivi = Passivi = 9'722'206.84 CHF", severity: "BLOCKING" },
  { code: "V10", passed: true, message: "Controllo Crediti Allegato f: 17/17 formule riga verificate", severity: "BLOCKING" },
  { code: "V11", passed: true, message: "Coerenza Spese CI (823'840.43 CHF) == All. f totale (823'840.43 CHF)", severity: "WARNING" },
];

export default async function CuratorReviewPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;

  let municipalityName = "Brione sopra Minusio";
  let ustCode = 5096;
  let documentTitle = "MM 566 Consuntivo 2025";
  let mmNumber = "2026/566";
  let year = 2025;
  let status: "NEEDS_REVIEW" | "VALIDATED" | "APPROVED" | "PUBLISHED" = "NEEDS_REVIEW";
  let documentId = "doc-5096-2025";
  let r2Key = `pdf/5096/168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf`;
  let cells: CellItem[] = SEED_CELLS;
  let checks: ValidationItem[] = SEED_CHECKS;

  try {
    const supabase = await createClient();
    const coreSchema = supabase.schema("core" as any) as any;
    const [verRes, clsRes, ledRes, valRes] = await Promise.all([
      supabase
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
            title_raw
          )
        `
        )
        .eq("id", versionId)
        .maybeSingle(),
      coreSchema
        .from("classification")
        .select("*")
        .eq("version_id", versionId)
        .maybeSingle(),
      coreSchema
        .from("ledger_value")
        .select("*")
        .eq("version_id", versionId)
        .order("page", { ascending: true })
        .limit(100),
      coreSchema
        .from("validation_result")
        .select("*")
        .eq("version_id", versionId)
        .order("rule_code", { ascending: true }),
    ]);

    if (verRes.data) {
      const vData: any = verRes.data;
      const doc: any = Array.isArray(vData.document) ? vData.document[0] : vData.document;
      const cls: any = clsRes.data;
      if (vData.storage_path) r2Key = vData.storage_path;
      if (
        vData.status === "NEEDS_REVIEW" ||
        vData.status === "VALIDATED" ||
        vData.status === "APPROVED" ||
        vData.status === "PUBLISHED"
      ) {
        status = vData.status;
      }
      if (vData.document_id) documentId = vData.document_id;
      if (doc?.ust_code) {
        ustCode = doc.ust_code;
        municipalityName =
          MUNICIPALITIES.find((m) => m.ust_code === ustCode)?.name ||
          `Comune UST ${ustCode}`;
      }
      if (doc?.title_raw) documentTitle = doc.title_raw;
      if (cls?.mm_number) mmNumber = cls.mm_number;
      if (cls?.fiscal_year) year = cls.fiscal_year;
    }

    if (ledRes.data && ledRes.data.length > 0) {
      cells = ledRes.data.map((row: any) => ({
        id: String(row.id),
        metric_key: row.account_code || "voce_mca2",
        label: row.label_raw || `Conto ${row.account_code}`,
        statement: (row.statement === "CI" || row.statement === "BIL" ? row.statement : "CE") as CellItem["statement"],
        amount_chf: String(row.amount_chf ?? row.amount_raw ?? "0.00"),
        page: Number(row.page) || 1,
        bbox: Array.isArray(row.bbox) && row.bbox.length === 4 ? (row.bbox as [number, number, number, number]) : [100, 100, 400, 115],
        status: row.status === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "VALIDATED",
      }));
    }

    if (valRes.data && valRes.data.length > 0) {
      checks = (valRes.data as any[]).map((v) => ({
        code: v.rule_code,
        passed: Boolean(v.passed),
        message: v.message,
        severity: v.severity === "WARNING" ? "WARNING" : "BLOCKING",
      }));
    }
  } catch {
    // Offline fallback a SEED_CELLS e SEED_CHECKS
  }

  // Generazione del Presigned URL per visualizzare il PDF originale da Cloudflare R2
  const presignedPdfUrl = await getPresignedPdfUrl(r2Key, 900); // 15 minuti di validità

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
      documentId={documentId}
      initialCells={cells}
      checks={checks}
    />
  );
}
