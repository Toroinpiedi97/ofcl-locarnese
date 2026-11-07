import { unstable_cache } from "next/cache";
import { createPublicAnonClient } from "@/lib/supabase/public-anon";
import { parseMca2Amount } from "@/lib/utils";
import {
  MUNICIPALITIES,
  type MunicipalityData,
  type SelIndicatorDetail,
  getMunicipalitySelIndicators,
} from "@/data/municipalities";
import { INVESTMENT_CREDITS, type InvestmentCredit } from "@/data/credits";
import { OFFICIAL_DOCUMENTS, type OfficialDocument } from "@/data/documents";

/**
 * Recupera l'elenco dei 19 comuni armonizzati con metriche di sintesi.
 * Caching Server-Side ISR (1h) invalidabile via tag 'mca2-data'.
 */
export const getDistrictDataset = unstable_cache(
  async (): Promise<MunicipalityData[]> => {
    try {
      const supabase = createPublicAnonClient();

      // Query parallela alle viste pubbliche PostgreSQL (schema api)
      const [munRes, indRes, sumRes, civicRes] = await Promise.all([
        supabase.schema("api").from("municipalities").select("*"),
        supabase.schema("api").from("indicators").select("*"),
        supabase.schema("api").from("summary_by_year").select("*"),
        supabase.schema("api").from("municipal_civic_guide").select("*"),
      ]);

      if (munRes.error || !munRes.data || munRes.data.length === 0) {
        // Fallback resiliente alla baseline certificata
        return MUNICIPALITIES;
      }

      // Merge dinamico dei dati pubblicati sopra la baseline anagrafica
      const dbMunMap = new Map(munRes.data.map((row) => [row.ust_code, row]));
      const dbIndMap = new Map<number, SelIndicatorDetail[]>();

      if (indRes.data) {
        for (const ind of indRes.data) {
          if (!dbIndMap.has(ind.ust_code)) {
            dbIndMap.set(ind.ust_code, []);
          }
          const val = parseMca2Amount(ind.value);
          dbIndMap.get(ind.ust_code)!.push({
            code: ind.indicator_code,
            name: ind.indicator_label,
            short_label: ind.indicator_code.replace(/_/g, " ").slice(0, 10),
            value: val,
            unit: ind.unit === "PCT" ? "%" : ind.unit === "CHF_PER_CAPITA" ? "CHF/ab" : "",
            band: (ind.band_label?.toUpperCase() || "MEDIO") as any,
            formula: ind.formula_text || "",
            threshold_hint: "",
            is_conform: ind.band_color !== "critical",
          });
        }
      }

      // Mappa sintesi contabile annuale (api.summary_by_year - ultimo anno disponibile per ente COMUNE)
      const dbSummaryMap = new Map<
        number,
        DatabaseSummaryRow
      >();
      type DatabaseSummaryRow = NonNullable<typeof sumRes.data>[number];
      if (sumRes.data) {
        for (const row of sumRes.data) {
          if (row.entity_kind && row.entity_kind !== "COMUNE") continue;
          const prev = dbSummaryMap.get(row.ust_code);
          if (!prev || row.ref_year >= prev.ref_year) {
            dbSummaryMap.set(row.ust_code, row);
          }
        }
      }

      // Mappa tariffe e sussidi civici verificati (api.municipal_civic_guide)
      const dbCivicMap = new Map<number, NonNullable<typeof civicRes.data>>();
      if (civicRes.data) {
        for (const item of civicRes.data) {
          if (!dbCivicMap.has(item.ust_code)) {
            dbCivicMap.set(item.ust_code, []);
          }
          dbCivicMap.get(item.ust_code)!.push(item);
        }
      }

      return MUNICIPALITIES.map((base) => {
        const dbRow = dbMunMap.get(base.ust_code);
        if (!dbRow) return base;

        const sumRow = dbSummaryMap.get(base.ust_code);
        const civicItems = dbCivicMap.get(base.ust_code);
        const indList =
          dbIndMap.get(base.ust_code) ?? getMunicipalitySelIndicators(base);

        // Calcolo dinamico metriche di sintesi se presenti in api.summary_by_year
        const risultatoOperativo = sumRow
          ? Number(sumRow.ricavi_operativi) -
            Number(sumRow.spese_operative) +
            (Number(sumRow.ricavi_finanziari_44) - Number(sumRow.spese_finanziarie_34))
          : base.summary_30s.risultato_ordinario_chf;

        const investimentiNetti = sumRow
          ? Number(sumRow.uscite_investimenti_ba) - Number(sumRow.entrate_investimenti_ba)
          : base.summary_30s.investimenti_netti_chf;

        // Aggiornamento dinamico tariffe civiche se presenti in api.municipal_civic_guide
        const updatedCivic = { ...base.civic_tariffs };
        if (civicItems && civicItems.length > 0) {
          for (const ci of civicItems) {
            if (ci.benefit_code === "WASTE_BASE_FEE" && ci.value_display) {
              updatedCivic.waste_base_fee = ci.value_display;
            } else if (ci.benefit_code === "WASTE_BAG_35L" && ci.amount_min_chf !== null) {
              updatedCivic.waste_bag_35l_chf = Number(ci.amount_min_chf);
            } else if (ci.benefit_code === "DOG_TAX" && ci.amount_min_chf !== null) {
              updatedCivic.dog_tax_chf = Number(ci.amount_min_chf);
            } else if (ci.benefit_code === "REAL_ESTATE_TAX" && ci.pct_value !== null) {
              updatedCivic.real_estate_tax_permille = Number(ci.pct_value);
            } else if (ci.benefit_code === "BIRTH_BONUS" && ci.amount_min_chf !== null) {
              updatedCivic.birth_bonus_chf = Number(ci.amount_min_chf);
            } else if (ci.benefit_code === "CANTEEN_MEAL" && ci.amount_min_chf !== null) {
              updatedCivic.canteen_meal_chf = Number(ci.amount_min_chf);
            } else if (ci.benefit_code === "CLIMATE_FUND") {
              updatedCivic.climate_fund_active = ci.status === "ACTIVE";
            }
          }
        }

        return {
          ...base,
          population: dbRow.latest_population ?? base.population,
          tax_multiplier_pf: dbRow.tax_multiplier_pf ?? base.tax_multiplier_pf,
          tax_multiplier_pg: dbRow.tax_multiplier_pg ?? base.tax_multiplier_pg,
          has_differentiated_pg:
            dbRow.tax_multiplier_pg !== null &&
            dbRow.tax_multiplier_pg !== dbRow.tax_multiplier_pf,
          waste_base_fee: updatedCivic.waste_base_fee,
          civic_tariffs: updatedCivic,
          sel_indicators_detail: indList,
          summary_30s: {
            ...base.summary_30s,
            risultato_ordinario_chf: risultatoOperativo,
            investimenti_netti_chf: investimentiNetti,
          },
        };
      });
    } catch {
      return MUNICIPALITIES;
    }
  },
  ["ofcl-district-dataset"],
  { revalidate: 3600, tags: ["mca2-data"] }
);

