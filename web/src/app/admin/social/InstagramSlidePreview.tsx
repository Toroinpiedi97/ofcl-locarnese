"use client";

import React from "react";
import {
  SIGNAL_META,
  type SocialSignalCode,
  type SocialSlide,
} from "@/lib/social-insights";

interface InstagramSlidePreviewProps {
  slide: SocialSlide;
  totalSlides: number;
  signalCode: SocialSignalCode;
  municipalityName: string;
  refYear: number;
  ustCode?: number | null;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

function wrapText(
  text: string,
  maxChars: number,
  maxLines: number
): string[] {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars - 1) + "…" : word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1];
    if (!last.endsWith("…")) {
      lines[maxLines - 1] = last.slice(0, Math.max(1, maxChars - 1)) + "…";
    }
  }
  return lines;
}

const SLIDE_KIND_LABEL: Record<SocialSlide["kind"], string> = {
  HOOK: "EVIDENZA",
  DATA_COMPARE: "CONFRONTO DATI",
  QUESTION: "DOMANDA CIVICA",
  SOURCE: "FONTE UFFICIALE",
};

/**
 * Esporta l'elemento SVG (viewBox 1080x1350) in un file PNG 1080x1350 (formato 4:5 Instagram).
 */
export async function exportSlideSvgToPng(
  svgEl: SVGSVGElement,
  filename: string
): Promise<void> {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgEl);
  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.width = 1080;
    img.height = 1350;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossibile rasterizzare SVG in PNG."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Contesto Canvas 2D non disponibile.");

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.drawImage(img, 0, 0, 1080, 1350);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 1.0)
    );
    if (!pngBlob) throw new Error("Generazione PNG fallita.");

    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function InstagramSlidePreview({
  slide,
  totalSlides,
  signalCode,
  municipalityName,
  refYear,
  ustCode,
  svgRef,
}: InstagramSlidePreviewProps) {
  const meta = SIGNAL_META[signalCode];
  const accent = meta.accentHex;
  const isQuestion = slide.kind === "QUESTION";
  const isSource = slide.kind === "SOURCE";

  const headlineLines = wrapText(slide.headline, 26, 3);
  const statUnitLines = wrapText(slide.stat_unit, 38, 2);
  const bodyLines = wrapText(slide.body, 36, 5);
  const sourceLines = wrapText(slide.source_ref, 48, 2);

  // Dimensiona dinamicamente il valore stat per evitare tagli su stringhe lunghe
  const statLen = (slide.stat_value || "").length;
  const statFontSize = statLen > 20 ? 54 : statLen > 14 ? 70 : statLen > 9 ? 88 : 104;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1080 1350"
      role="img"
      aria-label={`Anteprima slide ${slide.slide_no} di ${totalSlides}: ${slide.headline}`}
      className="w-full h-auto rounded-xl border border-slate-700/80 shadow-2xl bg-[#F8FAFC] select-none"
    >
      <defs>
        <linearGradient id="ofclBgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EBF2F7" />
        </linearGradient>
      </defs>

      {/* Canvas base chiaro ad alto contrasto (Swiss Acqua Calma) */}
      <rect x="0" y="0" width="1080" height="1350" fill="url(#ofclBgGrad)" />

      {/* Curve topografiche geometriche non araldiche (identità OFCL, zero stemmi LPSt) */}
      <path
        d="M -60 280 Q 320 190 660 300 T 1140 240"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.5"
        opacity="0.65"
      />
      <path
        d="M -60 330 Q 360 240 700 350 T 1140 290"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.2"
        opacity="0.45"
      />
      <path
        d="M -60 1120 Q 350 1040 720 1140 T 1140 1080"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Barra superiore istituzionale Blu Verbano */}
      <rect x="0" y="0" width="1080" height="14" fill="#0F3854" />
      <rect x="0" y="14" width="270" height="8" fill={accent} />

      {/* Header Identità OFCL + Indicatore Slide */}
      <g transform="translate(80, 74)">
        {/* Marchio geometrico astratto a 3 colonne (non araldico, conforme LPSt) */}
        <rect x="0" y="6" width="14" height="36" rx="3" fill="#0F3854" />
        <rect x="20" y="14" width="14" height="28" rx="3" fill="#00A3C4" />
        <rect x="40" y="0" width="14" height="42" rx="3" fill={accent} />

        <text
          x="74"
          y="22"
          fill="#0F3854"
          fontSize="26"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
          letterSpacing="-0.02em"
        >
          OFCL · LOCARNESE
        </text>
        <text
          x="74"
          y="46"
          fill="#475569"
          fontSize="18"
          fontWeight="600"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          OSSERVATORIO FINANZE COMUNALI
        </text>

        {/* Pillola numero slide */}
        <rect x="804" y="2" width="116" height="44" rx="22" fill="#0F3854" />
        <text
          x="862"
          y="31"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="22"
          fontWeight="700"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          {String(slide.slide_no).padStart(2, "0")}/
          {String(totalSlides).padStart(2, "0")}
        </text>
      </g>

      {/* Linea divisoria sottile */}
      <line x1="80" y1="154" x2="1000" y2="154" stroke="#CBD5E1" strokeWidth="2" />

      {/* Tag Segnale & Comune */}
      <g transform="translate(80, 194)">
        <rect x="0" y="0" width="330" height="46" rx="10" fill={accent} />
        <text
          x="20"
          y="30"
          fill="#FFFFFF"
          fontSize="20"
          fontWeight="800"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          letterSpacing="0.04em"
        >
          {meta.shortCode} · {SLIDE_KIND_LABEL[slide.kind]}
        </text>

        <text
          x="354"
          y="30"
          fill="#0F172A"
          fontSize="24"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {municipalityName.slice(0, 28)} · {refYear}
          {ustCode ? ` (UST ${ustCode})` : ""}
        </text>
      </g>

      {/* Titolo Slide */}
      <text
        x="80"
        y="312"
        fill="#0F172A"
        fontSize="50"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        letterSpacing="-0.025em"
      >
        {headlineLines.map((line, idx) => (
          <tspan key={idx} x="80" dy={idx === 0 ? 0 : 60}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Card Centrale Statistica / Domanda */}
      <g transform="translate(80, 495)">
        <rect
          x="0"
          y="0"
          width="920"
          height="320"
          rx="28"
          fill={isQuestion ? "#0F3854" : isSource ? "#F1F5F9" : "#FFFFFF"}
          stroke={isQuestion ? "#0F3854" : "#CBD5E1"}
          strokeWidth="3"
        />
        {/* Barra accento laterale */}
        <rect x="0" y="0" width="18" height="320" rx="8" fill={accent} />

        <text
          x="56"
          y="128"
          fill={isQuestion ? "#38BDF8" : accent}
          fontSize={statFontSize}
          fontWeight="800"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {slide.stat_value}
        </text>

        <text
          x="56"
          y="198"
          fill={isQuestion ? "#E2E8F0" : "#334155"}
          fontSize="29"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {statUnitLines.map((line, idx) => (
            <tspan key={idx} x="56" dy={idx === 0 ? 0 : 38}>
              {line}
            </tspan>
          ))}
        </text>

        {/* Etichetta di precisione MCA2 */}
        <text
          x="56"
          y="286"
          fill={isQuestion ? "#94A3B8" : "#64748B"}
          fontSize="20"
          fontWeight="600"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          PRECISIONE CONTABILE MCA2: 0.01 CHF · ZERO STIME
        </text>
      </g>

      {/* Corpo esplicativo */}
      <text
        x="80"
        y="890"
        fill="#1E293B"
        fontSize="33"
        fontWeight="500"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
      >
        {bodyLines.map((line, idx) => (
          <tspan key={idx} x="80" dy={idx === 0 ? 0 : 48}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Footer Legale & Fonte Verificabile ex art. 192 LOC */}
      <g transform="translate(80, 1140)">
        <rect
          x="0"
          y="0"
          width="920"
          height="145"
          rx="18"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <text
          x="28"
          y="40"
          fill="#0F3854"
          fontSize="20"
          fontWeight="800"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        >
          FONTE DOCUMENTALE VERIFICABILE:
        </text>
        <text
          x="28"
          y="74"
          fill="#334155"
          fontSize="21"
          fontWeight="600"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {sourceLines.map((line, idx) => (
            <tspan key={idx} x="28" dy={idx === 0 ? 0 : 28}>
              {line}
            </tspan>
          ))}
        </text>
        <text
          x="28"
          y="126"
          fill="#64748B"
          fontSize="17"
          fontWeight="600"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          Fanno fede gli atti originali esposti all&apos;albo comunale (art. 192 LOC) · Licenza CC BY 4.0
        </text>
      </g>
    </svg>
  );
}
