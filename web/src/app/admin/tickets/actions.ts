"use server";

import { createClient } from "@/lib/supabase/server";
import { MUNICIPALITIES } from "@/data/municipalities";
import { revalidatePath } from "next/cache";

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
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
    };
    if (newStatus === "RESOLVED" || newStatus === "DISMISSED") {
      updatePayload.resolved_at = new Date().toISOString();
      if (user?.id) {
        updatePayload.resolved_by = user.id;
      }
    }

    const { error } = await supabase
      .schema("audit")
      .from("feedback_ticket")
      .update(updatePayload as any)
      .eq("id", ticketId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath("/admin/tickets");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Errore aggiornamento ticket",
    };
  }
}
