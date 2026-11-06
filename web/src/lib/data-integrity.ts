/**
 * Controlli di integrità dei dati pubblicati (anagrafica, crediti, documenti,
 * file open data). Pensato per evitare "strafalcioni di visualizzazione":
 * numeri incoerenti, anagrafiche disallineate, placeholder spacciati per dati.
 *
 * Usato da `scripts/validate-data.ts` (prebuild + CI) e dai test.
 * Import relativi: eseguibile con tsx senza alias di path.
 */
import { z } from "zod";
import { MUNICIPALITIES } from "../data/municipalities";
import { INVESTMENT_CREDITS } from "../data/credits";
import { OFFICIAL_DOCUMENTS } from "../data/documents";

const CENT = 0.01;
const money = z.number().finite();
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const YEARS = z.number().int().min(2015).max(2035);

const multiplier = z.number().min(30).max(150);

export const municipalitySchema = z.object({
  ust_code: z.number().int().min(5001).max(5999),
  name: z.string().trim().min(2),
  slug: z.string().regex(SLUG),
  circle: z.string().trim().min(2),
  seat: z.string().trim().min(5),
  population: z.number().int().min(50).max(40000),
  tax_multiplier_pf: multiplier,
  tax_multiplier_pg: multiplier,
  has_differentiated_pg: z.boolean(),
  multipliers_history: z.record(z.string(), z.object({ pf: multiplier, pg: multiplier })),
  population_history: z.record(z.string(), z.number().int().min(50).max(40000)),
  waste_base_fee: z.string().regex(/^\d+\.\d{2} CHF\/anno$/),
  entities: z.array(z.string().min(2)).min(1),
  summary_30s: z.object({
    risultato_ordinario_chf: money,
    autofinanziamento_chf: money,
    investimenti_netti_chf: money,
    debito_netto_pc_chf: money,
    sel_conformity: z.string().regex(/^[0-8]\/8$/),
    active_overruns_count: z.number().int().min(0),
    latest_mm_reference: z.string().min(2),
  }),
});

export const creditSchema = z.object({
  id: z.string().min(3),
  ust_code: z.number().int(),
  municipality_slug: z.string().regex(SLUG),
  municipality_name: z.string().min(2),
  account_code: z.string().regex(/^\d{3}\.\d{4}\.\d{3}$/),
  description: z.string().min(5),
  mm_reference: z.string().min(2),
  vote_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fiscal_year: YEARS,
  voted_credit_chf: money.positive(),
  spent_prev_chf: money.min(0),
  spent_year_chf: money,
  spent_total_chf: money.min(0),
  residual_chf: money,
  is_overrun: z.boolean(),
  pct_used: z.number().min(0),
  page_ref: z.number().int().min(1),
});

export const documentSchema = z.object({
  id: z.string().min(3),
  ust_code: z.number().int(),
  municipality_name: z.string().min(2),
  municipality_slug: z.string().regex(SLUG),
  document_kind: z.enum(["CONSUNTIVO", "PREVENTIVO", "CREDITO_OPERA", "PIANO_FINANZIARIO"]),
  fiscal_year: YEARS,
  title: z.string().min(5),
  mm_reference: z.string().min(2),
  approval_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  file_size_bytes: z.number().int().positive(),
  pages: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  original_url: z.string().url().optional(),
  has_personal_data: z.literal(false), // nLPD: mai dati personali in pubblico
});

export interface IntegrityReport {
  errors: string[];
  warnings: string[];
}

function zodIssues(prefix: string, err: z.ZodError): string[] {
  return err.issues.map((i) => `${prefix}: ${i.path.join(".") || "(root)"} ${i.message}`);
}

