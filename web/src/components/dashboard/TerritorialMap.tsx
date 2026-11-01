"use client";

import { useState } from "react";
import type { MunicipalityData } from "@/data/municipalities";

export interface TerritorialMapProps {
  municipalities: MunicipalityData[];
  selectedUstCode: number;
  onSelectMunicipality: (municipality: MunicipalityData) => void;
  className?: string;
}

// Coordinate approssimate e forme vettoriali per i 19 Comuni del Locarnese
// Mappa compatta proiettata su viewBox 0 0 800 650 (con Lago Maggiore al centro/sud)
interface MapNode {
  ust_code: number;
  x: number;
  y: number;
  path: string;
  labelX: number;
  labelY: number;
}

const MAP_NODES: MapNode[] = [
  // Valle Verzasca & Nord
  {
    ust_code: 5399, // Verzasca
    x: 440,
    y: 90,
    path: "M 400 30 L 490 50 L 510 170 L 440 210 L 390 140 Z",
    labelX: 445,
    labelY: 120,
  },
  {
    ust_code: 5117, // Mergoscia
    x: 440,
    y: 220,
    path: "M 420 200 L 470 210 L 460 260 L 410 240 Z",
    labelX: 438,
    labelY: 235,
  },
  {
    ust_code: 5112, // Lavertezzo (Piano)
    x: 490,
    y: 240,
    path: "M 470 220 L 530 230 L 520 280 L 460 270 Z",
    labelX: 495,
    labelY: 255,
  },
  // Valle Onsernone & Centovalli (Ovest)
  {
    ust_code: 5136, // Onsernone
    x: 170,
    y: 180,
    path: "M 100 130 L 250 160 L 230 250 L 110 230 Z",
    labelX: 170,
    labelY: 190,
  },
  {
    ust_code: 5397, // Centovalli
    x: 220,
    y: 290,
    path: "M 130 250 L 280 260 L 270 350 L 140 330 Z",
    labelX: 205,
    labelY: 300,
  },
  {
    ust_code: 5396, // Terre di Pedemonte
    x: 290,
    y: 310,
    path: "M 280 270 L 350 280 L 340 350 L 280 340 Z",
    labelX: 310,
    labelY: 315,
  },
  // Area Urbana e Collinare di Locarno
  {
    ust_code: 5121, // Orselina
    x: 375,
    y: 300,
    path: "M 360 290 L 410 295 L 405 330 L 365 325 Z",
    labelX: 385,
    labelY: 312,
  },
  {
    ust_code: 5096, // Brione sopra Minusio
    x: 420,
    y: 290,
    path: "M 410 275 L 460 280 L 450 325 L 410 320 Z",
    labelX: 432,
    labelY: 302,
  },
  {
    ust_code: 5120, // Muralto
    x: 390,
    y: 335,
    path: "M 380 330 L 415 332 L 410 365 L 385 360 Z",
    labelX: 398,
    labelY: 348,
  },
  {
    ust_code: 5118, // Minusio
    x: 430,
    y: 335,
    path: "M 415 325 L 470 330 L 460 375 L 415 365 Z",
    labelX: 442,
    labelY: 350,
  },
  {
    ust_code: 5113, // Città di Locarno
    x: 335,
    y: 345,
    path: "M 320 320 L 380 325 L 380 395 L 340 405 L 315 365 Z",
    labelX: 345,
    labelY: 365,
  },
  {
    ust_code: 5115, // Losone
    x: 285,
    y: 360,
    path: "M 270 345 L 320 345 L 315 420 L 265 400 Z",
    labelX: 290,
    labelY: 380,
  },
  {
    ust_code: 5091, // Ascona
    x: 305,
    y: 425,
    path: "M 290 405 L 350 410 L 335 480 L 280 460 Z",
    labelX: 312,
    labelY: 445,
  },
  {
    ust_code: 5125, // Ronco sopra Ascona
    x: 250,
    y: 460,
    path: "M 240 440 L 290 450 L 275 510 L 230 490 Z",
    labelX: 260,
    labelY: 475,
  },
  {
    ust_code: 5097, // Brissago
    x: 200,
    y: 510,
    path: "M 190 480 L 250 500 L 235 590 L 170 560 Z",
    labelX: 210,
    labelY: 535,
  },
  // Piano di Magadino & Navegna (Est)
  {
    ust_code: 5131, // Tenero-Contra
    x: 475,
    y: 340,
    path: "M 465 325 L 515 330 L 505 385 L 460 375 Z",
    labelX: 485,
    labelY: 355,
  },
  {
    ust_code: 5108, // Gordola
    x: 520,
    y: 335,
    path: "M 510 320 L 575 325 L 565 390 L 505 380 Z",
    labelX: 538,
    labelY: 355,
  },
  {
    ust_code: 5138, // Cugnasco-Gerra
    x: 585,
    y: 330,
    path: "M 570 315 L 670 320 L 650 400 L 565 390 Z",
    labelX: 615,
    labelY: 355,
  },
  // Riviera del Gambarogno (Sud del Verbano)
  {
    ust_code: 5398, // Gambarogno
    x: 410,
    y: 470,
    path: "M 345 425 L 460 410 L 530 480 L 450 580 L 340 500 Z",
    labelX: 430,
    labelY: 495,
  },
];

