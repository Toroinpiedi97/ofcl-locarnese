import type { MunicipalityData } from "@/data/municipalities";
import type { InvestmentCredit } from "@/data/credits";

export const ART_192_DISCLAIMER =
  "Nota legale: dati ufficiali da fonti comunali pubbliche. Fanno fede gli atti originali esposti ex art. 192 LOC.";

export type SocialSignalCode =
  | "S05_CREDIT_OVERRUN"
  | "S06_TARIFF_GAP"
  | "S07_TAX_MULTIPLIER"
  | "S08_PEER_COST_OUTLIER"
  | "S09_BUDGET_DIVERGENCE"
  | "S10_FUN_FACT";

export type SocialDraftStatus = "DRAFT" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export type SocialGenerationMode =
  | "DETERMINISTIC"
  | "AI_ASSISTED"
  | "CURATOR_EDITED";

export interface SocialSlide {
  slide_no: number;
  kind: "HOOK" | "DATA_COMPARE" | "QUESTION" | "SOURCE";
  headline: string;
  stat_value: string;
  stat_unit: string;
  body: string;
  source_ref: string;
}

export interface SocialDraftDto {
  id: string;
  signal_code: SocialSignalCode;
  dedup_key: string;
  ust_code: number | null;
  municipality_name: string;
  ref_year: number;
  title: string;
  question_for_municipality: string;
  verified_payload: Record<string, unknown>;
  slides_json: SocialSlide[];
  caption_draft: string;
  hashtags: string[];
  source_urls: string[];
  generation_mode: SocialGenerationMode;
  status: SocialDraftStatus;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  priority_score?: number;
}

export interface PeerCostOutlierRow {
  ust_code: number;
  municipality_name: string;
  municipality_slug?: string;
  ref_year: number;
  statement?: string;
  code_level?: number;
  account_code: string;
  account_label: string;
  per_capita_chf: number;
  district_median_per_capita_chf: number;
  delta_pct_vs_median: number | null;
  amount_chf: number;
  residents: number;
  page?: number | null;
  origin_url?: string | null;
}

export interface BudgetDivergenceRow {
  ust_code: number;
  municipality_name: string;
  municipality_slug?: string;
  ref_year: number;
  account_code: string;
  account_label: string;
  actual_chf: number;
  budget_chf: number;
  delta_chf: number;
  delta_pct: number | null;
  page_actual?: number | null;
  origin_url?: string | null;
}

export const SIGNAL_META: Record<
  SocialSignalCode,
  {
    shortCode: string;
    label: string;
    badgeBg: string;
    badgeText: string;
    accentHex: string;
    description: string;
  }
> = {
  S05_CREDIT_OVERRUN: {
    shortCode: "S05",
    label: "Sorpasso Credito",
    badgeBg: "bg-red-500/15 border-red-500/40",
    badgeText: "text-red-300",
    accentHex: "#DC2626",
    description: "Credito d'opera con residuo negativo (art. 15 LOC).",
  },
  S06_TARIFF_GAP: {
    shortCode: "S06",
    label: "Divario Tariffe",
    badgeBg: "bg-amber-500/15 border-amber-500/40",
    badgeText: "text-amber-300",
    accentHex: "#D97706",
    description: "Differenza di tariffe civiche tra Comuni vicini.",
  },
  S07_TAX_MULTIPLIER: {
    shortCode: "S07",
    label: "Moltiplicatore PF/PG",
    badgeBg: "bg-sky-500/15 border-sky-500/40",
    badgeText: "text-sky-300",
    accentHex: "#0F3854",
    description: "Forbice fiscale distrettuale o differenziazione PF/PG.",
  },
  S08_PEER_COST_OUTLIER: {
    shortCode: "S08",
    label: "Costo Pro Capite",
    badgeBg: "bg-cyan-500/15 border-cyan-500/40",
    badgeText: "text-cyan-300",
    accentHex: "#00A3C4",
    description: "Scostamento significativo rispetto alla mediana del Locarnese.",
  },
  S09_BUDGET_DIVERGENCE: {
    shortCode: "S09",
    label: "Preventivo vs Consuntivo",
    badgeBg: "bg-orange-500/15 border-orange-500/40",
    badgeText: "text-orange-300",
    accentHex: "#D97706",
    description: "Divergenza rilevante tra cifra preventivata e spesa effettiva.",
  },
  S10_FUN_FACT: {
    shortCode: "S10",
    label: "Fun Fact Civico",
    badgeBg: "bg-emerald-500/15 border-emerald-500/40",
    badgeText: "text-emerald-300",
    accentHex: "#059669",
    description: "Curiosità verificata dai bilanci e dagli allegati ufficiali.",
  },
};

/**
 * Formatta un importo al centesimo esatto (0.01 CHF) secondo la convenzione svizzera.
 */
