import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLiveSupabaseConfig } from "@/lib/admin-session-edge";
import type { Json } from "@/lib/supabase/database.types";

export const maxDuration = 60;

const VersionSchema = z.object({
  sha256: z.string().length(64),
  storage_path: z.string().min(1),
  bytes: z.number().int().positive(),
  mime: z.string().default("application/pdf"),
  pages: z.number().int().positive().nullable().optional(),
  has_text_layer: z.boolean().nullable().optional(),
  status: z
    .enum([
      "DOWNLOADED",
      "CLASSIFIED",
      "EXTRACTED",
      "VALIDATED",
      "NEEDS_REVIEW",
    ])
    .optional(),
});

const ClassificationSchema = z.object({
  doc_type: z.enum([
    "PREVENTIVO",
    "CONSUNTIVO",
    "PIANO_FINANZIARIO",
    "CREDITO_INVESTIMENTO",
    "RAPPORTO_COMMISSIONE",
    "ALTRO",
  ]),
  fiscal_year: z.number().int().min(2000).max(2100).nullable().optional(),
  mm_number: z.string().max(64).nullable().optional(),
  layout_family: z.string().max(64).nullable().optional(),
  method: z.enum(["RULES", "CONTENT", "MANUAL"]).default("RULES"),
  confidence: z.number().min(0).max(1).default(0.85),
});

const LedgerRowSchema = z.object({
  statement: z.enum(["CE", "CI", "BIL"]),
  view_kind: z.enum(["RIASSUNTO", "NATURA", "FUNZIONE", "DETTAGLIO"]),
  function_code: z.string().nullable().optional(),
  account_code: z.string().nullable().optional(),
  detail_code: z.string().nullable().optional(),
  label_raw: z.string().min(1),
  column_role: z.enum(["CURRENT", "PRIOR_BUDGET", "PRIOR_ACTUAL", "PF_YEAR"]),
  ref_year: z.number().int().min(2000).max(2100),
  value_kind: z.enum(["BUDGET", "ACTUAL", "PLAN"]),
  side: z.enum(["SPESA", "RICAVO", "ATTIVO", "PASSIVO", "SALDO"]),
  amount_chf: z.number().nullable(),
  amount_raw: z.string(),
  page: z.number().int().min(1),
  bbox: z.array(z.number()).length(4).nullable().optional(),
  method: z
    .enum(["DETERMINISTIC", "OCR", "LLM_ASSISTED", "MANUAL"])
    .default("DETERMINISTIC"),
  parser_version: z.string().default("gecoti_v3"),
});

const ValidationResultSchema = z.object({
  rule_code: z.string().min(1).max(32),
  severity: z.enum(["BLOCKING", "WARNING", "INFO"]),
  passed: z.boolean(),
  expected: z.number().nullable().optional(),
  actual: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  message: z.string().min(1),
});

const CreditItemSchema = z.object({
  account_code: z.string().min(1),
  mm_no: z.string().nullable().optional(),
  description: z.string().min(1),
  fiscal_year: z.number().int().min(2000).max(2100),
  voted_credit: z.number(),
  spent_prev: z.number(),
  spent_year: z.number(),
  spent_total: z.number(),
  remaining_credit: z.number(),
  page: z.number().int().min(1),
});

const DocumentIngestSchema = z.object({
  ust_code: z.number().int().min(5000).max(6000),
  origin_url: z.string().url(),
  title_raw: z.string().nullable().optional(),
  published_on: z.string().nullable().optional(),
  acquisition: z
    .enum(["CRAWLER", "MANUAL_UPLOAD", "LIT_REQUEST"])
    .default("CRAWLER"),
  contains_personal_data: z.boolean().default(false),
  version: VersionSchema.optional(),
  classification: ClassificationSchema.optional(),
  ledger_rows: z.array(LedgerRowSchema).optional(),
  validation_results: z.array(ValidationResultSchema).optional(),
  credit_items: z.array(CreditItemSchema).optional(),
});

const SocialDraftIngestSchema = z.object({
  signal_code: z.enum([
    "S05_CREDIT_OVERRUN",
    "S06_TARIFF_GAP",
    "S07_TAX_MULTIPLIER",
    "S08_PEER_COST_OUTLIER",
    "S09_BUDGET_DIVERGENCE",
    "S10_FUN_FACT",
  ]),
  dedup_key: z.string().min(1),
  ust_code: z.number().int().nullable().optional(),
  ref_year: z.number().int(),
  title: z.string().min(1),
  question_for_municipality: z.string().min(1),
  verified_payload: z.record(z.string(), z.unknown()),
  slides_json: z.array(z.record(z.string(), z.unknown())),
  caption_draft: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  source_urls: z.array(z.string()).min(1),
  generation_mode: z
    .enum(["DETERMINISTIC", "AI_ASSISTED", "CURATOR_EDITED"])
    .default("DETERMINISTIC"),
});

