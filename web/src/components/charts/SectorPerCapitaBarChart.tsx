"use client";

import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { MunicipalityData } from "@/data/municipalities";
import { getMunicipalitySectors } from "@/data/municipalities";

interface SectorPerCapitaBarChartProps {
  municipality: MunicipalityData;
  height?: number;
}

export function SectorPerCapitaBarChart({
  municipality,
  height = 195,
}: SectorPerCapitaBarChartProps) {
  const data = useMemo(() => {
    return getMunicipalitySectors(municipality).map((s) => ({
      settore: s.sector,
      "Spese Personale (30)": s.c30_personale,
      "Beni e Servizi (31)": s.c31_beni_servizi,
      "Trasferimenti (36)": s.c36_trasferimenti,
    }));
  }, [municipality]);

  return (
    <div style={{ height }} className="w-full relative select-none">
      <ResponsiveBar
        data={data}
        ariaLabel="Grafico ripartizione spesa pro capite per settore"
        keys={["Spese Personale (30)", "Beni e Servizi (31)", "Trasferimenti (36)"]}
        indexBy="settore"
        layout="horizontal"
        theme={nivoOflTheme}
        colors={["#334e68", "#b91c1c", "#15803d"]}
        margin={{ top: 8, right: 16, bottom: 28, left: 95 }}
        padding={0.32}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 4,
          tickPadding: 4,
          tickRotation: 0,
          format: (v: number | string) => `${v}`,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
        }}
        enableGridX={true}
        enableGridY={false}
        enableLabel={false}
        tooltip={({ id, value, color, indexValue }: { id: string | number; value: number | string; color: string; indexValue: string | number }) => (
          <div className="rounded-xl bg-slate-900/95 text-white p-2 text-xs font-mono shadow-xl border border-slate-700">
            <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
              {indexValue} · {id}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>Spesa pro capite:</span>
              </span>
              <span className="font-bold text-cyan-400">
                {Number(value).toLocaleString("de-CH")} CHF/ab
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-800 text-[9px] text-slate-400">
              Classi MCA2 30, 31, 36 · CE p.12 ↗
            </div>
          </div>
        )}
      />
    </div>
  );
}
