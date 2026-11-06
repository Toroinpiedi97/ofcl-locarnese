/**
 * Gate di integrità dati: `pnpm validate:data`. Esce con codice 1 se trova errori.
 * Eseguito in prebuild (Vercel) e in CI, così dati incoerenti non vengono mai pubblicati.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkOpenData, checkStructuredData } from "../src/lib/data-integrity";

const dir = join(process.cwd(), "public", "data", "opendata");
const read = (f: string) => readFileSync(join(dir, f), "utf-8");

const a = checkStructuredData();
const b = checkOpenData({
  bilanci: read("bilanci_mca2.csv"),
  bilanciExcel: read("bilanci_mca2_excel_ch.csv"),
  indicatori: read("indicatori_sel.csv"),
  indicatoriExcel: read("indicatori_sel_excel_ch.csv"),
  tariffe: read("tariffe_sussidi_comunali.csv"),
});
const errors = [...a.errors, ...b.errors];
const warnings = [...a.warnings, ...b.warnings];
warnings.forEach((w) => console.warn(`⚠ ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));
console.log(`validate:data → ${errors.length} errori, ${warnings.length} avvisi`);
process.exit(errors.length ? 1 : 0);
