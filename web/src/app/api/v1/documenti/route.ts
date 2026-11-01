import { NextRequest } from "next/server";
import { OFFICIAL_DOCUMENTS } from "@/data/documents";
import { apiSuccess, apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const ust = searchParams.get("ust");
  const kind = searchParams.get("kind");
  const yearParam = searchParams.get("anno");

  let list = OFFICIAL_DOCUMENTS;

  if (ust) {
    const ustNum = Number(ust);
    list = list.filter((d) => d.ust_code === ustNum);
  }

  if (kind) {
    list = list.filter((d) => d.document_kind.toLowerCase() === kind.toLowerCase());
  }

  if (yearParam) {
    const y = Number(yearParam);
    list = list.filter((d) => d.fiscal_year === y);
  }

  return apiSuccess(list);
}