export function formatChfIt(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  const withApostrophe = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${sign}${withApostrophe}.${decPart} CHF`;
}

function roundCent(val: number): number {
  return Math.round(val * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return roundCent((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return roundCent(sorted[mid]);
}

function slugifyKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Rileva in modo 100% deterministico gli spunti per Instagram (S05-S10) dai dataset certificati.
 */
export function generateSocialInsightsFromData(params: {
  municipalities: MunicipalityData[];
  credits: InvestmentCredit[];
  peerOutliers?: PeerCostOutlierRow[];
  budgetDivergences?: BudgetDivergenceRow[];
}): SocialDraftDto[] {
  const { municipalities, credits, peerOutliers = [], budgetDivergences = [] } = params;
  const nowIso = new Date().toISOString();
  const drafts: SocialDraftDto[] = [];

  // ---------------------------------------------------------------------------
  // S05: Sorpassi di credito d'opera (Allegato f)
  // ---------------------------------------------------------------------------
  const overruns = [...credits]
    .filter((c) => c.residual_chf < 0)
    .sort((a, b) => a.residual_chf - b.residual_chf)
    .slice(0, 4);

  for (const c of overruns) {
    const overrunAbs = Math.abs(roundCent(c.residual_chf));
    const mun = municipalities.find((m) => m.ust_code === c.ust_code);
    const baseUrl = `https://ofcl.ch/comuni/${c.municipality_slug}/crediti#page=${c.page_ref}`;
    const dedupKey = `S05:${c.ust_code}:${c.fiscal_year}:${c.account_code}`;

    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S05_CREDIT_OVERRUN",
      dedup_key: dedupKey,
      ust_code: c.ust_code,
      municipality_name: c.municipality_name,
      ref_year: c.fiscal_year,
      title: `${c.municipality_name}: sorpasso di ${formatChfIt(overrunAbs)} su "${c.description}"`,
      question_for_municipality: `Perché il credito "${c.description}" (${c.mm_reference}) ha superato lo stanziamento di ${formatChfIt(overrunAbs)} (${c.pct_used.toFixed(2)}%) ed è previsto un credito suppletorio in Consiglio Comunale?`,
      verified_payload: {
        ust_code: c.ust_code,
        municipality_name: c.municipality_name,
        account_code: c.account_code,
        mm_reference: c.mm_reference,
        voted_credit_chf: formatChfIt(c.voted_credit_chf),
        spent_total_chf: formatChfIt(c.spent_total_chf),
        residual_chf: formatChfIt(c.residual_chf),
        pct_used: `${c.pct_used.toFixed(2)}%`,
        page_ref: c.page_ref,
        population: mun?.population ?? null,
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: `${c.municipality_name}: credito oltre il 100%`,
          stat_value: `+${formatChfIt(overrunAbs)}`,
          stat_unit: "Sorpasso sullo stanziamento votato",
          body: `Opera: ${c.description}. Speso ${formatChfIt(c.spent_total_chf)} contro ${formatChfIt(c.voted_credit_chf)} votati.`,
          source_ref: `Allegato f · p. ${c.page_ref}`,
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "Votato vs Speso cumulato",
          stat_value: `${c.pct_used.toFixed(2)}%`,
          stat_unit: "Utilizzo del credito d'opera",
          body: `Votato: ${formatChfIt(c.voted_credit_chf)} · Speso totale: ${formatChfIt(c.spent_total_chf)} · Residuo: ${formatChfIt(c.residual_chf)}.`,
          source_ref: `${c.mm_reference} · Conto ${c.account_code}`,
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "La domanda al Municipio",
          stat_value: "Art. 15 LOC",
          stat_unit: "Controllo crediti d'investimento",
          body: `Quali costi imprevisti hanno generato lo sforamento di ${formatChfIt(overrunAbs)} su ${c.description} e quando verrà chiesto il credito suppletorio?`,
          source_ref: `${c.municipality_name} · Consuntivo ${c.fiscal_year}`,
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Verifica la cifra originale",
          stat_value: `Pag. ${c.page_ref}`,
          stat_unit: `Consuntivo ${c.fiscal_year} · Allegato f`,
          body: "Ogni importo è espresso al centesimo esatto (0.01 CHF) senza stime. Consulta il fascicolo ufficiale sul portale OFCL.",
          source_ref: baseUrl,
        },
      ],
      caption_draft: [
        `📊 ${c.municipality_name} (${c.fiscal_year}): sorpasso di ${formatChfIt(overrunAbs)} sul credito "${c.description}".`,
        "",
        `• Credito votato (${c.mm_reference}): ${formatChfIt(c.voted_credit_chf)}`,
        `• Spesa cumulata a fine ${c.fiscal_year}: ${formatChfIt(c.spent_total_chf)} (${c.pct_used.toFixed(2)}%)`,
        `• Residuo contabile: ${formatChfIt(c.residual_chf)}`,
        "",
        `❓ La nostra domanda al Municipio: quali fattori hanno causato questo sorpasso e quando il Consiglio Comunale sarà chiamato a ratificarlo?`,
        "",
        `🔎 Fonte ufficiale: Allegato f (Controllo Crediti), Consuntivo ${c.fiscal_year}, pag. ${c.page_ref} -> ${baseUrl}`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: [
        "#Locarnese",
        "#FinanzeComunali",
        "#TrasparenzaCivica",
        "#OFCL",
        `#${c.municipality_name.replace(/[^A-Za-z0-9]/g, "")}`,
      ],
      source_urls: [baseUrl],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: overrunAbs,
    });
  }

  // ---------------------------------------------------------------------------
  // S06: Divario Tariffe Civiche tra Comuni (sacco 35L, tassa cani, mensa)
  // ---------------------------------------------------------------------------
  const tariffSpecs: Array<{
    key: "waste_bag_35l_chf" | "dog_tax_chf" | "canteen_meal_chf";
    label: string;
    unit: string;
  }> = [
    { key: "waste_bag_35l_chf", label: "Sacco rifiuti 35L", unit: "CHF/sacco" },
    { key: "dog_tax_chf", label: "Tassa annuale sui cani", unit: "CHF/cane" },
    { key: "canteen_meal_chf", label: "Mensa scolastica (residenti)", unit: "CHF/pasto" },
  ];

  for (const spec of tariffSpecs) {
    const valid = municipalities.filter((m) => (m.civic_tariffs?.[spec.key] ?? 0) > 0);
    if (valid.length < 4) continue;
    const sorted = [...valid].sort(
      (a, b) => a.civic_tariffs[spec.key] - b.civic_tariffs[spec.key]
    );
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    const lowVal = roundCent(low.civic_tariffs[spec.key]);
    const highVal = roundCent(high.civic_tariffs[spec.key]);
    const medVal = median(valid.map((m) => m.civic_tariffs[spec.key]));
    const diff = roundCent(highVal - lowVal);
    if (diff <= 0) continue;

    const srcLow = `https://ofcl.ch/comuni/${low.slug}`;
    const srcHigh = `https://ofcl.ch/comuni/${high.slug}`;
    const dedupKey = `S06:${spec.key}:2026`;

    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S06_TARIFF_GAP",
      dedup_key: dedupKey,
      ust_code: high.ust_code,
      municipality_name: `${low.name} vs ${high.name}`,
      ref_year: 2026,
      title: `${spec.label}: da ${formatChfIt(lowVal)} (${low.name}) a ${formatChfIt(highVal)} (${high.name})`,
      question_for_municipality: `Perché nello stesso distretto "${spec.label}" costa ${formatChfIt(lowVal)} a ${low.name} e ${formatChfIt(highVal)} a ${high.name} (+${formatChfIt(diff)})? Quali servizi o sussidi incrociati copre la tariffa?`,
      verified_payload: {
        tariff_label: spec.label,
        unit: spec.unit,
        lowest_municipality: low.name,
        lowest_value_chf: formatChfIt(lowVal),
        highest_municipality: high.name,
        highest_value_chf: formatChfIt(highVal),
        district_median_chf: formatChfIt(medVal),
        spread_chf: formatChfIt(diff),
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: `${spec.label} nel Locarnese`,
          stat_value: `+${formatChfIt(diff)}`,
          stat_unit: `Divario tra ${low.name} e ${high.name}`,
          body: `Nello stesso distretto si paga da ${formatChfIt(lowVal)} fino a ${formatChfIt(highVal)} (${spec.unit}).`,
          source_ref: "Guida Civica OFCL · 19 Comuni",
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "Minimo, mediana e massimo",
          stat_value: `${formatChfIt(lowVal)} → ${formatChfIt(highVal)}`,
          stat_unit: `Mediana distrettuale: ${formatChfIt(medVal)}`,
          body: `Minimo: ${low.name} (${formatChfIt(lowVal)}). Massimo: ${high.name} (${formatChfIt(highVal)}).`,
          source_ref: "Ordinanze e regolamenti comunali 2026",
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "Cosa giustifica il divario?",
          stat_value: `${valid.length}/19 Comuni`,
          stat_unit: "Confronto su regolamenti vigenti",
          body: `Chiediamo ai Municipi quali costi reali giustificano una differenza di ${formatChfIt(diff)} sullo stesso servizio civico.`,
          source_ref: `${low.name} & ${high.name}`,
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Confronta il tuo Comune",
          stat_value: "19 Comuni",
          stat_unit: "Tariffe e sussidi verificati",
          body: "Confronta tutte le tariffe comunali sul portale civico OFCL senza stime né arrotondamenti.",
          source_ref: "https://ofcl.ch/confronta",
        },
      ],
      caption_draft: [
        `🏷️ Stesso distretto, tariffe diverse: ${spec.label}.`,
        "",
        `• Minimo nel Locarnese (${low.name}): ${formatChfIt(lowVal)}`,
        `• Mediana su ${valid.length} Comuni: ${formatChfIt(medVal)}`,
        `• Massimo (${high.name}): ${formatChfIt(highVal)} (differenza ${formatChfIt(diff)})`,
        "",
        `❓ Cosa vorremmo capire dai Comuni: questa forbice riflette costi logistici/orografici diversi o una scelta di copertura tramite imposte generali?`,
        "",
        `🔎 Schede ufficiali: ${srcLow} · ${srcHigh}`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: ["#TariffeComunali", "#Locarnese", "#CostiCivici", "#OFCL"],
      source_urls: [srcLow, srcHigh],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: Math.round((highVal / Math.max(lowVal, 0.01)) * 100),
    });
  }

  // ---------------------------------------------------------------------------
  // S07: Moltiplicatori PF/PG e differenziazione Persone Giuridiche
  // ---------------------------------------------------------------------------
  const validMult = municipalities.filter((m) => m.tax_multiplier_pf > 0);
  if (validMult.length >= 2) {
    const sortedPf = [...validMult].sort((a, b) => a.tax_multiplier_pf - b.tax_multiplier_pf);
    const minM = sortedPf[0];
    const maxM = sortedPf[sortedPf.length - 1];
    const gapPp = roundCent(maxM.tax_multiplier_pf - minM.tax_multiplier_pf);
    const diffOn1000 = roundCent((gapPp / 100) * 1000);
    const dedupKey = `S07:tax_gap:2026`;

    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S07_TAX_MULTIPLIER",
      dedup_key: dedupKey,
      ust_code: maxM.ust_code,
      municipality_name: `${minM.name} vs ${maxM.name}`,
      ref_year: 2026,
      title: `Moltiplicatore 2026: ${gapPp.toFixed(0)} punti di distanza tra ${minM.name} (${minM.tax_multiplier_pf}%) e ${maxM.name} (${maxM.tax_multiplier_pf}%)`,
      question_for_municipality: `Con un divario di ${gapPp.toFixed(0)} punti percentuali (${formatChfIt(diffOn1000)} ogni 1'000 CHF d'imposta cantonale base), quali servizi o investimenti spiegano il moltiplicatore al ${maxM.tax_multiplier_pf}% rispetto al ${minM.tax_multiplier_pf}%?`,
      verified_payload: {
        min_municipality: minM.name,
        min_pf_pct: minM.tax_multiplier_pf,
        max_municipality: maxM.name,
        max_pf_pct: maxM.tax_multiplier_pf,
        gap_pp: gapPp,
        impact_per_1000_base_chf: formatChfIt(diffOn1000),
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: "Moltiplicatori comunali 2026",
          stat_value: `${minM.tax_multiplier_pf}% vs ${maxM.tax_multiplier_pf}%`,
          stat_unit: "Forbice Persone Fisiche nel Locarnese",
          body: `${gapPp.toFixed(0)} punti percentuali di differenza tra ${minM.name} e ${maxM.name} nello stesso distretto.`,
          source_ref: "DFE Divisione Contribuzioni / SEL 2026",
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "Quanto pesa in busta?",
          stat_value: formatChfIt(diffOn1000),
          stat_unit: "Differenza ogni 1'000.00 CHF d'imposta base",
          body: `Su 5'000.00 CHF d'imposta cantonale base il divario sale a ${formatChfIt(diffOn1000 * 5)} l'anno.`,
          source_ref: "Calcolo deterministico su moltiplicatori 2026",
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "Imposte alte o perequazione?",
          stat_value: `${validMult.length} Comuni`,
          stat_unit: "Mappa fiscale del Locarnese",
          body: `Perché le valli e i comuni periferici restano spesso al 95–100% nonostante la perequazione intercomunale?`,
          source_ref: `${minM.name} · ${maxM.name}`,
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Esplora tutta la serie 2022–2026",
          stat_value: "19/19",
          stat_unit: "Moltiplicatori PF e PG verificati",
          body: "Confronta l'andamento storico dei moltiplicatori su OFCL.",
          source_ref: "https://ofcl.ch/confronta",
        },
      ],
      caption_draft: [
        `🏛️ Moltiplicatori d'imposta 2026 nel Locarnese: ${gapPp.toFixed(0)} punti tra minimo e massimo.`,
        "",
        `• Minimo (${minM.name}): ${minM.tax_multiplier_pf}%`,
        `• Massimo (${maxM.name}): ${maxM.tax_multiplier_pf}%`,
        `• Impatto ogni 1'000.00 CHF di imposta cantonale base: ${formatChfIt(diffOn1000)}`,
        "",
        `❓ Domanda aperta ai Municipi: cosa servirebbe per ridurre il divario fiscale tra lago e valli mantenendo i servizi essenziali?`,
        "",
        `🔎 Confronto completo: https://ofcl.ch/confronta`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: ["#Moltiplicatore", "#ImposteTicino", "#Locarnese", "#OFCL"],
      source_urls: [`https://ofcl.ch/comuni/${minM.slug}`, `https://ofcl.ch/comuni/${maxM.slug}`],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: gapPp * 10,
    });
  }

  // ---------------------------------------------------------------------------
  // S08: Outlier di costo pro capite (da api.peer_cost_outliers o dati comunali)
  // ---------------------------------------------------------------------------
  if (peerOutliers.length > 0) {
    const significant = peerOutliers
      .filter((o) => o.delta_pct_vs_median !== null && Math.abs(o.delta_pct_vs_median) >= 25)
      .sort((a, b) => Math.abs(b.delta_pct_vs_median ?? 0) - Math.abs(a.delta_pct_vs_median ?? 0))
      .slice(0, 4);

    for (const o of significant) {
      const deltaPct = o.delta_pct_vs_median ?? 0;
      const direction = deltaPct > 0 ? "sopra" : "sotto";
      const pageAnchor = o.page ? `#page=${o.page}` : "";
      const url = o.origin_url
        ? `${o.origin_url}${pageAnchor}`
        : `https://ofcl.ch/comuni/${o.municipality_slug || o.ust_code}${pageAnchor}`;
      const dedupKey = `S08:${o.ust_code}:${o.ref_year}:${o.account_code}`;

      drafts.push({
        id: `draft-${slugifyKey(dedupKey)}`,
        signal_code: "S08_PEER_COST_OUTLIER",
        dedup_key: dedupKey,
        ust_code: o.ust_code,
        municipality_name: o.municipality_name,
        ref_year: o.ref_year,
        title: `${o.municipality_name}: "${o.account_label}" ${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs mediana`,
        question_for_municipality: `Perché la voce "${o.account_label}" (conto ${o.account_code}) costa ${formatChfIt(o.per_capita_chf)}/ab a ${o.municipality_name}, ovvero ${Math.abs(deltaPct).toFixed(1)}% ${direction} la mediana del Locarnese (${formatChfIt(o.district_median_per_capita_chf)}/ab)?`,
        verified_payload: {
          ust_code: o.ust_code,
          municipality_name: o.municipality_name,
          account_code: o.account_code,
          account_label: o.account_label,
          per_capita_chf: formatChfIt(o.per_capita_chf),
          district_median_per_capita_chf: formatChfIt(o.district_median_per_capita_chf),
          delta_pct_vs_median: `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
          total_amount_chf: formatChfIt(o.amount_chf),
          residents: o.residents,
          page: o.page ?? null,
        },
        slides_json: [
          {
            slide_no: 1,
            kind: "HOOK",
            headline: `${o.municipality_name} · ${o.account_label}`,
            stat_value: `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
            stat_unit: "Rispetto alla mediana del Locarnese",
            body: `${formatChfIt(o.per_capita_chf)} per abitante contro una mediana distrettuale di ${formatChfIt(o.district_median_per_capita_chf)}/ab.`,
            source_ref: `Conto MCA2 ${o.account_code} · ${o.ref_year}`,
          },
          {
            slide_no: 2,
            kind: "DATA_COMPARE",
            headline: "Il peso per ogni cittadino",
            stat_value: `${formatChfIt(o.per_capita_chf)}/ab`,
            stat_unit: `Totale annuo: ${formatChfIt(o.amount_chf)}`,
            body: `Popolazione STATPOP ${o.ref_year}: ${o.residents} abitanti. Mediana distrettuale: ${formatChfIt(o.district_median_per_capita_chf)}/ab.`,
            source_ref: `Consuntivo ${o.ref_year}${o.page ? ` · p. ${o.page}` : ""}`,
          },
          {
            slide_no: 3,
            kind: "QUESTION",
            headline: "La domanda al Municipio",
            stat_value: `${o.account_code}`,
            stat_unit: "Voce normalizzata MCA2",
            body: `Questo scostamento (${Math.abs(deltaPct).toFixed(1)}% ${direction} la mediana) dipende da servizi intercomunali, entrate compensate o costi straordinari?`,
            source_ref: `${o.municipality_name} · ${o.ref_year}`,
          },
          {
            slide_no: 4,
            kind: "SOURCE",
            headline: "Dati verificati pagina per pagina",
            stat_value: o.page ? `Pag. ${o.page}` : `${o.ref_year}`,
            stat_unit: "Ricapitolazione ufficiale MCA2",
            body: "Ogni confronto pro capite unisce il tabulato ufficiale Ge.Co.Ti. con i dati demografici STATPOP.",
            source_ref: url,
          },
        ],
        caption_draft: [
          `🔍 Confronto pro capite (${o.ref_year}): ${o.municipality_name} su "${o.account_label}" (${o.account_code}).`,
          "",
          `• Spesa a ${o.municipality_name}: ${formatChfIt(o.per_capita_chf)}/ab (totale ${formatChfIt(o.amount_chf)} su ${o.residents} ab.)`,
          `• Mediana del Locarnese: ${formatChfIt(o.district_median_per_capita_chf)}/ab`,
          `• Scostamento: ${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
          "",
          `❓ Chiediamo al Comune di chiarire se questa differenza deriva da consorzi regionali, struttura territoriale o eventi puntuali dell'esercizio.`,
          "",
          `🔎 Fonte: ${url}`,
          "",
          ART_192_DISCLAIMER,
        ].join("\n"),
        hashtags: ["#SpesaPubblica", "#ProCapite", "#Locarnese", "#MCA2", "#OFCL"],
        source_urls: [url],
        generation_mode: "DETERMINISTIC",
        status: "DRAFT",
        created_at: nowIso,
        priority_score: Math.abs(deltaPct) * 2,
      });
    }
  } else {
    // Fallback deterministico su spesa/debito pro capite certificato se le viste api.peer_cost_outliers non sono ancora popolate
    const withSector = municipalities.filter(
      (m) => m.sector_per_capita_chf && m.sector_per_capita_chf.length > 0
    );
    if (withSector.length >= 2) {
      const targetSector = withSector[0].sector_per_capita_chf![0].sector;
      const rows = withSector
        .map((m) => {
          const item = m.sector_per_capita_chf!.find((s) => s.sector === targetSector);
          const totalPc = item
            ? roundCent(item.c30_personale + item.c31_beni_servizi + item.c36_trasferimenti)
            : 0;
          return { m, totalPc };
        })
        .filter((x) => x.totalPc > 0)
        .sort((a, b) => b.totalPc - a.totalPc);

      if (rows.length >= 2) {
        const med = median(rows.map((r) => r.totalPc));
        const top = rows[0];
        const deltaPct = med > 0 ? ((top.totalPc - med) / med) * 100 : 0;
        const dedupKey = `S08:${top.m.ust_code}:2025:sector-${slugifyKey(targetSector)}`;
        const url = `https://ofcl.ch/comuni/${top.m.slug}`;

        drafts.push({
          id: `draft-${slugifyKey(dedupKey)}`,
          signal_code: "S08_PEER_COST_OUTLIER",
          dedup_key: dedupKey,
          ust_code: top.m.ust_code,
          municipality_name: top.m.name,
          ref_year: 2025,
          title: `${top.m.name}: spesa pro capite "${targetSector}" a ${formatChfIt(top.totalPc)}/ab`,
          question_for_municipality: `Perché nel settore "${targetSector}" la spesa pro capite (30+31+36) di ${top.m.name} raggiunge ${formatChfIt(top.totalPc)}/ab contro una mediana di ${formatChfIt(med)}/ab?`,
          verified_payload: {
            ust_code: top.m.ust_code,
            municipality_name: top.m.name,
            sector: targetSector,
            per_capita_chf: formatChfIt(top.totalPc),
            district_median_chf: formatChfIt(med),
            delta_pct_vs_median: `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
          },
          slides_json: [
            {
              slide_no: 1,
              kind: "HOOK",
              headline: `${top.m.name} · ${targetSector}`,
              stat_value: `${formatChfIt(top.totalPc)}/ab`,
              stat_unit: "Spesa corrente pro capite (30+31+36)",
              body: `Contro una mediana di ${formatChfIt(med)}/ab sui Comuni analizzati (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%).`,
              source_ref: "Dati certificati Dicasteri MCA2",
            },
            {
              slide_no: 2,
              kind: "DATA_COMPARE",
              headline: "Confronto sul territorio",
              stat_value: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
              stat_unit: "Scostamento dalla mediana",
              body: `Più alto: ${rows[0].m.name} (${formatChfIt(rows[0].totalPc)}/ab). Più basso: ${rows[rows.length - 1].m.name} (${formatChfIt(rows[rows.length - 1].totalPc)}/ab).`,
              source_ref: "Serie comparata OFCL",
            },
            {
              slide_no: 3,
              kind: "QUESTION",
              headline: "Cosa c'è dietro la cifra?",
              stat_value: "30 · 31 · 36",
              stat_unit: "Personale, beni e trasferimenti",
              body: `Il picco riflette un polo di servizi comprensoriali, deleghe consortili o un margine di efficienza da spiegare ai cittadini?`,
              source_ref: `${top.m.name}`,
            },
            {
              slide_no: 4,
              kind: "SOURCE",
              headline: "Verifica i conti per dicastero",
              stat_value: `${top.m.population} ab.`,
              stat_unit: "Popolazione STATPOP",
              body: "Tutti i dati pro capite sono consultabili nella scheda del Comune su OFCL.",
              source_ref: url,
            },
          ],
          caption_draft: [
            `🔍 Quanto costa "${targetSector}" per abitante?`,
            "",
            `• ${top.m.name}: ${formatChfIt(top.totalPc)}/ab`,
            `• Mediana osservata: ${formatChfIt(med)}/ab (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`,
            "",
            `❓ Domanda al Municipio: questo importo riflette funzioni sovracomunali o costi strutturali specifici del territorio?`,
            "",
            `🔎 Scheda Comune: ${url}`,
            "",
            ART_192_DISCLAIMER,
          ].join("\n"),
          hashtags: ["#CostiProCapite", "#DicasteriMCA2", "#Locarnese", "#OFCL"],
          source_urls: [url],
          generation_mode: "DETERMINISTIC",
          status: "DRAFT",
          created_at: nowIso,
          priority_score: Math.abs(deltaPct) * 2,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // S09: Divergenze Preventivo vs Consuntivo (da api.budget_vs_actual_divergences)
  // ---------------------------------------------------------------------------
  const significantDivs = budgetDivergences
    .filter((d) => d.delta_pct !== null && Math.abs(d.delta_pct) >= 15)
    .sort((a, b) => Math.abs(b.delta_chf) - Math.abs(a.delta_chf))
    .slice(0, 4);

  for (const d of significantDivs) {
    const pct = d.delta_pct ?? 0;
    const anchor = d.page_actual ? `#page=${d.page_actual}` : "";
    const url = d.origin_url
      ? `${d.origin_url}${anchor}`
      : `https://ofcl.ch/comuni/${d.municipality_slug || d.ust_code}${anchor}`;
    const dedupKey = `S09:${d.ust_code}:${d.ref_year}:${d.account_code}`;

    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S09_BUDGET_DIVERGENCE",
      dedup_key: dedupKey,
      ust_code: d.ust_code,
      municipality_name: d.municipality_name,
      ref_year: d.ref_year,
      title: `${d.municipality_name}: "${d.account_label}" ${pct > 0 ? "+" : ""}${pct.toFixed(1)}% tra Preventivo e Consuntivo`,
      question_for_municipality: `Perché sul conto ${d.account_code} ("${d.account_label}") nel ${d.ref_year} si è passati da ${formatChfIt(d.budget_chf)} preventivati a ${formatChfIt(d.actual_chf)} effettivi (${pct > 0 ? "+" : ""}${formatChfIt(d.delta_chf)})?`,
      verified_payload: {
        ust_code: d.ust_code,
        municipality_name: d.municipality_name,
        account_code: d.account_code,
        account_label: d.account_label,
        budget_chf: formatChfIt(d.budget_chf),
        actual_chf: formatChfIt(d.actual_chf),
        delta_chf: formatChfIt(d.delta_chf),
        delta_pct: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: `${d.municipality_name} · Preventivo vs Consuntivo`,
          stat_value: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
          stat_unit: `Scostamento su ${d.account_label}`,
          body: `Preventivato: ${formatChfIt(d.budget_chf)} · Consuntivo: ${formatChfIt(d.actual_chf)}.`,
          source_ref: `Conto ${d.account_code} · ${d.ref_year}`,
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "La differenza in franchi",
          stat_value: `${d.delta_chf >= 0 ? "+" : ""}${formatChfIt(d.delta_chf)}`,
          stat_unit: "Differenza effettiva a chiusura",
          body: `Ogni variazione oltre il 15% richiede spiegazione trasparente nel Messaggio sul Consuntivo.`,
          source_ref: `Consuntivo ${d.ref_year}${d.page_actual ? ` · p. ${d.page_actual}` : ""}`,
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "Cosa chiediamo al Comune",
          stat_value: "Preventivo → Reale",
          stat_unit: `Esercizio ${d.ref_year}`,
          body: `Lo scostamento di ${formatChfIt(Math.abs(d.delta_chf))} deriva da entrate/spese straordinarie non previste o da una stima prudenziale a preventivo?`,
          source_ref: d.municipality_name,
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Controlla il tabulato ufficiale",
          stat_value: d.page_actual ? `Pag. ${d.page_actual}` : `${d.ref_year}`,
          stat_unit: "Confronto Preventivo / Consuntivo",
          body: "Dati estratti al centesimo dalle colonne ufficiali di bilancio.",
          source_ref: url,
        },
      ],
      caption_draft: [
        `📉 Preventivo vs Consuntivo ${d.ref_year} a ${d.municipality_name} (${d.account_label}):`,
        "",
        `• Preventivo: ${formatChfIt(d.budget_chf)}`,
        `• Consuntivo: ${formatChfIt(d.actual_chf)} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`,
        `• Scostamento netto: ${d.delta_chf >= 0 ? "+" : ""}${formatChfIt(d.delta_chf)}`,
        "",
        `❓ Domanda aperta al Municipio: quali fattori spiegano questa divergenza rispetto al budget approvato dal Consiglio Comunale?`,
        "",
        `🔎 Fonte: ${url}`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: ["#PreventivoVsConsuntivo", "#BilancioComunale", "#Locarnese", "#OFCL"],
      source_urls: [url],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: Math.abs(pct) * 1.5,
    });
  }

  // ---------------------------------------------------------------------------
  // S10: Fun Fact Civici verificati (debito pro capite e crediti al 99%)
  // ---------------------------------------------------------------------------
  const sortedDebt = [...municipalities].sort(
    (a, b) => a.summary_30s.debito_netto_pc_chf - b.summary_30s.debito_netto_pc_chf
  );
  if (sortedDebt.length >= 2) {
    const lowestDebt = sortedDebt[0];
    const highestDebt = sortedDebt[sortedDebt.length - 1];
    const dedupKey = `S10:net_debt_spread:2025`;
    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S10_FUN_FACT",
      dedup_key: dedupKey,
      ust_code: lowestDebt.ust_code,
      municipality_name: `${lowestDebt.name} · ${highestDebt.name}`,
      ref_year: 2025,
      title: `Fun Fact: nel Locarnese il debito netto pro capite va da ${formatChfIt(lowestDebt.summary_30s.debito_netto_pc_chf)} a ${formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf)}`,
      question_for_municipality: `In che modo i Comuni con sostanza netta positiva (${lowestDebt.name}: ${formatChfIt(lowestDebt.summary_30s.debito_netto_pc_chf)}/ab) pianificano i prossimi investimenti rispetto ai Comuni più indebitati (${highestDebt.name}: ${formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf)}/ab)?`,
      verified_payload: {
        lowest_debt_municipality: lowestDebt.name,
        lowest_debt_pc_chf: formatChfIt(lowestDebt.summary_30s.debito_netto_pc_chf),
        highest_debt_municipality: highestDebt.name,
        highest_debt_pc_chf: formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf),
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: "Fun Fact · Debito netto per abitante",
          stat_value: `${formatChfIt(lowestDebt.summary_30s.debito_netto_pc_chf)}`,
          stat_unit: `Primato distrettuale: ${lowestDebt.name}`,
          body: `Mentre in fondo alla classifica distrettuale si sale a ${formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf)}/ab (${highestDebt.name}).`,
          source_ref: "Indicatori SEL · Serie 19 Comuni",
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "Sostanza netta vs Debito netto",
          stat_value: `${formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf - lowestDebt.summary_30s.debito_netto_pc_chf)}`,
          stat_unit: "Escursione pro capite nel Locarnese",
          body: `Un valore negativo indica sostanza netta disponibile; un valore positivo indica debito netto per ogni abitante.`,
          source_ref: "Indicatore SEL n. 3 · Debito netto / ab",
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "La domanda ai Comuni",
          stat_value: "SEL 8 Indicatori",
          stat_unit: "Sostenibilità degli investimenti",
          body: `Meglio tenere riserve alte o investire di più su scuole, mobilità e transizione energetica?`,
          source_ref: "Osservatorio Finanze Comunali del Locarnese",
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Scopri la posizione del tuo Comune",
          stat_value: "19/19 Comuni",
          stat_unit: "Schede sintetiche 30 secondi",
          body: "Consulta tutti gli 8 indicatori SEL del tuo Comune sul portale pubblico.",
          source_ref: "https://ofcl.ch/confronta",
        },
      ],
      caption_draft: [
        `💡 Fun fact dai bilanci del Locarnese: quanto pesa il debito (o la sostanza!) su ogni abitante?`,
        "",
        `• Sostanza netta più ampia: ${lowestDebt.name} (${formatChfIt(lowestDebt.summary_30s.debito_netto_pc_chf)}/ab)`,
        `• Debito netto pro capite più alto: ${highestDebt.name} (${formatChfIt(highestDebt.summary_30s.debito_netto_pc_chf)}/ab)`,
        "",
        `❓ Qual è il giusto equilibrio tra risparmio fiscale e investimenti sul territorio secondo voi?`,
        "",
        `🔎 Classifica completa: https://ofcl.ch/confronta`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: ["#FunFact", "#DebitoPubblico", "#Locarnese", "#SEL", "#OFCL"],
      source_urls: [
        `https://ofcl.ch/comuni/${lowestDebt.slug}`,
        `https://ofcl.ch/comuni/${highestDebt.slug}`,
      ],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: 500,
    });
  }

  // Fun fact: crediti quasi al 100% senza sorpasso
  const razorEdge = credits.filter(
    (c) => c.pct_used >= 98 && c.pct_used <= 100 && c.residual_chf > 0
  );
  for (const c of razorEdge.slice(0, 2)) {
    const url = `https://ofcl.ch/comuni/${c.municipality_slug}/crediti#page=${c.page_ref}`;
    const dedupKey = `S10:${c.ust_code}:${c.fiscal_year}:${c.account_code}:razor`;
    drafts.push({
      id: `draft-${slugifyKey(dedupKey)}`,
      signal_code: "S10_FUN_FACT",
      dedup_key: dedupKey,
      ust_code: c.ust_code,
      municipality_name: c.municipality_name,
      ref_year: c.fiscal_year,
      title: `Fun Fact a ${c.municipality_name}: "${c.description}" chiuso al ${c.pct_used.toFixed(2)}% con soli ${formatChfIt(c.residual_chf)} residui`,
      question_for_municipality: `Con soli ${formatChfIt(c.residual_chf)} rimasti su ${formatChfIt(c.voted_credit_chf)} (${c.pct_used.toFixed(2)}%), l'opera "${c.description}" è definitivamente terminata o arriveranno fatture finali nell'esercizio successivo?`,
      verified_payload: {
        ust_code: c.ust_code,
        municipality_name: c.municipality_name,
        description: c.description,
        voted_credit_chf: formatChfIt(c.voted_credit_chf),
        spent_total_chf: formatChfIt(c.spent_total_chf),
        residual_chf: formatChfIt(c.residual_chf),
        pct_used: `${c.pct_used.toFixed(2)}%`,
        page_ref: c.page_ref,
      },
      slides_json: [
        {
          slide_no: 1,
          kind: "HOOK",
          headline: `${c.municipality_name} · Precisione millimetrica`,
          stat_value: `${c.pct_used.toFixed(2)}%`,
          stat_unit: "Del credito d'opera utilizzato",
          body: `Su ${formatChfIt(c.voted_credit_chf)} votati per "${c.description}" avanzano appena ${formatChfIt(c.residual_chf)}.`,
          source_ref: `Allegato f · p. ${c.page_ref}`,
        },
        {
          slide_no: 2,
          kind: "DATA_COMPARE",
          headline: "Conto quasi a zero",
          stat_value: formatChfIt(c.residual_chf),
          stat_unit: "Credito residuo a fine esercizio",
          body: `Speso finora: ${formatChfIt(c.spent_total_chf)} su ${formatChfIt(c.voted_credit_chf)} (${c.mm_reference}).`,
          source_ref: `Conto ${c.account_code}`,
        },
        {
          slide_no: 3,
          kind: "QUESTION",
          headline: "Opera chiusa o in arrivo ultime fatture?",
          stat_value: `${c.mm_reference}`,
          stat_unit: `Consuntivo ${c.fiscal_year}`,
          body: `L'opera può essere liquidata senza crediti suppletori o ci sono ancora liquidazioni pendenti?`,
          source_ref: c.municipality_name,
        },
        {
          slide_no: 4,
          kind: "SOURCE",
          headline: "Fonte certificata",
          stat_value: `Pag. ${c.page_ref}`,
          stat_unit: `Allegato f · ${c.fiscal_year}`,
          body: "Consulta l'elenco completo dei crediti d'investimento su OFCL.",
          source_ref: url,
        },
      ],
      caption_draft: [
        `🎯 Precisione da orologio svizzero (o quasi sorpasso?) a ${c.municipality_name}:`,
        "",
        `Sul credito "${c.description}" (${c.mm_reference}) di ${formatChfIt(c.voted_credit_chf)}, è stato speso il ${c.pct_used.toFixed(2)}% e restano ${formatChfIt(c.residual_chf)}.`,
        "",
        `❓ Domanda al Municipio: il progetto è chiuso definitivamente o restano fatture finali da contabilizzare?`,
        "",
        `🔎 Allegato f, pag. ${c.page_ref}: ${url}`,
        "",
        ART_192_DISCLAIMER,
      ].join("\n"),
      hashtags: ["#FunFact", "#CreditiInvestimento", "#Locarnese", "#OFCL"],
      source_urls: [url],
      generation_mode: "DETERMINISTIC",
      status: "DRAFT",
      created_at: nowIso,
      priority_score: 450,
    });
  }

  return drafts.sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
}

