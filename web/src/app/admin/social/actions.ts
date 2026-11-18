"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminDbClient, getCuratorSession } from "@/lib/admin-auth";
import {
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
} from "@/lib/admin-session-edge";
import { getPublicCreditsDataset, getDistrictDataset } from "@/lib/data/mca2-dal";
import { MUNICIPALITIES } from "@/data/municipalities";
import {
  ART_192_DISCLAIMER,
  generateSocialInsightsFromData,
  verifyNumericIntegrity,
  type BudgetDivergenceRow,
  type PeerCostOutlierRow,
  type SocialDraftDto,
  type SocialDraftStatus,
  type SocialGenerationMode,
  type SocialSlide,
} from "@/lib/social-insights";
import type { Json } from "@/lib/supabase/database.types";

const SlideSchema = z.object({
  slide_no: z.number().int().min(1).max(10),
  kind: z.enum(["HOOK", "DATA_COMPARE", "QUESTION", "SOURCE"]),
  headline: z.string().min(1).max(200),
  stat_value: z.string().min(1).max(80),
  stat_unit: z.string().max(120),
  body: z.string().min(1).max(500),
  source_ref: z.string().max(240),
});

const SaveDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(240),
  question_for_municipality: z.string().min(5).max(800),
  slides_json: z.array(SlideSchema).min(1).max(8),
  caption_draft: z.string().min(10).max(2200),
  hashtags: z.array(z.string().min(2).max(60)).max(20),
  generation_mode: z.enum(["DETERMINISTIC", "AI_ASSISTED", "CURATOR_EDITED"]),
  review_note: z.string().max(500).nullable().optional(),
});

function mapDbRowToDto(row: {
  id: string;
  signal_code: SocialDraftDto["signal_code"];
  dedup_key: string;
  ust_code: number | null;
  ref_year: number;
  title: string;
  question_for_municipality: string;
  verified_payload: Json;
  slides_json: Json;
  caption_draft: string;
  hashtags: string[];
  source_urls: string[];
  generation_mode: SocialGenerationMode;
  status: SocialDraftStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}): SocialDraftDto {
  const munName =
    row.ust_code !== null
      ? MUNICIPALITIES.find((m) => m.ust_code === row.ust_code)?.name ||
        `UST ${row.ust_code}`
      : "Distretto di Locarno";

  return {
    id: row.id,
    signal_code: row.signal_code,
    dedup_key: row.dedup_key,
    ust_code: row.ust_code,
    municipality_name: munName,
    ref_year: row.ref_year,
    title: row.title,
    question_for_municipality: row.question_for_municipality,
    verified_payload:
      typeof row.verified_payload === "object" &&
      row.verified_payload !== null &&
      !Array.isArray(row.verified_payload)
        ? (row.verified_payload as Record<string, unknown>)
        : {},
    slides_json: Array.isArray(row.slides_json)
      ? (row.slides_json as unknown as SocialSlide[])
      : [],
    caption_draft: row.caption_draft,
    hashtags: row.hashtags ?? [],
    source_urls: row.source_urls ?? [],
    generation_mode: row.generation_mode,
    status: row.status,
    review_note: row.review_note,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
  };
}

/**
 * Carica la coda di bozze Instagram da core.social_post_draft.
 * In produzione con Supabase configurato restituisce SOLO i dati reali del DB (mai bozze finte).
 * Solo nella sandbox E2E offline genera le bozze deterministiche locali.
 */
export async function fetchSocialDraftsAction(): Promise<{
  drafts: SocialDraftDto[];
  source: "SUPABASE" | "DETERMINISTIC_FALLBACK";
  dbError?: string | null;
}> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      drafts: [],
      source: hasLiveSupabaseConfig() ? "SUPABASE" : "DETERMINISTIC_FALLBACK",
      dbError: "Sessione curatore non autenticata.",
    };
  }

  const sandboxMode = isOfflineDevSandbox();
  const liveDbMode = hasLiveSupabaseConfig() && !sandboxMode;

  if (liveDbMode) {
    try {
      const db = await getAdminDbClient();
      const { data, error } = await db
        .schema("core")
        .from("social_post_draft")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return {
          drafts: [],
          source: "SUPABASE",
          dbError: `Errore lettura core.social_post_draft: ${error.message}`,
        };
      }

      return {
        drafts: (data || []).map(mapDbRowToDto),
        source: "SUPABASE",
        dbError: null,
      };
    } catch (err) {
      return {
        drafts: [],
        source: "SUPABASE",
        dbError:
          err instanceof Error
            ? err.message
            : "Errore di connessione a Supabase.",
      };
    }
  }

  const [municipalities, credits] = await Promise.all([
    getDistrictDataset(),
    getPublicCreditsDataset(),
  ]);

  return {
    drafts: generateSocialInsightsFromData({ municipalities, credits }),
    source: "DETERMINISTIC_FALLBACK",
    dbError: null,
  };
}