function validIsoDate(s: string): boolean {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function checkStructuredData(): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- Anagrafica ---
  if (MUNICIPALITIES.length !== 19) {
    errors.push(`Anagrafica: attesi 19 Comuni, trovati ${MUNICIPALITIES.length}`);
  }
  const byUst = new Map<number, (typeof MUNICIPALITIES)[number]>();
  const slugs = new Set<string>();
  for (const m of MUNICIPALITIES) {
    const r = municipalitySchema.safeParse(m);
    if (!r.success) errors.push(...zodIssues(`Comune ${m.slug ?? m.ust_code}`, r.error));
    if (byUst.has(m.ust_code)) errors.push(`Comune ${m.name}: ust_code ${m.ust_code} duplicato`);
    if (slugs.has(m.slug)) errors.push(`Comune ${m.name}: slug ${m.slug} duplicato`);
    byUst.set(m.ust_code, m);
    slugs.add(m.slug);

    const curYear = String(2026);
    const hist = m.multipliers_history[curYear as unknown as number];
    if (hist && (hist.pf !== m.tax_multiplier_pf || hist.pg !== m.tax_multiplier_pg)) {
      errors.push(`Comune ${m.name}: moltiplicatori 2026 incoerenti con lo storico`);
    }
    const pop = m.population_history[curYear as unknown as number];
    if (pop !== undefined && pop !== m.population) {
      // Warning (non bloccante): serve verifica umana su quale fonte STATPOP sia corretta
      warnings.push(`Comune ${m.name}: popolazione ${m.population} != storico 2026 (${pop}): verificare la fonte`);
    }
    if (m.has_differentiated_pg !== (m.tax_multiplier_pf !== m.tax_multiplier_pg)) {
      errors.push(`Comune ${m.name}: has_differentiated_pg incoerente con PF/PG`);
    }
    const s = m.summary_30s;
    if (s.investimenti_netti_chf < 0) warnings.push(`Comune ${m.name}: investimenti netti negativi`);
    if (s.debito_netto_pc_chf < 0) warnings.push(`Comune ${m.name}: debito pro capite negativo`);
  }

  // --- Crediti (Allegato f): quadratura aritmetica al centesimo ---
  const creditIds = new Set<string>();
  for (const c of INVESTMENT_CREDITS) {
    const r = creditSchema.safeParse(c);
    if (!r.success) {
      errors.push(...zodIssues(`Credito ${c.id}`, r.error));
      continue;
    }
    if (creditIds.has(c.id)) errors.push(`Credito ${c.id}: id duplicato`);
    creditIds.add(c.id);

    const m = byUst.get(c.ust_code);
    if (!m) errors.push(`Credito ${c.id}: ust_code ${c.ust_code} non in anagrafica`);
    else if (m.slug !== c.municipality_slug || m.name !== c.municipality_name) {
      errors.push(`Credito ${c.id}: nome/slug non coincidono con l'anagrafica`);
    }
    if (c.vote_date && !validIsoDate(c.vote_date)) errors.push(`Credito ${c.id}: vote_date inesistente`);
    if (Math.abs(c.spent_prev_chf + c.spent_year_chf - c.spent_total_chf) > CENT) {
      errors.push(`Credito ${c.id}: speso prec. + anno != totale`);
    }
    if (Math.abs(c.voted_credit_chf - c.spent_total_chf - c.residual_chf) > CENT) {
      errors.push(`Credito ${c.id}: votato - speso != residuo`);
    }
    if (c.is_overrun !== c.residual_chf < 0) errors.push(`Credito ${c.id}: is_overrun incoerente col residuo`);
    const pct = (c.spent_total_chf / c.voted_credit_chf) * 100;
    if (Math.abs(pct - c.pct_used) > 0.1) {
      errors.push(`Credito ${c.id}: pct_used ${c.pct_used} != calcolato ${pct.toFixed(2)}`);
    }
  }
  // active_overruns_count in anagrafica = sorpassi reali
  for (const m of MUNICIPALITIES) {
    const real = INVESTMENT_CREDITS.filter((c) => c.ust_code === m.ust_code && c.is_overrun).length;
    if (m.summary_30s.active_overruns_count !== real) {
      errors.push(
        `Comune ${m.name}: active_overruns_count=${m.summary_30s.active_overruns_count} ma i sorpassi reali sono ${real}`
      );
    }
  }

  // --- Documenti ---
  const docIds = new Set<string>();
  const hashes = new Map<string, string>();
  for (const d of OFFICIAL_DOCUMENTS) {
    const r = documentSchema.safeParse(d);
    if (!r.success) {
      errors.push(...zodIssues(`Documento ${d.id}`, r.error));
      continue;
    }
    if (docIds.has(d.id)) errors.push(`Documento ${d.id}: id duplicato`);
    docIds.add(d.id);
    const m = byUst.get(d.ust_code);
    if (!m) errors.push(`Documento ${d.id}: ust_code ${d.ust_code} non in anagrafica`);
    else if (m.slug !== d.municipality_slug || m.name !== d.municipality_name) {
      errors.push(`Documento ${d.id}: nome/slug non coincidono con l'anagrafica`);
    }
    if (d.approval_date && !validIsoDate(d.approval_date)) errors.push(`Documento ${d.id}: approval_date inesistente`);
    const prev = hashes.get(d.sha256);
    if (prev) errors.push(`Documento ${d.id}: sha256 identico a ${prev} (hash placeholder o duplicato)`);
    hashes.set(d.sha256, d.id);
    // sha256 a sequenza ripetuta/ovvia = segnaposto
    if (/^(?:0123456789abcdef)+$/.test(d.sha256) || /^(.)\1+$/.test(d.sha256)) {
      errors.push(`Documento ${d.id}: sha256 evidentemente fittizio`);
    }
  }
  return { errors, warnings };
}