/**
 * Guardrail anti-allucinazione numerica:
 * verifica che una riscrittura AI non cancelli o falsifichi gli importi chiave certificati.
 */
export function verifyNumericIntegrity(
  verifiedPayload: Record<string, unknown>,
  candidateTexts: string[]
): { ok: boolean; missingTokens: string[] } {
  const combined = candidateTexts.join(" ").replace(/'/g, "");
  const extractTokens = (text: string): string[] => {
    const cleaned = text.replace(/'/g, "");
    const matches = cleaned.match(/\d+(?:\.\d+)?/g) ?? [];
    return matches.filter((tok) => tok.length >= 2);
  };

  const payloadTokens = new Set<string>();
  for (const val of Object.values(verifiedPayload)) {
    if (typeof val === "number") {
      if (Math.abs(val) >= 10 && !Number.isInteger(val)) {
        payloadTokens.add(val.toFixed(2));
      } else if (Math.abs(val) >= 100) {
        payloadTokens.add(String(val));
      }
    } else if (typeof val === "string") {
      for (const tok of extractTokens(val)) {
        // Escludiamo codici UST o conti MCA2 puntati, verifichiamo cifre finanziarie/percentuali
        if (val.includes("CHF") || val.includes("%")) {
          payloadTokens.add(tok);
        }
      }
    }
  }

  const missingTokens: string[] = [];
  for (const tok of payloadTokens) {
    if (!combined.includes(tok)) {
      missingTokens.push(tok);
    }
  }

  return {
    ok: missingTokens.length === 0,
    missingTokens,
  };
}