export function TerritorialMap({
  municipalities,
  selectedUstCode,
  onSelectMunicipality,
  className = "",
}: TerritorialMapProps) {
  const [hoveredUst, setHoveredUst] = useState<number | null>(null);

  // Mappa codice UST -> dati comune
  const munMap = new Map<number, MunicipalityData>();
  for (const m of municipalities) {
    munMap.set(m.ust_code, m);
  }

  function getColorByMultiplier(multiplier: number, isSelected: boolean, isHovered: boolean) {
    if (isSelected) {
      return "fill-cyan-500 stroke-cyan-200 stroke-[3]";
    }
    if (isHovered) {
      return "fill-cyan-600 stroke-white stroke-[2.5]";
    }

    // Palette Solare / Acqua Calma basata su soglie fiscali
    if (multiplier <= 75.0) {
      return "fill-emerald-600/85 hover:fill-emerald-500 stroke-white/40 dark:stroke-slate-800";
    }
    if (multiplier <= 85.0) {
      return "fill-[#00A3C4]/85 hover:fill-[#00A3C4] stroke-white/40 dark:stroke-slate-800";
    }
    if (multiplier <= 93.0) {
      return "fill-amber-600/85 hover:fill-amber-500 stroke-white/40 dark:stroke-slate-800";
    }
    return "fill-red-600/85 hover:fill-red-500 stroke-white/40 dark:stroke-slate-800";
  }

  const activeMun = munMap.get(hoveredUst || selectedUstCode);

  return (
    <div className={`bento-card p-4 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between ${className}`}>
      {/* Intestazione Mappa */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Mappa Georeferenziata Vettoriale
          </span>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            19 Comuni · Comprensorio del Locarnese
          </h4>
        </div>

        {/* Mini Legenda Cromatica */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ≤75%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A3C4]" /> ≤85%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ≤93%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> 100%
          </span>
        </div>
      </div>

      {/* SVG Interattivo ad Alta Efficienza */}
      <div className="relative w-full aspect-[4/3] max-h-[360px] bg-slate-100/80 dark:bg-slate-950/60 rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center">
        <svg
          viewBox="80 20 620 590"
          className="w-full h-full select-none cursor-pointer filter drop-shadow-sm"
        >
          {/* Corpo Idrico: Lago Maggiore / Verbano */}
          <path
            d="M 270 410 C 310 420 330 460 310 520 C 290 570 240 600 220 620 L 370 620 C 380 540 370 480 340 430 Z"
            className="fill-sky-400/25 dark:fill-cyan-900/40 stroke-cyan-400/50 stroke-[1]"
          />
          <text
            x="290"
            y="520"
            transform="rotate(-55 290 520)"
            className="fill-cyan-600/60 dark:fill-cyan-400/40 font-semibold text-[13px] tracking-widest uppercase pointer-events-none"
          >
            Lago Maggiore (Verbano)
          </text>

          {/* Poligoni dei 19 Comuni */}
          {MAP_NODES.map((node) => {
            const mun = munMap.get(node.ust_code);
            if (!mun) return null;

            const isSelected = mun.ust_code === selectedUstCode;
            const isHovered = mun.ust_code === hoveredUst;
            const styleClasses = getColorByMultiplier(mun.tax_multiplier_pf, isSelected, isHovered);

            return (
              <g
                key={node.ust_code}
                id={`mun-group-${node.ust_code}`}
                onClick={() => onSelectMunicipality(mun)}
                onMouseEnter={() => setHoveredUst(node.ust_code)}
                onMouseLeave={() => setHoveredUst(null)}
                className="transition-transform duration-150 focus:outline-none cursor-pointer"
              >
                <path
                  id={`mun-path-${node.ust_code}`}
                  d={node.path}
                  className={`transition-all duration-200 ${styleClasses}`}
                />
                <text
                  x={node.labelX}
                  y={node.labelY}
                  textAnchor="middle"
                  className={`pointer-events-none text-[9px] font-bold ${
                    isSelected
                      ? "fill-white font-extrabold"
                      : "fill-slate-900 dark:fill-white/90"
                  }`}
                >
                  {mun.name}
                </text>
                <text
                  x={node.labelX}
                  y={node.labelY + 10}
                  textAnchor="middle"
                  className={`pointer-events-none text-[8px] font-mono ${
                    isSelected ? "fill-cyan-100" : "fill-slate-800/80 dark:fill-slate-300"
                  }`}
                >
                  {mun.tax_multiplier_pf}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover / Active Badge fluttuante */}
        {activeMun && (
          <div className="absolute bottom-2.5 left-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur border border-slate-700 text-white text-xs shadow-lg pointer-events-none flex items-center gap-3">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>{activeMun.name}</span>
                <span className="text-[10px] text-cyan-400 font-mono">({activeMun.ust_code})</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {activeMun.population.toLocaleString("de-CH")} ab. · Circolo di {activeMun.circle}
              </div>
            </div>
            <div className="border-l border-slate-700 pl-2.5 text-right">
              <div className="font-mono font-bold text-cyan-400">
                {activeMun.tax_multiplier_pf}%
              </div>
              <div className="text-[9px] text-slate-400">PF 2026</div>
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-between">
        <span>Fai clic su un comune per selezionarlo</span>
        <span className="font-mono">swissBOUNDARIES3D (MCA2)</span>
      </div>
    </div>
  );
}
