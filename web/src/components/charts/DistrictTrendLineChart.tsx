"use client";

import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { MunicipalityData } from "@/data/municipalities";
import {
  DISTRICT_YEARS,
  MEDIA_DISTRETTO_SPESA_HISTORY,
  getMunicipalityHistory,
} from "@/data/municipalities";

interface DistrictTrendLineChartProps {
  primaryMun: MunicipalityData;
  compareMun: MunicipalityData;
  height?: number;
}

export function DistrictTrendLineChart({
  primaryMun,
  compareMun,
  height = 195,
}: DistrictTrendLineChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = useMemo(() => {
    const primHist = getMunicipalityHistory(primaryMun);
    const compHist = getMunicipalityHistory(compareMun);

    return [
      {
        id: primaryMun.name,
        color: "#2563eb",
        data: primHist.map((h) => ({
          x: String(h.year),
          y: h.amount,
        })),
      },
      {
        id: compareMun.name,
        color: "#f97316",
        data: compHist.map((h) => ({
          x: String(h.year),
          y: h.amount,
        })),
      },
      {
        id: "Media Distretto",
        color: "#0ea5e9",
        data: DISTRICT_YEARS.map((y) => ({
          x: String(y),
          y: MEDIA_DISTRETTO_SPESA_HISTORY[y],
        })),
      },
    ];
  }, [primaryMun, compareMun]);

  return (
    <div style={{ height }} className="w-full relative select-none overflow-hidden rounded-xl">
      {/* Sfondo Isolinee Topografiche Sottili Dietro al Grafico (Come nel mockup di riferimento) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
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

      <ResponsiveLine
        data={data}
        ariaLabel="Grafico andamento spese e ricavi storici 2019-2026"
        theme={nivoOflTheme}
        colors={["#2563eb", "#f97316", "#0ea5e9"]}
        margin={{ top: 12, right: 14, bottom: 28, left: 42 }}
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
          tickPadding: 4,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 4,
          tickRotation: 0,
          format: (v: number | string) => `${v}`,
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
          <div className="rounded-xl bg-slate-900/95 text-white p-2.5 text-xs font-mono shadow-xl border border-slate-700">
            <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-300">
              Anno {slice.points[0]?.data.x} · Spesa pro capite
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {slice.points.map((pt: any) => (
              <div key={pt.id} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={{ backgroundColor: (pt as any).seriesColor ?? (pt as any).serieColor ?? (pt as any).color }}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="text-slate-300">{(pt as any).seriesId ?? (pt as any).serieId ?? pt.id}:</span>
                </span>
                <span className="font-bold text-cyan-400">
                  CHF {Number(pt.data.yFormatted ?? pt.data.y).toLocaleString("de-CH")}
                </span>
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
