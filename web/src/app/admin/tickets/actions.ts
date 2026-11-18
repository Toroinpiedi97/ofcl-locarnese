"use server";

import { revalidatePath } from "next/cache";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import { hasLiveSupabaseConfig } from "@/lib/admin-session-edge";
import { MUNICIPALITIES } from "@/data/municipalities";

export interface FeedbackTicketDto {
  id: string;
  ust_code: number;
  municipality_name: string;
  category: "DISCREPANZA_CIFRA" | "SEGNALAZIONE_ATTO" | "ACCESSIBILITA" | "ALTRO";
  message: string;
  page_url?: string;
  status: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  created_at: string;
}

export async function fetchLiveTicketsAction(): Promise<FeedbackTicketDto[]> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return [];
  }
  if (!hasLiveSupabaseConfig()) {
    return [];
  }

  try {
    const db = await getAdminDbClient();
    const { data, error } = await db
      .schema("audit")
      .from("feedback_ticket")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) => {
      const ustCode = row.ust_code ?? 5113;
      const munName =
        MUNICIPALITIES.find((m) => m.ust_code === ustCode)?.name ||
        `Comune UST ${ustCode}`;
      const rawMetric = row.target_metric || "ALTRO";
      const category: FeedbackTicketDto["category"] =
        rawMetric === "DISCREPANZA_CIFRA" ||
        rawMetric === "SEGNALAZIONE_ATTO" ||
        rawMetric === "ACCESSIBILITA"
          ? rawMetric
          : "ALTRO";

      return {
        id: row.id,
        ust_code: ustCode,
        municipality_name: munName,
        category,
        message: row.message_clean,
        page_url: row.page_path || undefined,
        status: row.status,
        created_at: row.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function updateTicketStatusAction(
  ticketId: string,
  newStatus: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED"
): Promise<{ success: boolean; message?: string }> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return { success: true };
  }

  try {
    const db = await getAdminDbClient();
    const updatePayload: {
      status: "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
      resolved_at?: string | null;
      resolved_by?: string | null;
    } = {
      status: newStatus,
    };
    if (newStatus === "RESOLVED" || newStatus === "DISMISSED") {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = session.actorId;
    }

    const { error } = await db
      .schema("audit")
      .from("feedback_ticket")
      .update(updatePayload)
      .eq("id", ticketId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/tickets");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Errore aggiornamento ticket",
    };
  }
}
