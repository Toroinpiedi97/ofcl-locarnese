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
        color: "#b91c1c",
        data: compHist.map((h) => ({
          x: String(h.year),
          y: h.amount,
        })),
      },
      {
        id: "Media Distretto",
        color: "#64748b",
        data: DISTRICT_YEARS.map((y) => ({
          x: String(y),
          y: MEDIA_DISTRETTO_SPESA_HISTORY[y],
        })),
      },
    ];
  }, [primaryMun, compareMun]);

  return (
    <div style={{ height }} className="w-full relative select-none">
      <ResponsiveLine
        data={data}
        theme={nivoOflTheme}
        colors={["#2563eb", "#b91c1c", "#64748b"]}
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
          format: (v) => `${v}`,
        }}
        enableGridX={false}
        enableGridY={true}
        lineWidth={2.5}
        pointSize={6}
        pointColor={{ from: "color" }}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serieColor" }}
        pointLabelYOffset={-12}
        useMesh={true}
        enableSlices="x"
        sliceTooltip={({ slice }) => (
          <div className="rounded-xl bg-slate-900/95 text-white p-2.5 text-xs font-mono shadow-xl border border-slate-700">
            <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-slate-300">
              Anno {slice.points[0]?.data.x} · Spesa pro capite
            </div>
            {slice.points.map((pt) => (
              <div key={pt.id} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: (pt as any).seriesColor ?? (pt as any).serieColor ?? (pt as any).color }}
                  />
                  <span className="text-slate-300">{(pt as any).seriesId ?? (pt as any).serieId ?? pt.id}:</span>
                </span>
                <span className="font-bold text-cyan-400">
                  {Number(pt.data.yFormatted).toLocaleString("de-CH")} CHF
                </span>
              </div>
            ))}
            <div className="mt-1 pt-1 border-t border-slate-800 text-[9px] text-slate-400">
              Citazione: Rendiconto MCA2 p.5 ↗
            </div>
          </div>
        )}
      />
    </div>
  );
}
