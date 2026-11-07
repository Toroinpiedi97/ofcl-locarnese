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

  const summaries = targetList.map((m) => {
    const s = m.summary_30s;
    const isAvanzo = s.risultato_ordinario_chf >= 0;

    return {
      ust_code: m.ust_code,
      municipality_name: m.name,
      municipality_slug: m.slug,
      fiscal_year: year,
      conto_economico: {
        risultato_ordinario_chf: s.risultato_ordinario_chf,
        tipo_risultato: isAvanzo ? "AVANZO" : "DISAVANZO",
        autofinanziamento_chf: s.autofinanziamento_chf,
      },
      conto_investimenti: {
        investimenti_netti_chf: s.investimenti_netti_chf,
        fabbisogno_finanziamento_chf: Math.max(
          0,
          s.investimenti_netti_chf - s.autofinanziamento_chf
        ),
      },
      bilancio: {
        debito_netto_pc_chf: s.debito_netto_pc_chf,
        debito_netto_totale_chf: Math.round(s.debito_netto_pc_chf * m.population),
        popolazione_residente: m.population,
      },
      delibera_riferimento: s.latest_mm_reference,
    };
  });

  return apiSuccess(summaries);
}