const CrawlIngestPayloadSchema = z.object({
  run: z
    .object({
      run_id: z.string().uuid().optional(),
      stage: z
        .enum(["CRAWL", "EXTRACT", "VALIDATE", "PUBLISH", "EXPORT"])
        .default("CRAWL"),
      git_sha: z.string().min(1).default("ci-weekly"),
      started_at: z.string().optional(),
      finished_at: z.string().nullable().optional(),
      status: z.enum(["RUNNING", "OK", "PARTIAL", "FAILED"]).default("OK"),
      report: z.record(z.string(), z.unknown()).nullable().optional(),
    })
    .optional(),
  documents: z.array(DocumentIngestSchema).default([]),
  social_drafts: z.array(SocialDraftIngestSchema).default([]),
});

function verifyBearerSecret(req: NextRequest): { ok: boolean; status: number; msg?: string } {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      status: 500,
      msg: "REVALIDATE_SECRET non configurato sull'istanza server.",
    };
  }
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false, status: 401, msg: "Header Authorization Bearer mancante." };
  }
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 401, msg: "Token Bearer non valido." };
  }
  return { ok: true, status: 200 };
}

export async function POST(req: NextRequest) {
  const auth = verifyBearerSecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.msg }, { status: auth.status });
  }

  if (!hasLiveSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Supabase live o SUPABASE_SERVICE_ROLE_KEY non configurati sull'istanza server.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON non valido." }, { status: 400 });
  }

  const parsed = CrawlIngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Schema crawl-ingest non valido.",
        issues: parsed.error.issues.slice(0, 10),
      },
      { status: 400 }
    );
  }

  const { run, documents, social_drafts: socialDrafts } = parsed.data;
  const supabase = createAdminClient();

  let runId: string | null = run?.run_id ?? null;
  let docsUpserted = 0;
  let versionsUpserted = 0;
  let classificationsUpserted = 0;
  let ledgerRowsInserted = 0;
  let validationRowsInserted = 0;
  let creditRowsUpserted = 0;
  let socialDraftsInserted = 0;
  const warnings: string[] = [];

  try {
    // 1. Persiste o aggiorna raw.pipeline_run
    if (run) {
      if (run.run_id) {
        const { error: runUpdErr } = await supabase
          .schema("raw")
          .from("pipeline_run")
          .update({
            finished_at: run.finished_at ?? new Date().toISOString(),
            status: run.status,
            report: (run.report ?? null) as Json | null,
          })
          .eq("id", run.run_id);
        if (runUpdErr) warnings.push(`pipeline_run update: ${runUpdErr.message}`);
      } else {
        const { data: runRow, error: runInsErr } = await supabase
          .schema("raw")
          .from("pipeline_run")
          .insert({
            stage: run.stage,
            git_sha: run.git_sha,
            started_at: run.started_at || new Date().toISOString(),
            finished_at: run.finished_at ?? null,
            status: run.status,
            report: (run.report ?? null) as Json | null,
          })
          .select("id")
          .single();

        if (runInsErr) {
          warnings.push(`pipeline_run insert: ${runInsErr.message}`);
        } else if (runRow?.id) {
          runId = runRow.id;
        }
      }
    }

    // 2. Mappa ref.entity (kind = COMUNE) ust_code -> entity_id
    const entityByUst = new Map<number, string>();
    if (documents.length > 0) {
      const { data: entities } = await supabase
        .schema("ref")
        .from("entity")
        .select("id, ust_code, kind, is_default")
        .eq("kind", "COMUNE");
      for (const e of entities || []) {
        if (!entityByUst.has(e.ust_code) || e.is_default) {
          entityByUst.set(e.ust_code, e.id);
        }
      }
    }

    // 3. Upsert documenti, versioni, classificazioni, righe contabili, validazioni e crediti
    for (const doc of documents) {
      const { data: existingDoc } = await supabase
        .schema("raw")
        .from("document")
        .select("id, contains_personal_data")
        .eq("ust_code", doc.ust_code)
        .eq("origin_url", doc.origin_url)
        .maybeSingle();

      let documentId = existingDoc?.id;
      if (documentId) {
        const nextPrivacy =
          Boolean(existingDoc?.contains_personal_data) || doc.contains_personal_data;
        const { error: docUpdErr } = await supabase
          .schema("raw")
          .from("document")
          .update({
            title_raw: doc.title_raw ?? undefined,
            published_on: doc.published_on ?? undefined,
            contains_personal_data: nextPrivacy,
          })
          .eq("id", documentId);
        if (docUpdErr) {
          warnings.push(`document update (${doc.origin_url}): ${docUpdErr.message}`);
          continue;
        }
        docsUpserted += 1;
      } else {
        const { data: insertedDoc, error: docInsErr } = await supabase
          .schema("raw")
          .from("document")
          .insert({
            ust_code: doc.ust_code,
            origin_url: doc.origin_url,
            title_raw: doc.title_raw ?? null,
            published_on: doc.published_on ?? null,
            acquisition: doc.acquisition,
            contains_personal_data: doc.contains_personal_data,
          })
          .select("id")
          .single();

        if (docInsErr || !insertedDoc?.id) {
          warnings.push(
            `document insert (${doc.origin_url}): ${docInsErr?.message || "unknown"}`
          );
          continue;
        }
        documentId = insertedDoc.id;
        docsUpserted += 1;
      }

      if (!doc.version) continue;

      const { data: existingVer } = await supabase
        .schema("raw")
        .from("document_version")
        .select("id, status")
        .eq("sha256", doc.version.sha256)
        .maybeSingle();

      let versionId = existingVer?.id;
      const isHumanLocked =
        existingVer?.status === "APPROVED" || existingVer?.status === "PUBLISHED";
      const targetStatus = doc.version.status || "DOWNLOADED";

      if (versionId) {
        const { error: verUpdErr } = await supabase
          .schema("raw")
          .from("document_version")
          .update({
            storage_path: doc.version.storage_path,
            bytes: doc.version.bytes,
            pages: doc.version.pages ?? undefined,
            has_text_layer: doc.version.has_text_layer ?? undefined,
            ...(isHumanLocked ? {} : { status: targetStatus }),
          })
          .eq("id", versionId);
        if (verUpdErr) {
          warnings.push(`version update (${doc.version.sha256}): ${verUpdErr.message}`);
          continue;
        }
        versionsUpserted += 1;
      } else {
        const { data: insertedVer, error: verInsErr } = await supabase
          .schema("raw")
          .from("document_version")
          .insert({
            document_id: documentId,
            sha256: doc.version.sha256,
            storage_path: doc.version.storage_path,
            bytes: doc.version.bytes,
            mime: doc.version.mime || "application/pdf",
            pages: doc.version.pages ?? null,
            has_text_layer: doc.version.has_text_layer ?? null,
            status: targetStatus,
          })
          .select("id")
          .single();

        if (verInsErr || !insertedVer?.id) {
          warnings.push(
            `version insert (${doc.version.sha256}): ${verInsErr?.message || "unknown"}`
          );
          continue;
        }
        versionId = insertedVer.id;
        versionsUpserted += 1;
      }

      const entityId = entityByUst.get(doc.ust_code) ?? null;

      if (doc.classification && !isHumanLocked) {
        const { error: clsErr } = await supabase
          .schema("core")
          .from("classification")
          .upsert(
            {
              version_id: versionId,
              doc_type: doc.classification.doc_type,
              fiscal_year: doc.classification.fiscal_year ?? null,
              mm_number: doc.classification.mm_number ?? null,
              layout_family: doc.classification.layout_family ?? null,
              entity_id: entityId,
              method: doc.classification.method,
              confidence: doc.classification.confidence,
            },
            { onConflict: "version_id" }
          );
        if (clsErr) {
          warnings.push(`classification (${versionId}): ${clsErr.message}`);
        } else {
          classificationsUpserted += 1;
        }
      }

      if (doc.ledger_rows && doc.ledger_rows.length > 0 && entityId && !isHumanLocked) {
        await supabase
          .schema("core")
          .from("ledger_value")
          .delete()
          .eq("version_id", versionId);

        const rowsToInsert = doc.ledger_rows.map((r) => ({
          version_id: versionId,
          entity_id: entityId,
          statement: r.statement,
          view_kind: r.view_kind,
          function_code: r.function_code ?? null,
          account_code: r.account_code ?? null,
          detail_code: r.detail_code ?? null,
          label_raw: r.label_raw,
          column_role: r.column_role,
          ref_year: r.ref_year,
          value_kind: r.value_kind,
          side: r.side,
          amount_chf: r.amount_chf,
          amount_raw: r.amount_raw,
          page: r.page,
          bbox: r.bbox ?? null,
          method: r.method,
          parser_version: r.parser_version,
        }));

        const { error: ledErr } = await supabase
          .schema("core")
          .from("ledger_value")
          .insert(rowsToInsert);
        if (ledErr) {
          warnings.push(`ledger_value (${versionId}): ${ledErr.message}`);
        } else {
          ledgerRowsInserted += rowsToInsert.length;
        }
      }

      if (
        doc.validation_results &&
        doc.validation_results.length > 0 &&
        !isHumanLocked
      ) {
        await supabase
          .schema("core")
          .from("validation_result")
          .delete()
          .eq("version_id", versionId);

        const valRows = doc.validation_results.map((v) => ({
          version_id: versionId,
          rule_code: v.rule_code,
          severity: v.severity,
          passed: v.passed,
          expected: v.expected ?? null,
          actual: v.actual ?? null,
          delta: v.delta ?? null,
          message: v.message,
          run_id: runId,
        }));

        const { error: valErr } = await supabase
          .schema("core")
          .from("validation_result")
          .insert(valRows);
        if (valErr) {
          warnings.push(`validation_result (${versionId}): ${valErr.message}`);
        } else {
          validationRowsInserted += valRows.length;
        }
      }

      if (doc.credit_items && doc.credit_items.length > 0 && !isHumanLocked) {
        for (const cr of doc.credit_items) {
          const { data: existingCred } = await supabase
            .schema("core")
            .from("investment_credit")
            .select("id")
            .eq("ust_code", doc.ust_code)
            .eq("account_full", cr.account_code)
            .limit(1)
            .maybeSingle();

          let creditId = existingCred?.id;
          if (!creditId) {
            const { data: insertedCred } = await supabase
              .schema("core")
              .from("investment_credit")
              .insert({
                ust_code: doc.ust_code,
                entity_id: entityId,
                account_full: cr.account_code,
                mm_number: cr.mm_no ?? null,
                title: cr.description,
                amount_voted: cr.voted_credit,
              })
              .select("id")
              .maybeSingle();
            creditId = insertedCred?.id;
          }

          if (creditId) {
            const { error: snapErr } = await supabase
              .schema("core")
              .from("credit_snapshot")
              .upsert(
                {
                  version_id: versionId,
                  credit_id: creditId,
                  fiscal_year: cr.fiscal_year,
                  used_at_0101: cr.spent_prev,
                  spent_year: cr.spent_year,
                  spent_total: cr.spent_total,
                  amount_voted: cr.voted_credit,
                  residual: cr.remaining_credit,
                  page: cr.page,
                  method: "DETERMINISTIC",
                },
                { onConflict: "version_id,credit_id" }
              );
            if (!snapErr) creditRowsUpserted += 1;
          }
        }
      }
    }

    // 4. Upsert eventuali bozze social generate dalla pipeline
    if (socialDrafts.length > 0) {
      const insertDrafts = socialDrafts.map((d) => ({
        signal_code: d.signal_code,
        dedup_key: d.dedup_key,
        ust_code: d.ust_code ?? null,
        ref_year: d.ref_year,
        title: d.title,
        question_for_municipality: d.question_for_municipality,
        verified_payload: d.verified_payload as Json,
        slides_json: d.slides_json as Json,
        caption_draft: d.caption_draft,
        hashtags: d.hashtags,
        source_urls: d.source_urls,
        generation_mode: d.generation_mode,
        status: "DRAFT" as const,
      }));

      const { data: savedDrafts, error: sdErr } = await supabase
        .schema("core")
        .from("social_post_draft")
        .upsert(insertDrafts, {
          onConflict: "dedup_key",
          ignoreDuplicates: true,
        })
        .select("id");

      if (sdErr) {
        warnings.push(`social_post_draft: ${sdErr.message}`);
      } else {
        socialDraftsInserted = savedDrafts?.length ?? 0;
      }
    }

    revalidatePath("/admin/queue");
    revalidatePath("/admin/social");
    revalidateTag("mca2-data", "max");

    return NextResponse.json({
      ok: true,
      runId,
      docsUpserted,
      versionsUpserted,
      classificationsUpserted,
      ledgerRowsInserted,
      validationRowsInserted,
      creditRowsUpserted,
      socialDraftsInserted,
      warnings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore interno crawl-ingest";
    return NextResponse.json({ ok: false, error: message, warnings }, { status: 500 });
  }
}
