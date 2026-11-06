"use client";

import { useMemo } from "react";
import { ResponsiveRadar } from "@nivo/radar";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { MunicipalityData } from "@/data/municipalities";
import { getMunicipalitySelIndicators } from "@/data/municipalities";

interface SelIndicatorsRadarChartProps {
  primaryMun: MunicipalityData;
  compareMun?: MunicipalityData;
  height?: number;
}

export function SelIndicatorsRadarChart({
  primaryMun,
  compareMun,
  height = 240,
}: SelIndicatorsRadarChartProps) {
  const data = useMemo(() => {
    const primInds = getMunicipalitySelIndicators(primaryMun);
    const compInds = compareMun ? getMunicipalitySelIndicators(compareMun) : null;

    // Normalizzazione a indice 0-100 per il radar grafico
    return primInds.map((ind, idx) => {
      let normVal = 75;
      if (ind.band === "OTTIMO" || ind.band === "BUONO") normVal = 92;
      else if (ind.band === "MEDIO" || ind.band === "ACCETTABILE" || ind.band === "SUFFICIENTE") normVal = 72;
      else normVal = 40;

      let compNorm = 70;
      if (compInds) {
        const cBand = compInds[idx]?.band;
        if (cBand === "OTTIMO" || cBand === "BUONO") compNorm = 92;
        else if (cBand === "MEDIO" || cBand === "ACCETTABILE" || cBand === "SUFFICIENTE") compNorm = 72;
        else compNorm = 40;
      }

      return {
        indicatore: ind.short_label,
        [primaryMun.name]: normVal,
        ...(compareMun ? { [compareMun.name]: compNorm } : { "Soglia SEL": 70 }),
      };
    });
  }, [primaryMun, compareMun]);

  const keys = compareMun
    ? [primaryMun.name, compareMun.name]
    : [primaryMun.name, "Soglia SEL"];

  return (
    <div style={{ height }} className="w-full relative select-none">
      <ResponsiveRadar
        data={data}
        keys={keys}
        indexBy="indicatore"
        maxValue={100}
        margin={{ top: 25, right: 35, bottom: 25, left: 35 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: "color" }}
        gridLevels={4}
        gridShape="linear"
        gridLabelOffset={12}
        enableDots={true}
        dotSize={6}
        dotColor={{ theme: "background" }}
        dotBorderWidth={2}
        dotBorderColor={{ from: "color" }}
        colors={compareMun ? ["#2563eb", "#b91c1c"] : ["#00A3C4", "#94a3b8"]}
        fillOpacity={0.25}
        blendMode="multiply"
        animate={true}
        theme={nivoOflTheme}
      />
    </div>
  );
}
