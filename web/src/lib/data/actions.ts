"use server";

import {
  getDistrictDataset,
  getPublicCreditsDataset,
  getPublicDocumentsDataset,
} from "@/lib/data/mca2-dal";
import type { MunicipalityData } from "@/data/municipalities";
import type { InvestmentCredit } from "@/data/credits";
import type { OfficialDocument } from "@/data/documents";

/**
 * Server Actions per sincronizzare le viste client interattive (/crediti, /documenti, /confronta)
 * con il Data Access Layer (mca2-dal.ts -> Supabase api.* views + ISR cache 'mca2-data').
 */
export async function fetchLiveDistrictAction(): Promise<MunicipalityData[]> {
  return await getDistrictDataset();
}

export async function fetchLiveCreditsAction(): Promise<InvestmentCredit[]> {
  return await getPublicCreditsDataset();
}

export async function fetchLiveDocumentsAction(): Promise<OfficialDocument[]> {
  return await getPublicDocumentsDataset();
}
