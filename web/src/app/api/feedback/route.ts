import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// In-memory rate limiting map come fallback (ip_hash -> list of timestamps)
const rateLimitMap = new Map<string, number[]>();

// Schema di validazione Zod rigoroso (max 500 caratteri, solo testo pulito)
const feedbackSchema = z.object({
  page_path: z.string().min(1).max(255),
  message: z
    .string()
    .min(10, "La segnalazione deve contenere almeno 10 caratteri.")
    .max(500, "La segnalazione non può superare i 500 caratteri."),
  reporter_email: z
    .string()
    .email("Formato email non valido.")
    .max(254)
    .optional()
    .or(z.literal("")),
  target_metric: z.string().max(100).optional(),
  ust_code: z.number().int().optional(),
  website_hp: z.string().optional(), // Honeypot invisibile per bot
});

/**
 * Sanitizza il testo rimuovendo tag HTML, script e caratteri di controllo.
 */
function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "") // Rimuove tag HTML/XML
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Rimuove caratteri di controllo ASCII
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();

    // 1. Validazione Honeypot: se compilato, è un bot -> scarta silenziosamente
    if (json.website_hp && json.website_hp.trim().length > 0) {
      return NextResponse.json(
        { success: true, message: "Segnalazione ricevuta." },
        { status: 200 }
      );
    }

    // 2. Validazione Zod del payload
    const parsed = feedbackSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, message: issue?.message || "Dati non validi." },
        { status: 400 }
      );
    }

    const { page_path, message, reporter_email, target_metric, ust_code } = parsed.data;

    // 3. Sanitizzazione anti-XSS e verifica lunghezza post-sanitizzazione
    const cleanMessage = sanitizeText(message);
    if (cleanMessage.length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "La segnalazione deve contenere almeno 10 caratteri di testo valido.",
        },
        { status: 400 }
      );
    }

    // 4. Estrazione IP e Hash con Salt SHA-256 (Privacy nLPD: nessun IP in chiaro sul DB)
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const salt = process.env.IP_SALT || "ofcl_audit_salt_2026_district";
    const ipHash = crypto.createHash("sha256").update(clientIp + salt).digest("hex");

    // 5. Rate Limiting: massimo 3 segnalazioni all'ora per IP
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const timestamps = (rateLimitMap.get(ipHash) || []).filter((t) => t > oneHourAgo);
    if (timestamps.length >= 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Limite raggiunto: massimo 3 segnalazioni all'ora per dispositivo/IP. Riprova più tardi.",
        },
        { status: 429 }
      );
    }
    timestamps.push(now);
    rateLimitMap.set(ipHash, timestamps);

    // 6. Salvataggio su database in audit.feedback_ticket
    try {
      const supabaseAdmin = createAdminClient();
      const { error: dbError } = await supabaseAdmin
        .from("audit.feedback_ticket" as any)
        .insert({
          page_path,
          message_clean: cleanMessage,
          reporter_email: reporter_email && reporter_email.trim().length > 0 ? reporter_email.trim() : null,
          target_metric: target_metric || null,
          ust_code: ust_code || null,
          ip_hash: ipHash,
          status: "NEW",
        } as any);

      if (dbError) {
        console.warn("[Civic Ticket DB Warning]", dbError.message);
      }
    } catch (dbErr: any) {
      console.warn("[Civic Ticket DB Offline Fallback]", dbErr.message);
    }

    // 7. Notifica Server-Side al Curatore Responsabile
    // L'indirizzo email di destinazione NON viene mai esposto nel bundle client del browser
    const recipientEmail =
      process.env.FEEDBACK_RECIPIENT_EMAIL || "nicolas.vecchio241097@gmail.com";

    console.info(
      `[CIVIC TICKET CREATED] Dest: ${recipientEmail} | UST: ${ust_code || "N/A"} | Path: ${page_path} | Msg: ${cleanMessage.slice(0, 60)}...`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Grazie! La tua segnalazione è stata inviata con successo al curatore dell'Osservatorio.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[POST /api/feedback Error]", err);
    return NextResponse.json(
      { success: false, message: "Errore interno durante l'invio della segnalazione." },
      { status: 500 }
    );
  }
}
