"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import { hasLiveSupabaseConfig } from "@/lib/admin-session-edge";

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * Salva la rettifica di una cella contabile con tracciamento obbligatorio in audit.curator_action.
 * Rispetta il vincolo del trigger DB fn_audit_ledger_correction (reason >= 10 caratteri).
 */
export async function saveLedgerCorrectionAction(
  versionId: string,
  ledgerValueId: string,
  newAmountChf: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      message:
        "Motivazione non valida: è richiesta una giustificazione di almeno 10 caratteri (vincolo MCA2 audit).",
    };
  }

  const parsedAmount = Number(newAmountChf.replace(/['\s]/g, "").replace(",", "."));
  if (!Number.isFinite(parsedAmount)) {
    return {
      success: false,
      message: "Importo CHF non valido.",
    };
  }

  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return {
      success: true,
      message: "Rettifica salvata e tracciata con successo (Sandbox E2E).",
    };
  }

  try {
    const db = await getAdminDbClient();
    const targetIdNum = Number(ledgerValueId);
    let beforeAmount: number | null = null;

    if (!Number.isNaN(targetIdNum)) {
      const { data: existingRow } = await db
        .schema("core")
        .from("ledger_value")
        .select("amount_chf")
        .eq("id", targetIdNum)
        .maybeSingle();
      beforeAmount = existingRow?.amount_chf ?? null;
    }

    const { error: auditError } = await db
      .schema("audit")
      .from("curator_action")
      .insert({
        actor: session.actorId,
        action: "CORRECT_VALUE",
        target_table: "core.ledger_value",
        target_id: ledgerValueId,
        before: beforeAmount !== null ? { amount_chf: beforeAmount } : null,
        after: { amount_chf: parsedAmount, version_id: versionId },
        reason: reason.trim(),
      });

    if (auditError) {
      return { success: false, message: `Errore audit: ${auditError.message}` };
    }

    if (!Number.isNaN(targetIdNum)) {
      const { error: updateError } = await db
        .schema("core")
        .from("ledger_value")
        .update({
          amount_chf: parsedAmount,
          method: "MANUAL",
        })
        .eq("id", targetIdNum);

      if (updateError) {
        return {
          success: false,
          message: `Errore rettifica: ${updateError.message}`,
        };
      }
    }

    revalidatePath(`/admin/review/${versionId}`);
    return {
      success: true,
      message: "Rettifica salvata e tracciata con successo.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Errore durante il salvataggio della rettifica",
    };
  }
}

/**
 * Approva e pubblica online il fascicolo documentale.
 * Blocca la pubblicazione se sono presenti controlli BLOCKING falliti senza override motivato
 * oppure se il documento contiene dati personali nLPD.
 */
export async function approveAndPublishAction(
  versionId: string,
  overrideReason?: string
): Promise<ActionResult> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return {
      success: true,
      message:
        "Fascicolo pubblicato con successo sul portale pubblico OFCL (Sandbox E2E).",
    };
  }

  try {
    const db = await getAdminDbClient();

    const [{ data: verData, error: verErr }, { data: checks }] =
      await Promise.all([
        db
          .schema("raw")
          .from("document_version")
          .select(
            "id, status, document:document_id (id, contains_personal_data)"
          )
          .eq("id", versionId)
          .maybeSingle(),
        db
          .schema("core")
          .from("validation_result")
          .select("rule_code, severity, passed")
          .eq("version_id", versionId),
      ]);

    if (verErr || !verData) {
      return {
        success: false,
        message: verErr?.message || "Versione documento non trovata.",
      };
    }

    const docObj = Array.isArray(verData.document)
      ? verData.document[0]
      : verData.document;

    if (docObj?.contains_personal_data) {
      return {
        success: false,
        message:
          "Pubblicazione bloccata (Guardrail nLPD): il fascicolo è marcato con dati personali.",
      };
    }

    const failedBlocking = (checks || []).filter(
      (c) => !c.passed && c.severity === "BLOCKING"
    );
    if (failedBlocking.length > 0) {
      if (!overrideReason || overrideReason.trim().length < 10) {
        return {
          success: false,
          message: `Pubblicazione bloccata: ${failedBlocking.length} controlli BLOCKING falliti (${failedBlocking.map((c) => c.rule_code).join(", ")}).`,
        };
      }

      const { error: ovErr } = await db
        .schema("audit")
        .from("curator_action")
        .insert({
          actor: session.actorId,
          action: "OVERRIDE_BLOCKING",
          target_table: "raw.document_version",
          target_id: versionId,
          before: { failed_rules: failedBlocking.map((c) => c.rule_code) },
          after: { override_approved: true },
          reason: overrideReason.trim(),
        });
      if (ovErr) {
        return { success: false, message: `Errore audit override: ${ovErr.message}` };
      }
    }

    const { error: auditError } = await db
      .schema("audit")
      .from("curator_action")
      .insert({
        actor: session.actorId,
        action: "PUBLISH",
        target_table: "raw.document_version",
        target_id: versionId,
        before: { status: verData.status },
        after: { status: "PUBLISHED" },
        reason:
          "Documento approvato dal curatore dopo verifica delle quadrature contabili MCA2.",
      });

    if (auditError) {
      return {
        success: false,
        message: `Errore audit: ${auditError.message}`,
      };
    }

    const { error } = await db
      .schema("raw")
      .from("document_version")
      .update({
        status: "PUBLISHED",
        published_at: new Date().toISOString(),
      })
      .eq("id", versionId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath(`/admin/review/${versionId}`);
    revalidatePath("/admin/queue");
    revalidatePath("/documenti");
    revalidatePath("/");
    revalidateTag("mca2-data", "max");
    return {
      success: true,
      message: "Fascicolo pubblicato con successo sul portale pubblico OFCL.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : "Errore durante la pubblicazione",
    };
  }
}

