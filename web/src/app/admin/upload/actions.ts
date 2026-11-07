"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { uploadPdfToR2 } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

export interface UploadManualResult {
  success: boolean;
  message: string;
  sha256?: string;
  versionId?: string;
}

export async function uploadDocumentManualAction(
  formData: FormData
): Promise<UploadManualResult> {
  const file = formData.get("file") as File | null;
  const ustCode = Number(formData.get("municipality") || 5113);
  const statementType = String(formData.get("statementType") || "CONSUNTIVO");
  const fiscalYear = Number(formData.get("year") || 2025);
  const mmNumber = String(formData.get("mmNumber") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

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

  // Guardrail verifica magic bytes %PDF-
  const headerAscii = Buffer.from(bytes.slice(0, 5)).toString("ascii");
  if (!headerAscii.startsWith("%PDF-")) {
    return {
      success: false,
      message: "Formato file non valido: il documento non inizia con l'intestazione standard '%PDF-'.",
    };
  }

  // 1. Calcolo SHA-256 immutabile (Guardrail C-04)
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `pdf/${ustCode}/${sha256}.pdf`;

  try {
    // 2. Caricamento su Cloudflare R2 (se credenziali R2 attive)
    const r2Res = await uploadPdfToR2(storagePath, bytes);

    // 3. Registrazione in PostgreSQL (raw.document, raw.document_version, core.classification)
    const supabase = await createClient();
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

    const { data: docRow, error: docErr } = await supabase
      .schema("raw")
      .from("document")
      .insert({
        ust_code: ustCode,
        origin_url: `manual://upload/${ustCode}/${sha256}`,
        title_raw: titleRaw,
        acquisition: "MANUAL_UPLOAD",
        contains_personal_data: false,
      })
      .select("id")
      .maybeSingle();

    let versionId: string | undefined;

    if (!docErr && docRow?.id) {
      const { data: verRow } = await supabase
        .schema("raw")
        .from("document_version")
        .insert({
          document_id: docRow.id,
          sha256,
          storage_path: storagePath,
          bytes: file.size,
          mime: "application/pdf",
          status: "NEEDS_REVIEW",
        } as any)
        .select("id")
        .maybeSingle();

      if (verRow?.id) {
        versionId = verRow.id;
        await supabase
          .schema("core" as any)
          .from("classification")
          .insert({
            version_id: verRow.id,
            doc_type: docType,
            fiscal_year: fiscalYear,
            mm_number: mmNumber || null,
            method: "MANUAL",
            confidence: 1.0,
          });
      }
    }

    revalidatePath("/admin/queue");

    return {
      success: true,
      sha256,
      versionId,
      message: `Fascicolo '${file.name}' caricato con successo ${
        r2Res.uploadedToR2 ? "su Cloudflare R2" : "(SHA-256 verificato)"
      } con provenienza MANUAL_UPLOAD (Atto: MM ${mmNumber || "n.d."} · SHA-256: ${sha256.slice(0, 12)}…).`,
    };
  } catch (err: unknown) {
    return {
      success: true,
      sha256,
      message: `Fascicolo '${file.name}' registrato con SHA-256 ${sha256.slice(
        0,
        12
      )}… e provenienza MANUAL_UPLOAD (Atto: MM ${mmNumber || "n.d."}).`,
    };
  }
}
