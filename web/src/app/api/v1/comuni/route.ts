import { NextRequest } from "next/server";
import { getDistrictDataset } from "@/lib/data/mca2-dal";
import { apiSuccess, apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const ust = searchParams.get("ust");
  const slug = searchParams.get("slug");
  const comune = searchParams.get("comune");

  let list = await getDistrictDataset();

  if (comune) {
    const isNum = !isNaN(Number(comune)) && !isNaN(parseFloat(comune));
    list = list.filter((m) =>
      isNum
        ? m.ust_code === Number(comune)
        : m.slug.toLowerCase() === comune.toLowerCase() ||
          m.name.toLowerCase() === comune.toLowerCase()
    );
  } else {
    if (ust) {
      const ustNum = Number(ust);
      list = list.filter((m) => m.ust_code === ustNum);
    }
    if (slug) {
      list = list.filter((m) => m.slug.toLowerCase() === slug.toLowerCase());
    }
  }

  return apiSuccess(list);
}
