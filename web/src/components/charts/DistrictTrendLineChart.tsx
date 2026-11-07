"use client";

import { useMemo, useRef, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { MunicipalityData } from "@/data/municipalities";
import {
  DISTRICT_YEARS,
  MEDIA_DISTRETTO_SPESA_HISTORY,
  getMunicipalityHistory,
} from "@/data/municipalities";
import { formatCompactNumber } from "@/lib/utils";
import { exportSvgElement, type ExportFormat } from "@/lib/chart-export";
import { MUNICIPALITY_SERIES_COLORS } from "@/components/dashboard/GlobalFilterBar";
import { Download, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DistrictTrendLineChartProps {
  municipalities: MunicipalityData[]; // Da 1 a 4 comuni selezionati
  showDistrictAverage?: boolean;
  height?: number | string;
  className?: string;
}

export function DistrictTrendLineChart({
  municipalities,
  showDistrictAverage = true,
  height = "100%",
  className,
}: DistrictTrendLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Costruisci le serie di dati Nivo (fino a 4 comuni + media distrettuale)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { seriesData, colorsList }: { seriesData: any[]; colorsList: string[] } = useMemo(() => {
    const list: any[] = [];
    const colors: string[] = [];

    municipalities.slice(0, 4).forEach((m, idx) => {
      const hist = getMunicipalityHistory(m);
      const color = MUNICIPALITY_SERIES_COLORS[idx] || "#2563eb";

      list.push({
        id: m.name,
        color,
        data: hist.map((h) => ({
          x: String(h.year),
          y: h.amount,
        })),
      });
      colors.push(color);
    });

    if (showDistrictAverage) {
      list.push({
        id: "Media Distretto",
        color: "#64748b",
        data: DISTRICT_YEARS.map((y) => ({
          x: String(y),
          y: MEDIA_DISTRETTO_SPESA_HISTORY[y],
        })),
      });
      colors.push("#64748b");
    }

    return { seriesData: list, colorsList: colors };
  }, [municipalities, showDistrictAverage]);

  // Gestione esportazione client-side diretta da DOM SVG
  async function handleExport(format: ExportFormat) {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    try {
      setIsExporting(true);
      const names = municipalities.map((m) => m.slug).join("-vs-") || "distretto";
      await exportSvgElement(svgEl as unknown as SVGSVGElement, {
        filename: `ofcl-andamento-spese-${names}-2019-2026`,
        format,
        backgroundColor: "#ffffff",
      });
      setDownloadSuccess(format.toUpperCase());
      setTimeout(() => setDownloadSuccess(null), 2000);
    } catch (e) {
      console.error("Errore esportazione grafico:", e);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col justify-between select-none relative"
      style={{ minHeight: typeof height === "number" ? height : 280 }}
    >
      {/* Intestazione interna: Barra di controllo esportazione e leggibilità */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-700">Serie Storica (2019–2026)</span>
          <span className="text-[11px] text-slate-500 font-mono">
            · Unità: CHF pro capite (k = migliaia)
          </span>
        </div>

        {/* Pulsante Download Client-Side */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
              title="Esporta questo grafico in PNG, JPEG o SVG direttamente dal browser"
            >
              <Download className="w-3.5 h-3.5 text-sky-700" />
              <span>{downloadSuccess ? `Scaricato (${downloadSuccess})` : "Scarica"}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-44 p-1.5 ofl-card shadow-xl">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Formato Grafico
            </div>
            <button
              type="button"
              onClick={() => handleExport("png")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-sky-50 transition-colors text-left cursor-pointer"
            >
              <span>Immagine PNG (Alta ris.)</span>
              <span className="text-[10px] font-mono text-slate-500">.png</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("jpeg")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-sky-50 transition-colors text-left cursor-pointer"
            >
              <span>Immagine JPEG</span>
              <span className="text-[10px] font-mono text-slate-500">.jpg</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("svg")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-sky-50 transition-colors text-left cursor-pointer"
            >
              <span>Vettoriale SVG</span>
              <span className="text-[10px] font-mono text-slate-500">.svg</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Sfondo Topografico Vettoriale Leggero */}
      <div className="relative flex-1 w-full min-h-[220px]">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          viewBox="0 0 500 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g fill="none" stroke="#d97706" strokeWidth="1">
            <path d="M 0,35 Q 150,15 300,45 T 500,25" />
            <path d="M 0,65 Q 180,45 320,75 T 500,55" />
            <path d="M 0,95 Q 200,75 350,105 T 500,85" />
            <path d="M 0,125 Q 220,105 380,135 T 500,115" />
            <path d="M 0,155 Q 250,135 400,165 T 500,145" />
          </g>
        </svg>

        {/* Nivo ResponsiveLine che occupa dinamicamente tutto lo spazio */}
        <ResponsiveLine
          data={seriesData}
          ariaLabel="Grafico andamento spese e ricavi storici 2019-2026"
          theme={nivoOflTheme}
          colors={colorsList}
          margin={{ top: 14, right: 18, bottom: 32, left: 48 }}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min: "auto",
            max: "auto",
            stacked: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 4,
            tickPadding: 6,
            tickRotation: 0,
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 6,
            tickRotation: 0,
            format: (v: number | string) => formatCompactNumber(v),
            legend: "CHF / ab.",
            legendOffset: -40,
            legendPosition: "middle",
          }}
          enableGridX={false}
          enableGridY={true}
          lineWidth={2.8}
          pointSize={6}
          pointColor={{ from: "color" }}
          pointBorderWidth={2}
          pointBorderColor="#ffffff"
          pointLabelYOffset={-12}
          useMesh={true}
          enableSlices="x"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sliceTooltip={({ slice }: { slice: { points: readonly any[] } }) => (
            <div className="rounded-xl bg-slate-900/95 text-white p-2.5 text-xs font-mono shadow-2xl border border-slate-700 min-w-[200px]">
              <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-300 flex items-center justify-between">
                <span>Esercizio {slice.points[0]?.data.x}</span>
                <span className="text-[10px] text-slate-400">Spesa pro capite</span>
              </div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {slice.points.map((pt: any) => (
                <div key={pt.id} className="flex items-center justify-between gap-4 py-0.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          pt.seriesColor ?? pt.serieColor ?? pt.color,
                      }}
                    />
                    <span className="text-slate-300 font-sans font-medium text-xs">
                      {pt.seriesId ?? pt.serieId ?? pt.id}:
                    </span>
                  </span>
                  <span className="font-bold text-cyan-400 font-mono">
                    CHF {Number(pt.data.yFormatted ?? pt.data.y).toLocaleString("de-CH")}
                  </span>
                </div>
              ))}
            </div>
          )}
        />
      </div>
    </div>
  );
}