// ---------- File open data (CSV) ----------

function parseCsv(text: string, delimiter: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split(delimiter);
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
  });
}

export interface CsvInputs {
  bilanci: string;
  bilanciExcel: string;
  indicatori: string;
  indicatoriExcel: string;
  tariffe: string;
}

export function checkOpenData(files: CsvInputs): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byUst = new Map(MUNICIPALITIES.map((m) => [m.ust_code, m]));

  const bilanci = parseCsv(files.bilanci, ",");
  const bilanciX = parseCsv(files.bilanciExcel, ";");
  const ind = parseCsv(files.indicatori, ",");
  const indX = parseCsv(files.indicatoriExcel, ";");
  const tar = parseCsv(files.tariffe, ",");

  // Le varianti Excel-CH devono contenere gli stessi dati dello standard
  if (JSON.stringify(bilanci) !== JSON.stringify(bilanciX)) errors.push("bilanci_mca2: CSV standard != Excel-CH");
  if (JSON.stringify(ind) !== JSON.stringify(indX)) errors.push("indicatori_sel: CSV standard != Excel-CH");

  const num = (v: string) => (v === "" ? null : Number(v));

  for (const r of bilanci) {
    const m = byUst.get(Number(r.ust_code));
    if (!m) {
      errors.push(`bilanci_mca2: ust_code ${r.ust_code} sconosciuto`);
      continue;
    }
    if (r.comune !== m.name) errors.push(`bilanci_mca2 ${m.name}: nome "${r.comune}" incoerente`);
    const h = m.multipliers_history[r.anno as unknown as number];
    if (!h) {
      errors.push(`bilanci_mca2 ${m.name}: nessun moltiplicatore storico per l'anno ${r.anno}`);
    } else if (Number(r.moltiplicatore_pf) !== h.pf || Number(r.moltiplicatore_pg) !== h.pg) {
      errors.push(`bilanci_mca2 ${m.name}: moltiplicatori ${r.anno} != anagrafica`);
    }
    const spese = num(r.spese_correnti_chf);
    const ricavi = num(r.ricavi_correnti_chf);
    const ris = num(r.risultato_ordinario_chf);
    if (spese !== null && ricavi !== null && ris !== null && Math.abs(ricavi - spese - ris) > CENT) {
      errors.push(`bilanci_mca2 ${m.name}: ricavi - spese != risultato ordinario`);
    }
    if (r.tipo_atto === "CONSUNTIVO" && r.conformita_sel && !/^[0-8]\/8$/.test(r.conformita_sel)) {
      errors.push(`bilanci_mca2 ${m.name}: conformita_sel "${r.conformita_sel}" malformata`);
    }
  }
  if (new Set(bilanci.map((r) => r.ust_code)).size !== 19) errors.push("bilanci_mca2: non copre 19 Comuni");

  // Indicatori: niente placeholder, niente 0.0 fittizi, coerenza con lo stato
  const seen = new Set<string>();
  for (const r of ind) {
    const key = `${r.ust_code}|${r.anno}|${r.indicatore_codice}`;
    if (seen.has(key)) errors.push(`indicatori_sel: riga duplicata ${key}`);
    seen.add(key);
    if (!byUst.has(Number(r.ust_code))) errors.push(`indicatori_sel: ust_code ${r.ust_code} sconosciuto`);
    if (r.stato === "calcolato" && num(r.valore) === null) errors.push(`indicatori_sel ${key}: "calcolato" senza valore`);
    if (r.stato === "non_disponibile" && r.valore !== "") errors.push(`indicatori_sel ${key}: "non_disponibile" con valore`);
    if (r.stato !== "calcolato" && r.stato !== "non_disponibile") errors.push(`indicatori_sel ${key}: stato "${r.stato}" non valido`);
  }
  if (new Set(ind.map((r) => r.ust_code)).size !== 19) errors.push("indicatori_sel: non copre 19 Comuni");

  // Un indicatore con lo STESSO valore per tutti i Comuni calcolati e' un segnaposto
  const byCode = new Map<string, Set<string>>();
  const countCode = new Map<string, number>();
  for (const r of ind) {
    if (r.stato !== "calcolato") continue;
    byCode.set(r.indicatore_codice, (byCode.get(r.indicatore_codice) ?? new Set()).add(r.valore));
    countCode.set(r.indicatore_codice, (countCode.get(r.indicatore_codice) ?? 0) + 1);
  }
  for (const [code, values] of byCode) {
    if ((countCode.get(code) ?? 0) >= 3 && values.size === 1) {
      errors.push(`indicatori_sel ${code}: valore identico (${[...values][0]}) per tutti i Comuni: placeholder?`);
    }
  }

  // Tariffe: anagrafica
  for (const r of tar) {
    const m = byUst.get(Number(r.ust_code));
    if (!m) {
      errors.push(`tariffe: ust_code ${r.ust_code} sconosciuto`);
      continue;
    }
    if (Number(r.abitanti) !== m.population) errors.push(`tariffe ${m.name}: abitanti ${r.abitanti} != anagrafica ${m.population}`);
    if (r.circolo !== m.circle) errors.push(`tariffe ${m.name}: circolo "${r.circolo}" != "${m.circle}"`);
    if (r.tassa_base_rifiuti !== m.waste_base_fee) {
      errors.push(`tariffe ${m.name}: tassa rifiuti "${r.tassa_base_rifiuti}" != "${m.waste_base_fee}"`);
    }
  }
  if (tar.length !== 19) errors.push(`tariffe: attese 19 righe, trovate ${tar.length}`);

  // Colonne tariffarie identiche per tutti i Comuni: segnalare come da verificare
  for (const col of ["sacco_35l_chf", "tassa_cani_annua_chf", "assegno_nascita_chf", "mensa_scolastica_pasto_chf"]) {
    if (new Set(tar.map((r) => r[col])).size === 1) {
      warnings.push(`tariffe.${col}: valore unico (${tar[0]?.[col]}) per tutti i Comuni, probabile default non verificato`);
    }
  }
  return { errors, warnings };
}
