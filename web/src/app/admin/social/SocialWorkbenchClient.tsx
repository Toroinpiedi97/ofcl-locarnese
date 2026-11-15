"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Download,
  ExternalLink,
  Camera,
  RefreshCw,
  Save,
  Sparkles,
  Archive,
  Send,
  ShieldAlert,
} from "lucide-react";
import {
  SIGNAL_META,
  type SocialDraftDto,
  type SocialDraftStatus,
  type SocialSignalCode,
} from "@/lib/social-insights";
import {
  generateSocialDraftsAction,
  polishSocialDraftAiAction,
  saveSocialDraftAction,
  updateSocialDraftStatusAction,
} from "./actions";
import {
  InstagramSlidePreview,
  exportSlideSvgToPng,
} from "./InstagramSlidePreview";

interface SocialWorkbenchClientProps {
  initialDrafts: SocialDraftDto[];
  initialSource: "SUPABASE" | "DETERMINISTIC_FALLBACK";
}

const STATUS_BADGES: Record<
  SocialDraftStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Bozza",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  },
  APPROVED: {
    label: "Approvata",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  },
  PUBLISHED: {
    label: "Pubblicata IG",
    className: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  },
  ARCHIVED: {
    label: "Archiviata",
    className: "bg-slate-700/50 text-slate-400 border-slate-600",
  },
};

