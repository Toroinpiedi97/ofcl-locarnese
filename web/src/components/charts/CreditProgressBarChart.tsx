"use client";

import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { InvestmentCredit } from "@/data/credits";

interface CreditProgressBarChartProps {
  credits: InvestmentCredit[];
  height?: number;
}

export function CreditProgressBarChart({
  credits,
  height = 220,
}: CreditProgressBarChartProps) {
  const data = useMemo(() => {
    return credits.slice(0, 5).map((c) => ({
      opera: c.description.length > 25 ? `${c.description.slice(0, 23)}...` : c.description,
      "Credito Votato": c.voted_credit_chf,
      "Spesa Cumulata": c.spent_total_chf,
      isOverrun: c.is_overrun ? 1 : 0,
    }));
  }, [credits]);

  return (
    <div style={{ height }} className="w-full relative select-none">
      <ResponsiveBar
        data={data}
        ariaLabel="Grafico stato avanzamento crediti d'opera"
        keys={["Credito Votato", "Spesa Cumulata"]}
        indexBy="opera"
        groupMode="grouped"
        theme={nivoOflTheme}
        colors={({ id, data: d }: { id: string | number; data: Record<string, unknown> }) => {
          if (id === "Spesa Cumulata" && (d as { isOverrun?: number }).isOverrun === 1) {
            return "#dc2626"; // Sorpasso
          }
          return id === "Credito Votato" ? "#0F3854" : "#10b981";
        }}
        margin={{ top: 12, right: 16, bottom: 42, left: 130 }}
        padding={0.3}
        layout="horizontal"
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 4,
          tickPadding: 4,
          tickRotation: 0,
          format: (v: number | string) => `${(Number(v) / 1000).toFixed(0)}k`,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 6,
          tickRotation: 0,
        }}
        enableGridX={true}
        enableGridY={false}
        enableLabel={false}
        tooltip={({ id, value, color, indexValue }: { id: string | number; value: number | string; color: string; indexValue: string | number }) => (
          <div className="rounded-xl bg-slate-900/95 text-white p-2 text-xs font-mono shadow-xl border border-slate-700">
            <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
              {indexValue}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{id}:</span>
              </span>
              <span className="font-bold text-cyan-400">
                {Number(value).toLocaleString("de-CH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                CHF
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-800 text-[9px] text-slate-400">
              Allegato f (Controllo Crediti Art. 15 LOC) ↗
            </div>
          </div>
        )}
      />
    </div>
  );
}
