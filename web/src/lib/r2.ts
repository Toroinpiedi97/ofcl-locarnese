import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { consume } from "@/lib/guardrails";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "ofcl-raw-pdfs";

function getS3Client(): S3Client | null {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Carica un fascicolo PDF su Cloudflare R2 con chiave deterministica pdf/{ust}/{sha256}.pdf.
 */
export async function uploadPdfToR2(
  r2Key: string,
  body: Uint8Array
): Promise<{ uploadedToR2: boolean; storagePath: string }> {
  const s3 = getS3Client();
  if (!s3) {
    return { uploadedToR2: false, storagePath: r2Key };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    Body: body,
    ContentType: "application/pdf",
  });

  await s3.send(command);
  return { uploadedToR2: true, storagePath: r2Key };
}

/**
 * Genera un URL firmato temporaneo (Presigned URL) per visualizzare in sicurezza
 * il documento PDF originale da Cloudflare R2 nella console curatore (default: 15 min).
 */
export async function getPresignedPdfUrl(
  r2Key: string,
  expiresInSeconds: number = 900
): Promise<string> {
  // Guardrail quota R2 (operazioni Class B): oltre il tetto giornaliero non si firma
  const guard = consume("r2_presign", "console-curatore");
  if (!guard.ok) {
    throw new Error("Quota giornaliera R2 esaurita: riprova dopo mezzanotte UTC.");
  }
  const s3 = getS3Client();
  if (!s3) {
    // In assenza di credenziali R2 (ambiente dev locale offline), restituisce un URL fittizio o locale
    return `/api/mock-pdf?key=${encodeURIComponent(r2Key)}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: "inline",
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