export function SocialWorkbenchClient({
  initialDrafts,
  initialSource,
}: SocialWorkbenchClientProps) {
  const [drafts, setDrafts] = useState<SocialDraftDto[]>(initialDrafts);
  const [selectedId, setSelectedId] = useState<string>(
    initialDrafts[0]?.id ?? ""
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | SocialDraftStatus>("ALL");
  const [signalFilter, setSignalFilter] = useState<"ALL" | SocialSignalCode>("ALL");
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    kind: "ok" | "warn" | "error";
    text: string;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (signalFilter !== "ALL" && d.signal_code !== signalFilter) return false;
      return true;
    });
  }, [drafts, statusFilter, signalFilter]);

  const activeDraft = useMemo(() => {
    return (
      filteredDrafts.find((d) => d.id === selectedId) ??
      filteredDrafts[0] ??
      null
    );
  }, [filteredDrafts, selectedId]);

  const currentSlide = activeDraft?.slides_json[activeSlideIdx] ?? activeDraft?.slides_json[0];

  const countsByStatus = useMemo(() => {
    return {
      DRAFT: drafts.filter((d) => d.status === "DRAFT").length,
      APPROVED: drafts.filter((d) => d.status === "APPROVED").length,
      PUBLISHED: drafts.filter((d) => d.status === "PUBLISHED").length,
    };
  }, [drafts]);

  function updateActiveDraftLocal(patch: Partial<SocialDraftDto>) {
    if (!activeDraft) return;
    setDrafts((prev) =>
      prev.map((d) => (d.id === activeDraft.id ? { ...d, ...patch } : d))
    );
  }

  function updateActiveSlideLocal(
    slideIndex: number,
    patch: Partial<SocialDraftDto["slides_json"][number]>
  ) {
    if (!activeDraft) return;
    const nextSlides = activeDraft.slides_json.map((s, idx) =>
      idx === slideIndex ? { ...s, ...patch } : s
    );
    updateActiveDraftLocal({
      slides_json: nextSlides,
      generation_mode: "CURATOR_EDITED",
    });
  }

  async function handleGenerateFromData() {
    setIsGenerating(true);
    setFeedbackBanner(null);
    try {
      const res = await generateSocialDraftsAction();
      if (res.success && res.drafts.length > 0) {
        setDrafts(res.drafts);
        setSelectedId(res.drafts[0].id);
        setActiveSlideIdx(0);
        setFeedbackBanner({ kind: "ok", text: res.message });
      } else {
        setFeedbackBanner({ kind: "error", text: res.message });
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAiPolish() {
    if (!activeDraft) return;
    setIsPolishing(true);
    setFeedbackBanner(null);
    try {
      const res = await polishSocialDraftAiAction({
        title: activeDraft.title,
        question_for_municipality: activeDraft.question_for_municipality,
        caption_draft: activeDraft.caption_draft,
        verified_payload: activeDraft.verified_payload,
        slides_json: activeDraft.slides_json,
      });

      if (res.success) {
        updateActiveDraftLocal({
          title: res.title,
          question_for_municipality: res.question_for_municipality,
          caption_draft: res.caption_draft,
          slides_json: res.slides_json,
          generation_mode: res.generation_mode,
        });
        setFeedbackBanner({
          kind: res.usedLlm ? "ok" : "warn",
          text: res.message,
        });
      } else {
        setFeedbackBanner({ kind: "warn", text: res.message });
      }
    } finally {
      setIsPolishing(false);
    }
  }

  async function handleSaveDraft() {
    if (!activeDraft) return;
    setIsSaving(true);
    setFeedbackBanner(null);
    try {
      const res = await saveSocialDraftAction({
        id: activeDraft.id,
        title: activeDraft.title,
        question_for_municipality: activeDraft.question_for_municipality,
        slides_json: activeDraft.slides_json,
        caption_draft: activeDraft.caption_draft,
        hashtags: activeDraft.hashtags,
        generation_mode: activeDraft.generation_mode,
        review_note: activeDraft.review_note ?? null,
      });

      if (res.success && res.caption_draft) {
        updateActiveDraftLocal({ caption_draft: res.caption_draft });
        setFeedbackBanner({ kind: "ok", text: res.message });
      } else {
        setFeedbackBanner({
          kind: res.success ? "ok" : "error",
          text: res.message,
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusTransition(nextStatus: SocialDraftStatus) {
    if (!activeDraft) return;
    const res = await updateSocialDraftStatusAction(
      activeDraft.id,
      nextStatus,
      activeDraft.review_note ?? undefined
    );
    if (res.success) {
      updateActiveDraftLocal({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
      });
      setFeedbackBanner({ kind: "ok", text: res.message });
    } else {
      setFeedbackBanner({ kind: "error", text: res.message });
    }
  }

  async function handleCopyCaption() {
    if (!activeDraft) return;
    const fullText = [
      activeDraft.caption_draft.trim(),
      "",
      activeDraft.hashtags.join(" "),
    ]
      .join("\n")
      .trim();

    await navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  }

  async function handleDownloadCurrentSlidePng() {
    if (!svgRef.current || !activeDraft || !currentSlide) return;
    const slug = activeDraft.municipality_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `ofcl-${activeDraft.signal_code.slice(0, 3).toLowerCase()}-${slug}-slide-${currentSlide.slide_no}.png`;
    await exportSlideSvgToPng(svgRef.current, filename);
    setFeedbackBanner({
      kind: "ok",
      text: `Slide ${currentSlide.slide_no} esportata in PNG 1080×1350 (${filename}).`,
    });
  }

  const hasArt192Disclaimer = Boolean(
    activeDraft?.caption_draft.includes("192 LOC")
  );
  const fullCaptionLength =
    (activeDraft?.caption_draft.length ?? 0) +
    1 +
    (activeDraft?.hashtags.join(" ").length ?? 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-5">
      {/* Header Console Social */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Studio Post Instagram &amp; Spunti Civici
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Rilevatore deterministico S05–S10 (precisione{" "}
                <span className="font-mono text-slate-300">0.01 CHF</span>) ·
                Fonte:{" "}
                <span className="font-mono text-cyan-300">
                  {initialSource === "SUPABASE"
                    ? "core.social_post_draft (Live)"
                    : "Motore Deterministico Certificato"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-amber-300">Bozze: {countsByStatus.DRAFT}</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-300">
              Approvate: {countsByStatus.APPROVED}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300">
              Pubblicate: {countsByStatus.PUBLISHED}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerateFromData}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
            <span>Genera Spunti dai Dati</span>
          </button>
        </div>
      </div>

      {/* Barra Filtri */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["ALL", "Tutti i segnali"],
              ["S05_CREDIT_OVERRUN", "S05 Sorpassi"],
              ["S06_TARIFF_GAP", "S06 Tariffe"],
              ["S07_TAX_MULTIPLIER", "S07 Moltiplicatori"],
              ["S08_PEER_COST_OUTLIER", "S08 Pro Capite"],
              ["S09_BUDGET_DIVERGENCE", "S09 Prev/Cons"],
              ["S10_FUN_FACT", "S10 Fun Fact"],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setSignalFilter(code);
                setActiveSlideIdx(0);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                signalFilter === code
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(
            [
              ["ALL", "Tutti"],
              ["DRAFT", "Bozze"],
              ["APPROVED", "Approvate"],
              ["PUBLISHED", "Pubblicate"],
              ["ARCHIVED", "Archiviate"],
            ] as const
          ).map(([st, label]) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
            feedbackBanner.kind === "ok"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
              : feedbackBanner.kind === "warn"
                ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                : "bg-red-950/60 border-red-500/40 text-red-200"
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-white ml-4 cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      )}

      {/* Main Split-View: Queue + Carousel Preview + Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Colonna 1: Coda Candidati (3 cols) */}
        <aside className="xl:col-span-3 flex flex-col gap-2.5 max-h-[780px] overflow-y-auto pr-1">
          {filteredDrafts.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              Nessuno spunto corrisponde ai filtri attivi.
            </div>
          ) : (
            filteredDrafts.map((item) => {
              const sig = SIGNAL_META[item.signal_code];
              const stBadge = STATUS_BADGES[item.status];
              const isSelected = activeDraft?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setActiveSlideIdx(0);
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${sig.badgeBg} ${sig.badgeText}`}
                    >
                      {sig.shortCode} · {sig.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-medium ${stBadge.className}`}
                    >
                      {stBadge.label}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{item.municipality_name}</span>
                    <span>{item.ref_year}</span>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        {/* Colonna 2 + 3: Workbench Curatore */}
        {activeDraft && currentSlide ? (
          <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Anteprima 4:5 + Payload Certificato (5 cols) */}
            <section className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    Anteprima Carosello 4:5 (1080×1350)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIdx((i) => Math.max(0, i - 1))
                      }
                      disabled={activeSlideIdx === 0}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                      aria-label="Slide precedente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-cyan-300 px-1.5">
                      {activeSlideIdx + 1} / {activeDraft.slides_json.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIdx((i) =>
                          Math.min(activeDraft.slides_json.length - 1, i + 1)
                        )
                      }
                      disabled={
                        activeSlideIdx >= activeDraft.slides_json.length - 1
                      }
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                      aria-label="Slide successiva"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs rapide delle 4 slide */}
                <div className="grid grid-cols-4 gap-1.5">
                  {activeDraft.slides_json.map((s, idx) => (
                    <button
                      key={s.slide_no}
                      type="button"
                      onClick={() => setActiveSlideIdx(idx)}
                      className={`py-1 px-2 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        activeSlideIdx === idx
                          ? "bg-cyan-600 text-white font-semibold"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {s.slide_no}. {s.kind === "DATA_COMPARE" ? "DATI" : s.kind}
                    </button>
                  ))}
                </div>

                <InstagramSlidePreview
                  svgRef={svgRef}
                  slide={currentSlide}
                  totalSlides={activeDraft.slides_json.length}
                  signalCode={activeDraft.signal_code}
                  municipalityName={activeDraft.municipality_name}
                  refYear={activeDraft.ref_year}
                  ustCode={activeDraft.ust_code}
                />

                <button
                  type="button"
                  onClick={handleDownloadCurrentSlidePng}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>
                    Scarica Slide {currentSlide.slide_no} PNG (1080×1350)
                  </span>
                </button>
              </div>

              {/* Dati Certificati & Fonti Verificabili */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Payload Deterministico &amp; Fonti Ufficiali
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(activeDraft.verified_payload).map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {k}
                      </div>
                      <div className="text-xs font-mono text-slate-200 font-semibold truncate">
                        {v === null || v === undefined ? "n.d." : String(v)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1 flex flex-col gap-1">
                  {activeDraft.source_urls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            {/* Editor Curatore (7 cols) */}
            <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded border text-xs font-medium ${STATUS_BADGES[activeDraft.status].className}`}
                  >
                    {STATUS_BADGES[activeDraft.status].label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Modalità: {activeDraft.generation_mode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAiPolish}
                  disabled={isPolishing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isPolishing
                      ? "Rifinitura in corso..."
                      : "Rifinisci Testo (AI / Editoriale)"}
                  </span>
                </button>
              </div>

              {/* Titolo interno */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-300">
                  Titolo spunto
                </span>
                <input
                  type="text"
                  value={activeDraft.title}
                  onChange={(e) =>
                    updateActiveDraftLocal({
                      title: e.target.value,
                      generation_mode: "CURATOR_EDITED",
                    })
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </label>

              {/* Domanda aperta al Comune */}
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-amber-300">
                  Domanda civica che vorremmo il Comune spiegasse
                </span>
                <textarea
                  rows={2}
                  value={activeDraft.question_for_municipality}
                  onChange={(e) =>
                    updateActiveDraftLocal({
                      question_for_municipality: e.target.value,
                      generation_mode: "CURATOR_EDITED",
                    })
                  }
                  className="w-full rounded-lg bg-slate-950 border border-amber-500/40 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </label>

              {/* Modifica Slide Attiva */}
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 flex flex-col gap-3">
                <div className="text-xs font-mono text-cyan-300 font-semibold">
                  Testo Slide {currentSlide.slide_no} ({currentSlide.kind}) — aggiornamento anteprima in tempo reale
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">
                      Titolo slide
                    </span>
                    <input
                      type="text"
                      value={currentSlide.headline}
                      onChange={(e) =>
                        updateActiveSlideLocal(activeSlideIdx, {
                          headline: e.target.value,
                        })
                      }
                      className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">
                      Cifra principale (es. 0.01 CHF)
                    </span>
                    <input
                      type="text"
                      value={currentSlide.stat_value}
                      onChange={(e) =>
                        updateActiveSlideLocal(activeSlideIdx, {
                          stat_value: e.target.value,
                        })
                      }
                      className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">
                    Unità / Sottotitolo cifra
                  </span>
                  <input
                    type="text"
                    value={currentSlide.stat_unit}
                    onChange={(e) =>
                      updateActiveSlideLocal(activeSlideIdx, {
                        stat_unit: e.target.value,
                      })
                    }
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-400">
                    Testo esplicativo slide
                  </span>
                  <textarea
                    rows={2}
                    value={currentSlide.body}
                    onChange={(e) =>
                      updateActiveSlideLocal(activeSlideIdx, {
                        body: e.target.value,
                      })
                    }
                    className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </label>
              </div>

              {/* Caption Instagram */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Caption Instagram pronta per copia/incolla
                  </span>
                  <span
                    className={`text-[11px] font-mono ${
                      fullCaptionLength > 2200
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {fullCaptionLength} / 2&apos;200 caratteri
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={activeDraft.caption_draft}
                  onChange={(e) =>
                    updateActiveDraftLocal({
                      caption_draft: e.target.value,
                      generation_mode: "CURATOR_EDITED",
                    })
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs leading-relaxed text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                />
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  {hasArt192Disclaimer ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Disclaimer ex art. 192 LOC presente
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Verrà aggiunto automaticamente il disclaimer art. 192 LOC al salvataggio
                    </span>
                  )}
                  <span className="text-slate-400 font-mono truncate">
                    {activeDraft.hashtags.join(" ")}
                  </span>
                </div>
              </div>

              {/* Nota interna curatore */}
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">
                  Nota di revisione interna (audit log)
                </span>
                <input
                  type="text"
                  placeholder="Es. Verificato su Allegato f p. 126, pronto per pubblicazione."
                  value={activeDraft.review_note ?? ""}
                  onChange={(e) =>
                    updateActiveDraftLocal({ review_note: e.target.value })
                  }
                  className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </label>

              {/* Azioni Curatore */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Salva Modifiche</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedCaption ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span>
                      {copiedCaption ? "Copiato!" : "Copia Caption + Hashtag"}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusTransition("ARCHIVED")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archivia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusTransition("APPROVED")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approva Bozza</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusTransition("PUBLISHED")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Segna Pubblicato</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="xl:col-span-9 p-10 rounded-xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
            Seleziona una bozza dalla coda o clicca &quot;Genera Spunti dai Dati&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
