"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import { hasLiveSupabaseConfig } from "@/lib/admin-session-edge";
import { uploadPdfToR2 } from "@/lib/r2";
import { MUNICIPALITIES } from "@/data/municipalities";

export interface UploadManualResult {
  success: boolean;
  message: string;
  sha256?: string;
  versionId?: string;
}

export async function uploadDocumentManualAction(
  formData: FormData
): Promise<UploadManualResult> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  const file = formData.get("file") as File | null;
  const ustCode = Number(formData.get("municipality") || 0);
  const statementType = String(formData.get("statementType") || "CONSUNTIVO");
  const fiscalYear = Number(formData.get("year") || 2025);
  const mmNumber = String(formData.get("mmNumber") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!MUNICIPALITIES.some((m) => m.ust_code === ustCode)) {
    return { success: false, message: "Codice Comune UST non valido." };
  }

  if (!Number.isInteger(fiscalYear) || fiscalYear < 2015 || fiscalYear > 2035) {
    return { success: false, message: "Anno fiscale non valido." };
  }

  if (!file || file.size === 0) {
    return { success: false, message: "Seleziona un file PDF valido." };
  }

  if (file.size > 150 * 1024 * 1024) {
    return {
      success: false,
      message: "Il file supera il limite massimo consentito di 150 MB.",
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const headerAscii = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  if (!headerAscii.startsWith("%PDF-")) {
    return {
      success: false,
      message:
        "Formato file non valido: il documento non inizia con l'intestazione standard '%PDF-'.",
    };
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `pdf/${ustCode}/${sha256}.pdf`;

  if (session.via === "dev_sandbox" && !hasLiveSupabaseConfig()) {
    return {
      success: true,
      sha256,
      message: `Fascicolo '${file.name}' verificato in Sandbox E2E (SHA-256: ${sha256.slice(0, 12)}…).`,
    };
  }

  try {
    const r2Res = await uploadPdfToR2(storagePath, bytes);
    const db = await getAdminDbClient();

    const docType =
      statementType === "PREVENTIVO"
        ? "PREVENTIVO"
        : statementType === "CREDITO"
          ? "CREDITO_INVESTIMENTO"
          : statementType === "PIANO_FIN"
            ? "PIANO_FINANZIARIO"
            : "CONSUNTIVO";

    const titleRaw = `${mmNumber ? `MM ${mmNumber} ` : ""}${docType} ${fiscalYear} - ${file.name}${
      notes ? ` (${notes})` : ""
    }`;

    const { data: docRow, error: docErr } = await db
      .schema("raw")
      .from("document")
      .upsert(
        {
          ust_code: ustCode,
          origin_url: `manual://upload/${ustCode}/${sha256}`,
          title_raw: titleRaw,
          acquisition: "MANUAL_UPLOAD",
          contains_personal_data: false,
        },
        { onConflict: "ust_code,origin_url" }
      )
      .select("id")
      .maybeSingle();

    if (docErr || !docRow?.id) {
      return {
        success: false,
        sha256,
        message: `Errore salvataggio raw.document: ${docErr?.message || "nessun ID restituito"}`,
      };
    }

    const { data: existingVer } = await db
      .schema("raw")
      .from("document_version")
      .select("id, status")
      .eq("sha256", sha256)
      .maybeSingle();

    let versionId = existingVer?.id;

    if (!versionId) {
      const { data: verRow, error: verErr } = await db
        .schema("raw")
        .from("document_version")
        .insert({
          document_id: docRow.id,
          sha256,
          storage_path: storagePath,
          bytes: file.size,
          mime: "application/pdf",
          status: "NEEDS_REVIEW",
        })
        .select("id")
        .maybeSingle();

      if (verErr || !verRow?.id) {
        return {
          success: false,
          sha256,
          message: `Errore salvataggio raw.document_version: ${verErr?.message || "nessun ID restituito"}`,
        };
      }
      versionId = verRow.id;
    }

    const { error: clsErr } = await db
      .schema("core")
      .from("classification")
      .upsert(
        {
          version_id: versionId,
          doc_type: docType,
          fiscal_year: fiscalYear,
          mm_number: mmNumber || null,
          method: "MANUAL",
          confidence: 1.0,
        },
        { onConflict: "version_id" }
      );

    if (clsErr) {
      return {
        success: false,
        sha256,
        versionId,
        message: `Versione creata ma errore classificazione: ${clsErr.message}`,
      };
    }

    revalidatePath("/admin/queue");

    return {
      success: true,
      sha256,
      versionId,
      message: `Fascicolo '${file.name}' caricato con successo ${
        r2Res.uploadedToR2 ? "su Cloudflare R2" : "(R2 non configurato, solo metadati DB)"
      } · Stato: NEEDS_REVIEW · SHA-256: ${sha256.slice(0, 12)}…`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      sha256,
      message:
        err instanceof Error
          ? `Errore upload manuale: ${err.message}`
          : "Errore imprevisto durante il salvataggio del fascicolo.",
    };
  }
}
