/**
 * Esporta l'anagrafica dei Comuni (fonte unica: src/data/municipalities.ts)
 * in registry/anagrafica_web.json, letta dalla pipeline Python per generare
 * gli open data. Evita copie divergenti dei dati anagrafici.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { MUNICIPALITIES } from "../src/data/municipalities";

const out = join(process.cwd(), "..", "registry", "anagrafica_web.json");
const rows = MUNICIPALITIES.map((m) => ({
  ust_code: m.ust_code,
  name: m.name,
  slug: m.slug,
  circle: m.circle,
  population: m.population,
  multipliers_history: m.multipliers_history,
  tax_multiplier_pf: m.tax_multiplier_pf,
  tax_multiplier_pg: m.tax_multiplier_pg,
  waste_base_fee: m.waste_base_fee,
  civic_tariffs: m.civic_tariffs,
}));
writeFileSync(out, JSON.stringify(rows, null, 2) + "\n");
console.log(`Scritte ${rows.length} anagrafiche in ${out}`);