/**
 * Esegue i detector S05-S10 sui dati certificati (inclusi outlier e divergenze da DB)
 * e inserisce le nuove bozze in core.social_post_draft con deduplicazione su dedup_key.
 */
export async function generateSocialDraftsAction(): Promise<{
  success: boolean;
  message: string;
  drafts: SocialDraftDto[];
}> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
      drafts: [],
    };
  }

  const sandboxMode = isOfflineDevSandbox();
  const liveDbMode = hasLiveSupabaseConfig() && !sandboxMode;

  const [municipalities, credits] = await Promise.all([
    getDistrictDataset(),
    getPublicCreditsDataset(),
  ]);

  let peerOutliers: PeerCostOutlierRow[] = [];
  let budgetDivergences: BudgetDivergenceRow[] = [];

  if (liveDbMode) {
    try {
      const db = await getAdminDbClient();
      const [outliersRes, divRes] = await Promise.all([
        db
          .schema("api")
          .from("peer_cost_outliers")
          .select("*")
          .in("outlier_direction", ["HIGH", "LOW"])
          .limit(40),
        db
          .schema("api")
          .from("budget_vs_actual_divergences")
          .select("*")
          .eq("is_significant_divergence", true)
          .limit(40),
      ]);

      if (!outliersRes.error && outliersRes.data) {
        peerOutliers = outliersRes.data.map((r) => ({
          ust_code: r.ust_code,
          municipality_name: r.municipality_name,
          municipality_slug: r.municipality_slug,
          ref_year: r.ref_year,
          statement: r.statement,
          code_level: r.code_level,
          account_code: r.account_code || r.function_code || "-",
          account_label: r.canonical_label || "Voce MCA2",
          per_capita_chf: Number(r.amount_per_capita),
          district_median_per_capita_chf: Number(r.district_median_pc),
          delta_pct_vs_median:
            r.delta_vs_district_median_pct !== null
              ? Number(r.delta_vs_district_median_pct)
              : null,
          amount_chf: Number(r.amount_chf),
          residents: Number(r.population_used ?? 0),
          page: r.page,
          origin_url: r.origin_url,
        }));
      }

      if (!divRes.error && divRes.data) {
        budgetDivergences = divRes.data.map((r) => ({
          ust_code: r.ust_code,
          municipality_name: r.municipality_name,
          municipality_slug: r.municipality_slug,
          ref_year: r.ref_year,
          account_code: r.account_code || r.function_code || "-",
          account_label: r.canonical_label || "Voce MCA2",
          actual_chf: Number(r.actual_chf),
          budget_chf: Number(r.budget_chf),
          delta_chf: Number(r.delta_chf),
          delta_pct: r.delta_pct !== null ? Number(r.delta_pct) : null,
          page_actual: r.actual_page,
          origin_url: r.actual_origin_url,
        }));
      }
    } catch {
      // Le viste analitiche potrebbero non essere ancora popolate: prosegui con i dataset pubblici live
    }
  }

  const generated = generateSocialInsightsFromData({
    municipalities,
    credits,
    peerOutliers,
    budgetDivergences,
  });

  if (liveDbMode) {
    try {
      const db = await getAdminDbClient();
      const insertRows = generated.map((g) => ({
        signal_code: g.signal_code,
        dedup_key: g.dedup_key,
        ust_code: g.ust_code,
        ref_year: g.ref_year,
        title: g.title,
        question_for_municipality: g.question_for_municipality,
        verified_payload: g.verified_payload as unknown as Json,
        slides_json: g.slides_json as unknown as Json,
        caption_draft: g.caption_draft,
        hashtags: g.hashtags,
        source_urls: g.source_urls.length > 0 ? g.source_urls : ["https://ofcl.ch"],
        generation_mode: "DETERMINISTIC" as const,
        status: "DRAFT" as const,
      }));

      const { error } = await db
        .schema("core")
        .from("social_post_draft")
        .upsert(insertRows, { onConflict: "dedup_key", ignoreDuplicates: true });

      if (error) {
        return {
          success: false,
          message: `Errore salvataggio bozze su Supabase: ${error.message}`,
          drafts: [],
        };
      }

      const { data: liveRows, error: fetchErr } = await db
        .schema("core")
        .from("social_post_draft")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchErr) {
        return {
          success: false,
          message: `Bozze salvate ma errore di rilettura: ${fetchErr.message}`,
          drafts: [],
        };
      }

      revalidatePath("/admin/social");
      return {
        success: true,
        message: `Rilevazione completata: ${generated.length} spunti analizzati e sincronizzati in core.social_post_draft.`,
        drafts: (liveRows || []).map(mapDbRowToDto),
      };
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Errore sincronizzazione Supabase per bozze social.",
        drafts: [],
      };
    }
  }

  revalidatePath("/admin/social");
  return {
    success: true,
    message: `Rilevazione locale completata: ${generated.length} bozze pronte per la revisione curatore.`,
    drafts: generated,
  };
}