/**
 * Recupera il profilo completo di un singolo comune dato lo slug.
 */
export async function getMunicipalityProfile(
  slug: string
): Promise<MunicipalityData | null> {
  const all = await getDistrictDataset();
  return all.find((m) => m.slug.toLowerCase() === slug.toLowerCase()) || null;
}

/**
 * Recupera il dataset dei crediti d'opera (Allegato f MCA2, Art. 15 LOC).
 */
export const getPublicCreditsDataset = unstable_cache(
  async (): Promise<InvestmentCredit[]> => {
    try {
      const supabase = createPublicAnonClient();
      const { data, error } = await supabase
        .schema("api")
        .from("investment_credits_overview")
        .select("*");

      if (error || !data || data.length === 0) {
        return INVESTMENT_CREDITS;
      }

      return data.map((row) => ({
        id: String(row.id),
        ust_code: row.ust_code,
        municipality_slug:
          MUNICIPALITIES.find((m) => m.ust_code === row.ust_code)?.slug || "locarno",
        municipality_name: row.municipality_name,
        account_code: row.account_full,
        description: row.title,
        mm_reference: row.mm_number ? `MM ${row.mm_number}` : "MM CC",
        vote_date: row.vote_date || undefined,
        fiscal_year: row.last_snapshot_year || 2025,
        voted_credit_chf: Number(row.amount_voted) || 0,
        spent_prev_chf: Number(row.used_at_0101) || 0,
        spent_year_chf: Number(row.spent_year) || 0,
        spent_total_chf: Number(row.spent_total) || 0,
        residual_chf: parseMca2Amount(row.residual) ?? 0,
        is_overrun: (row.overrun ?? 0) > 0 || (row.residual ?? 0) < 0,
        pct_used:
          row.amount_voted && row.spent_total
            ? (row.spent_total / row.amount_voted) * 100
            : 0,
        page_ref: row.page || 1,
      }));
    } catch {
      return INVESTMENT_CREDITS;
    }
  },
  ["ofcl-credits-dataset"],
  { revalidate: 3600, tags: ["mca2-data"] }
);

/**
 * Recupera il catalogo dei fascicoli ufficiali indicizzati (solo PUBLISHED).
 */
export const getPublicDocumentsDataset = unstable_cache(
  async (): Promise<OfficialDocument[]> => {
    try {
      const supabase = createPublicAnonClient();
      const { data, error } = await supabase
        .schema("api")
        .from("documents")
        .select("*");

      if (error || !data || data.length === 0) {
        return OFFICIAL_DOCUMENTS;
      }

      return data.map((d) => ({
        id: d.version_id,
        ust_code: d.ust_code,
        municipality_name: d.municipality_name,
        municipality_slug: d.municipality_slug,
        document_kind: (d.doc_type as any) || "CONSUNTIVO",
        fiscal_year: d.fiscal_year || 2025,
        title: d.title_raw || `Fascicolo ${d.municipality_name}`,
        mm_reference: d.mm_number ? `MM ${d.mm_number}` : "MM",
        file_size_bytes: d.file_size_bytes,
        pages: d.page_count,
        sha256: d.sha256,
        original_url: d.origin_url,
        has_personal_data: false,
      }));
    } catch {
      return OFFICIAL_DOCUMENTS;
    }
  },
  ["ofcl-documents-dataset"],
  { revalidate: 3600, tags: ["mca2-data"] }
);
