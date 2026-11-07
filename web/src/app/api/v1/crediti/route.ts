import { NextRequest } from "next/server";
import { getPublicCreditsDataset } from "@/lib/data/mca2-dal";
import { apiSuccess, apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filterParam = searchParams.get("comune") || searchParams.get("ust");
  const overrunsOnly =
    searchParams.get("overruns_only") === "true" ||
    searchParams.get("overrun_only") === "true";

  let list = await getPublicCreditsDataset();

  if (filterParam) {
    const isNum = !isNaN(Number(filterParam)) && !isNaN(parseFloat(filterParam));
    list = list.filter((c) =>
      isNum
        ? c.ust_code === Number(filterParam)
        : c.municipality_slug.toLowerCase() === filterParam.toLowerCase() ||
          c.municipality_name.toLowerCase() === filterParam.toLowerCase()
    );
  }

  if (overrunsOnly) {
    list = list.filter((c) => c.is_overrun);
  }

  return apiSuccess(list);
}
