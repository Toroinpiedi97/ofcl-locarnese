import { redirect } from "next/navigation";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import {
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
} from "@/lib/admin-session-edge";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { FeedbackTicketDto } from "./actions";
import { TicketsClient } from "./TicketsClient";

export const dynamic = "force-dynamic";

const SANDBOX_TICKETS: FeedbackTicketDto[] = [
  {
    id: "t-001",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    category: "DISCREPANZA_CIFRA",
    message:
      "Sul credito tornante Jacomello è indicato un residuo negativo di -16'130.65 CHF. È stato votato un credito suppletorio?",
    page_url: "/comuni/brione-sopra-minusio/crediti",
    status: "NEW",
    created_at: "2026-11-01T14:30:00Z",
  },
  {
    id: "t-002",
    ust_code: 5113,
    municipality_name: "Locarno",
    category: "SEGNALAZIONE_ATTO",
    message:
      "È uscito all'albo il nuovo Preventivo 2027 per la Città di Locarno (MM 12). Verrà caricato presto?",
    page_url: "/comuni/locarno",
    status: "IN_REVIEW",
    created_at: "2026-10-31T09:15:00Z",
  },
  {
    id: "t-003",
    ust_code: 5115,
    municipality_name: "Losone",
    category: "ACCESSIBILITA",
    message:
      "La tabella sul contrasto per i daltonici è ottima, ma potreste aggiungere anche l'export CSV dei soli crediti?",
    page_url: "/crediti",
    status: "RESOLVED",
    created_at: "2026-10-28T16:45:00Z",
  },
];

export default async function CuratorTicketsPage() {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    redirect("/admin/login");
  }

  const sandboxMode = isOfflineDevSandbox();
  const liveDbMode = hasLiveSupabaseConfig() && !sandboxMode;

  let tickets: FeedbackTicketDto[] = sandboxMode ? SANDBOX_TICKETS : [];
  let dbError: string | null = null;

  if (liveDbMode) {
    try {
      const db = await getAdminDbClient();
      const { data, error } = await db
        .schema("audit")
        .from("feedback_ticket")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        dbError = `Errore lettura audit.feedback_ticket: ${error.message}`;
      } else {
        tickets = (data || []).map((row) => {
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
      }
    } catch (err) {
      dbError =
        err instanceof Error
          ? err.message
          : "Errore di connessione a Supabase per audit.feedback_ticket.";
    }
  }

  return (
    <TicketsClient
      initialTickets={tickets}
      isSandbox={sandboxMode && !liveDbMode}
      dbError={dbError}
    />
  );
}