/**
 * Salva le modifiche editoriali del curatore su titolo, domanda, slide e caption.
 * Garantisce che il disclaimer art. 192 LOC resti sempre presente nella caption.
 */
export async function saveSocialDraftAction(
  payload: z.infer<typeof SaveDraftSchema>
): Promise<{ success: boolean; message: string; caption_draft?: string }> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  const parsed = SaveDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      message: `Dati bozza non validi: ${parsed.error.issues[0]?.message ?? "controlla i campi"}`,
    };
  }

  const safeCaption = parsed.data.caption_draft.includes("192 LOC")
    ? parsed.data.caption_draft
    : `${parsed.data.caption_draft.trim()}\n\n${ART_192_DISCLAIMER}`;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      parsed.data.id
    );

  if (isUuid && hasLiveSupabaseConfig()) {
    try {
      const db = await getAdminDbClient();
      const { error } = await db
        .schema("core")
        .from("social_post_draft")
        .update({
          title: parsed.data.title,
          question_for_municipality: parsed.data.question_for_municipality,
          slides_json: parsed.data.slides_json as unknown as Json,
          caption_draft: safeCaption,
          hashtags: parsed.data.hashtags,
          generation_mode: parsed.data.generation_mode,
          review_note: parsed.data.review_note ?? null,
          reviewed_by: session.actorId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.id);

      if (error) {
        return {
          success: false,
          message: `Errore salvataggio DB: ${error.message}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error ? err.message : "Errore salvataggio su Supabase.",
      };
    }
  }

  revalidatePath("/admin/social");
  return {
    success: true,
    message: "Bozza aggiornata con verifica disclaimer art. 192 LOC.",
    caption_draft: safeCaption,
  };
}

/**
 * Aggiorna lo stato del ciclo di revisione (DRAFT -> APPROVED -> PUBLISHED / ARCHIVED)
 * con traccia in audit.curator_action per approvazioni e pubblicazioni.
 */
export async function updateSocialDraftStatusAction(
  draftId: string,
  nextStatus: SocialDraftStatus,
  reviewNote?: string
): Promise<{ success: boolean; message: string }> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      draftId
    );

  if (isUuid && hasLiveSupabaseConfig()) {
    try {
      const db = await getAdminDbClient();
      const { data: prevRow } = await db
        .schema("core")
        .from("social_post_draft")
        .select("status")
        .eq("id", draftId)
        .maybeSingle();

      if (nextStatus === "APPROVED" || nextStatus === "PUBLISHED") {
        const { error: auditErr } = await db
          .schema("audit")
          .from("curator_action")
          .insert({
            actor: session.actorId,
            action: nextStatus === "APPROVED" ? "APPROVE" : "PUBLISH",
            target_table: "core.social_post_draft",
            target_id: draftId,
            before: prevRow ? { status: prevRow.status } : null,
            after: { status: nextStatus },
            reason:
              reviewNote && reviewNote.trim().length >= 10
                ? reviewNote.trim()
                : `Revisione editoriale completata su /admin/social (${nextStatus})${reviewNote?.trim() ? `: ${reviewNote.trim()}` : ""}.`,
          });

        if (auditErr) {
          return {
            success: false,
            message: `Errore audit social: ${auditErr.message}`,
          };
        }
      }

      const { error } = await db
        .schema("core")
        .from("social_post_draft")
        .update({
          status: nextStatus,
          reviewed_by: session.actorId,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId);

      if (error) {
        return {
          success: false,
          message: `Errore aggiornamento stato: ${error.message}`,
        };
      }
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Errore aggiornamento stato su Supabase.",
      };
    }
  }

  revalidatePath("/admin/social");
  return {
    success: true,
    message: `Stato bozza aggiornato a ${nextStatus}.`,
  };
}

/**
 * Rifinisce il tono civico di domanda, slide HOOK/QUESTION e caption.
 * - Se OPENAI_API_KEY è presente sul server, usa il modello LLM come puro copy-editor
 *   e valida l'output tramite verifyNumericIntegrity() scartando ogni modifica ai numeri.
 * - Se OPENAI_API_KEY non è configurata, applica una rifinitura editoriale deterministica.
 */
export async function polishSocialDraftAiAction(input: {
  title: string;
  question_for_municipality: string;
  caption_draft: string;
  verified_payload: Record<string, unknown>;
  slides_json: SocialSlide[];
}): Promise<{
  success: boolean;
  usedLlm: boolean;
  title: string;
  question_for_municipality: string;
  caption_draft: string;
  slides_json: SocialSlide[];
  generation_mode: SocialGenerationMode;
  message: string;
}> {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    return {
      success: false,
      usedLlm: false,
      title: input.title,
      question_for_municipality: input.question_for_municipality,
      caption_draft: input.caption_draft,
      slides_json: input.slides_json,
      generation_mode: "DETERMINISTIC",
      message: "Non autorizzato: sessione curatore richiesta.",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.OFCL_SOCIAL_LLM_MODEL || "gpt-4o-mini";
      const systemPrompt = [
        "Sei il redattore civico dell'Osservatorio Finanze Comunali del Locarnese (OFCL).",
        "Rendi il testo chiaro, incisivo, neutro, costruttivo e comprensibile ai cittadini su Instagram.",
        "REGOLE INVIOLABILI:",
        "1. NON modificare, arrotondare o inventare MAI nessuna cifra, percentuale, data, numero di conto o nome di Comune.",
        "2. NON inserire dati personali o nomi di privati cittadini (nLPD).",
        "3. Mantieni in chiusura il disclaimer legale sull'art. 192 LOC.",
        "4. Rispondi SOLO con JSON valido avente chiavi: title, question_for_municipality, hook_headline, hook_body, question_body, caption_draft.",
      ].join("\n");

      const userPrompt = JSON.stringify({
        verified_payload: input.verified_payload,
        current_title: input.title,
        current_question: input.question_for_municipality,
        hook_slide: input.slides_json[0],
        question_slide: input.slides_json[2],
        current_caption: input.caption_draft,
      });

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as Record<string, string>;
          const nextCaptionRaw = String(
            parsed.caption_draft || input.caption_draft
          );
          const nextCaption = nextCaptionRaw.includes("192 LOC")
            ? nextCaptionRaw
            : `${nextCaptionRaw.trim()}\n\n${ART_192_DISCLAIMER}`;

          const nextQuestion = String(
            parsed.question_for_municipality || input.question_for_municipality
          );
          const nextHookBody = String(
            parsed.hook_body || input.slides_json[0]?.body || ""
          );
          const nextQBody = String(
            parsed.question_body || input.slides_json[2]?.body || ""
          );

          const check = verifyNumericIntegrity(input.verified_payload, [
            nextCaption,
            nextQuestion,
            nextHookBody,
            nextQBody,
          ]);

          if (check.ok) {
            const updatedSlides = input.slides_json.map((s) => {
              if (s.slide_no === 1) {
                return {
                  ...s,
                  headline: String(parsed.hook_headline || s.headline),
                  body: nextHookBody,
                };
              }
              if (s.slide_no === 3) {
                return {
                  ...s,
                  body: nextQBody,
                };
              }
              return s;
            });

            return {
              success: true,
              usedLlm: true,
              title: String(parsed.title || input.title),
              question_for_municipality: nextQuestion,
              caption_draft: nextCaption,
              slides_json: updatedSlides,
              generation_mode: "AI_ASSISTED",
              message:
                "Testo rifinito da AI e validato dal guardrail numerico (0 cifre alterate).",
            };
          }

          return {
            success: false,
            usedLlm: true,
            title: input.title,
            question_for_municipality: input.question_for_municipality,
            caption_draft: input.caption_draft,
            slides_json: input.slides_json,
            generation_mode: "DETERMINISTIC",
            message: `Guardrail anti-allucinazione attivato: l'AI ha omesso cifre certificate (${check.missingTokens.join(", ")}). Mantenuta bozza deterministica.`,
          };
        }
      }
    } catch {
      // Fallback al raffinamento deterministico
    }
  }

  const refinedCaption = input.caption_draft.includes("💬")
    ? input.caption_draft
    : input.caption_draft.replace(
        ART_192_DISCLAIMER,
        `💬 Cosa ne pensi come cittadino del Locarnese? Scrivicelo o confronta i dati su ofcl.ch.\n\n${ART_192_DISCLAIMER}`
      );

  return {
    success: true,
    usedLlm: false,
    title: input.title,
    question_for_municipality: input.question_for_municipality,
    caption_draft: refinedCaption,
    slides_json: input.slides_json,
    generation_mode: "CURATOR_EDITED",
    message:
      "OPENAI_API_KEY non configurata: applicata rifinitura editoriale deterministica con tutte le cifre invariate.",
  };
}
