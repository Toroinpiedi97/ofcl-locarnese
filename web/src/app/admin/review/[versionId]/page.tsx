import { getPresignedPdfUrl } from "@/lib/r2";
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

  // Generazione del Presigned URL per visualizzare il PDF originale da Cloudflare R2
  const r2Key = `pdf/5096/168f1f85c51701560f1cb3d06cb74f9ce981337517ba6ff1c7f5b26047505aee.pdf`;
  const presignedPdfUrl = await getPresignedPdfUrl(r2Key, 900); // 15 minuti di validità

  return (
    <SplitViewCurator
      versionId={versionId}
      municipalityName="Brione sopra Minusio"
      ustCode={5096}
      documentTitle="MM 566 Consuntivo 2025"
      mmNumber="2026/566"
      year={2025}
      status="NEEDS_REVIEW"
      pdfUrl={presignedPdfUrl}
      documentId="doc-5096-2025"
      initialCells={SEED_CELLS}
      checks={SEED_CHECKS}
    />
  );
}