/**
 * Rifiuta o archivia un fascicolo dalla coda di revisione (es. documento non contabile / fuori perimetro).
 */
export async function rejectDocumentAction(
  versionId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      message:
        "Motivazione non valida: inserisci almeno 10 caratteri per tracciare il rifiuto in audit.",
    };
  }

  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return {
      success: true,
      message: "Fascicolo marcato come REJECTED (Sandbox E2E).",
    };
  }

  try {
    const db = await getAdminDbClient();
    const { data: verData } = await db
      .schema("raw")
      .from("document_version")
      .select("status")
      .eq("id", versionId)
      .maybeSingle();

    const { error: auditError } = await db
      .schema("audit")
      .from("curator_action")
      .insert({
        actor: session.actorId,
        action: "REJECT",
        target_table: "raw.document_version",
        target_id: versionId,
        before: { status: verData?.status ?? null },
        after: { status: "REJECTED" },
        reason: reason.trim(),
      });

    if (auditError) {
      return { success: false, message: `Errore audit: ${auditError.message}` };
    }

    const { error } = await db
      .schema("raw")
      .from("document_version")
      .update({ status: "REJECTED" })
      .eq("id", versionId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath(`/admin/review/${versionId}`);
    revalidatePath("/admin/queue");
    return {
      success: true,
      message: "Fascicolo rifiutato e archiviato (status: REJECTED).",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Errore durante il rifiuto",
    };
  }
}

/**
 * Segnala o rimuove il flag di dati personali (nLPD).
 */
export async function togglePiiAction(
  documentId: string,
  versionId: string,
  containsPii: boolean,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return {
      success: false,
      message:
        "Motivazione non valida: inserisci almeno 10 caratteri per il registro audit.",
    };
  }

  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return {
      success: true,
      message: `Flag PII aggiornato a: ${containsPii} (Sandbox E2E)`,
    };
  }

  try {
    const db = await getAdminDbClient();
    const { error: auditError } = await db
      .schema("audit")
      .from("curator_action")
      .insert({
        actor: session.actorId,
        action: "MARK_PERSONAL_DATA",
        target_table: "raw.document",
        target_id: documentId,
        before: { contains_personal_data: !containsPii },
        after: { contains_personal_data: containsPii },
        reason: reason.trim(),
      });

    if (auditError) {
      return {
        success: false,
        message: `Errore audit: ${auditError.message}`,
      };
    }

    const { error } = await db
      .schema("raw")
      .from("document")
      .update({ contains_personal_data: containsPii })
      .eq("id", documentId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath(`/admin/review/${versionId}`);
    revalidatePath("/admin/queue");
    return {
      success: true,
      message: `Flag PII aggiornato a: ${containsPii}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Errore aggiornamento PII",
    };
  }
}
