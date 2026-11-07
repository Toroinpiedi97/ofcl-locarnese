import { NextRequest } from "next/server";
import { getDistrictDataset } from "@/lib/data/mca2-dal";
import { apiSuccess, apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filterParam = searchParams.get("comune") || searchParams.get("ust");
  const yearParam = searchParams.get("anno") || "2025";
  const year = Number(yearParam);

  let targetList = await getDistrictDataset();
  if (filterParam) {
    const isNum = !isNaN(Number(filterParam)) && !isNaN(parseFloat(filterParam));
    targetList = targetList.filter((m) =>
      isNum
        ? m.ust_code === Number(filterParam)
        : m.slug.toLowerCase() === filterParam.toLowerCase() ||
          m.name.toLowerCase() === filterParam.toLowerCase()
    );
  }

  const NA = (code: string, name: string, unit: string) => ({
    code,
    name,
    value: null as number | null,
    unit,
    band: "NON_DISPONIBILE",
    thresholds: null as string | null,
    is_conform: null as boolean | null,
    status: "non_disponibile",
  });

  const result = targetList.map((m) => {
    const s = m.summary_30s;
    const autofin = s.autofinanziamento_chf;
    const investNetti = s.investimenti_netti_chf;
    const debitoPc = s.debito_netto_pc_chf;

    // Si espongono SOLO indicatori calcolabili dai dati verificati.
    // Gli altri restano null (mai valori stimati/placeholder).
    const hasData = investNetti > 0 || autofin !== 0;
    const degreeVal = investNetti > 0 ? (autofin / investNetti) * 100 : null;

    const degree =
      degreeVal === null
        ? NA("SELF_FINANCING_DEGREE", "Grado di autofinanziamento", "%")
        : {
            code: "SELF_FINANCING_DEGREE",
            name: "Grado di autofinanziamento",
            value: Number(degreeVal.toFixed(1)),
            unit: "%",
            band: degreeVal >= 100 ? "OTTIMO" : degreeVal >= 70 ? "MEDIO" : "DEBOLE",
            thresholds: "> 100% Buono · 70-100% Accettabile · < 70% Debole",
            is_conform: degreeVal >= 70,
            status: "calcolato",
          };

    const perCapita = !hasData
      ? NA("NET_DEBT_PER_CAPITA", "Debito netto pro capite", "CHF/ab")
      : {
          code: "NET_DEBT_PER_CAPITA",
          name: "Debito netto pro capite",
          value: debitoPc,
          unit: "CHF/ab",
          band: debitoPc < 2500 ? "OTTIMO" : debitoPc <= 5000 ? "MEDIO" : "CRITICO",
          thresholds: "< 2'500 Buono · 2'500-5'000 Medio · > 5'000 Elevato",
          is_conform: debitoPc <= 5000,
          status: "calcolato",
        };

    return {
      ust_code: m.ust_code,
      municipality_name: m.name,
      municipality_slug: m.slug,
      fiscal_year: year,
      conformity_score: s.sel_conformity,
      indicators: [
        degree,
        NA("SELF_FINANCING_CAPACITY", "Capacità di autofinanziamento", "%"),
        NA("INTEREST_BURDEN_RATIO", "Quota oneri finanziari (Interessi)", "%"),
        NA("CAPITAL_SERVICE_RATIO", "Quota del servizio del debito", "%"),
        NA("NET_DEBT_RATIO", "Quota del debito netto", "%"),
        perCapita,
        NA("INVESTMENT_RATIO", "Quota degli investimenti", "%"),
        NA("EQUITY_RATIO", "Quota del capitale proprio", "%"),
      ],
      delibera_riferimento: s.latest_mm_reference,
    };
  });

  return apiSuccess(result);
}
