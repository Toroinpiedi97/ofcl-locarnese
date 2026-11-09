"use client";

import { useMemo, useState, useRef } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { nivoOflTheme } from "./nivo-ofl-theme";
import type { MunicipalityData } from "@/data/municipalities";
import {
  getMunicipalityHierarchyTree,
  resolveDrilldownNodes,
  type Mca2HierarchyNode,
} from "@/data/mca2-hierarchy";
import { formatCompactNumber, formatChfExact } from "@/lib/utils";
import { exportSvgElement, type ExportFormat } from "@/lib/chart-export";
import { useContainerWidth } from "@/lib/useContainerWidth";
import {
  Download,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  FolderTree,
  Layers,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SectorPerCapitaBarChartProps {
  municipalities: MunicipalityData[]; // Comuni selezionati nel filtro globale
  selectedYear?: string;
  height?: number | string;
  className?: string;
}

export function SectorPerCapitaBarChart({
  municipalities,
  selectedYear = "2024",
  height = "100%",
  className,
}: SectorPerCapitaBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);
  const isNarrow = containerWidth > 0 && containerWidth < 420;

  const [activeMuniIndex, setActiveMuniIndex] = useState(0);
  const [drilldownPath, setDrilldownPath] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const currentMunicipality = municipalities[activeMuniIndex] || municipalities[0];

  // Calcola l'albero MCA2 completo a 4 livelli per il comune attivo per l'anno selezionato
  const hierarchyTree = useMemo(() => {
    return getMunicipalityHierarchyTree(currentMunicipality, selectedYear);
  }, [currentMunicipality, selectedYear]);

  // Risolve i nodi visibili in base al percorso di drilldown corrente
  const { currentNodes, parentTitle, breadcrumb } = useMemo(() => {
    return resolveDrilldownNodes(hierarchyTree, drilldownPath);
  }, [hierarchyTree, drilldownPath]);

  // Prepara i dati per Nivo Bar
  const chartData = useMemo(() => {
    const maxChars = isNarrow ? 15 : 28;
    return currentNodes.map((node) => ({
      code: node.code,
      name: node.name,
      labelClean: node.name.length > maxChars ? `${node.name.slice(0, maxChars - 2)}…` : node.name,
      amountPc: node.amountPc,
      amountTotal: node.amountTotal,
      level: node.level,
      levelLabel: node.levelLabel,
      hasChildren: node.children && node.children.length > 0 ? 1 : 0,
    }));
  }, [currentNodes, isNarrow]);

  // Navigazione drill-down
  function handleDrillDown(code: string) {
    const node = currentNodes.find((n) => n.code === code);
    if (node && node.children && node.children.length > 0) {
      setDrilldownPath((prev) => [...prev, code]);
    }
  }

  function handleBreadcrumbClick(targetLevel: number) {
    if (targetLevel === 0) {
      setDrilldownPath([]);
    } else {
      setDrilldownPath((prev) => prev.slice(0, targetLevel));
    }
  }

  function handleGoUp() {
    setDrilldownPath((prev) => prev.slice(0, -1));
  }

  // Esportazione client-side
  async function handleExport(format: ExportFormat) {
    const chartEl = chartRef.current;
    if (!chartEl) return;

    const svgEl =
      chartEl.querySelector<SVGSVGElement>("svg[role='img']") ||
      chartEl.querySelector<SVGSVGElement>("svg:not([aria-hidden='true'])") ||
      chartEl.querySelector<SVGSVGElement>("svg");

    if (!svgEl || svgEl.closest("button") || svgEl.classList.contains("lucide")) {
      console.warn("Nessun SVG contabile valido trovato per l'esportazione");
      return;
    }

    try {
      setIsExporting(true);
      const levelSlug = drilldownPath.join("-") || "dicasteri";
      const levelLabel =
        drilldownPath.length === 0
          ? "Dicasteri principali (Livello 1 MCA2)"
          : drilldownPath.length === 1
          ? `Settore ${drilldownPath[0]} (Livello 2 MCA2)`
          : `Gruppo ${drilldownPath.join(" > ")} (Livello 3 MCA2)`;

      await exportSvgElement(svgEl as unknown as SVGSVGElement, {
        filename: `ofcl-spesa-mca2-${currentMunicipality.slug}-livello-${levelSlug}`,
        format,
        backgroundColor: "#ffffff",
        title: `Spesa per Settore MCA2 – ${currentMunicipality.name} (${selectedYear})`,
        subtitle: `${levelLabel} · Spesa netta per abitante in CHF (MCA2)`,
        source: `Fonte: Rendiconto e Consuntivo Ufficiale ${selectedYear} (${currentMunicipality.name}) / Sezione enti locali (SEL)`,
        legalNotice: "Elaborazione dati aperti: ofcl.ch · Trasparenza conti pubblici comunali ex art. 192 LOC",
      });
      setDownloadSuccess(format.toUpperCase());
      setTimeout(() => setDownloadSuccess(null), 2000);
    } catch (e) {
      console.error("Errore esportazione:", e);
    } finally {
      setIsExporting(false);
    }
  }

  // Calcolo altezza dinamica per contenere tutte le voci senza tagli
  const computedHeight = Math.max(chartData.length * 42 + 60, 260);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full flex-1 flex flex-col justify-between select-none relative min-w-0",
        className
      )}
      style={{ minHeight: typeof height === "number" ? height : 300 }}
    >
      {/* 1. Header Card: Breadcrumbs interattivi + Switch Comune (se multipli) + Download */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/80">
        {/* Breadcrumb navigazione gerarchica */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs min-w-0">
          <button
            type="button"
            onClick={() => handleBreadcrumbClick(0)}
            className={cn(
              "font-bold transition-colors cursor-pointer hover:text-blue-900 flex items-center gap-1",
              drilldownPath.length === 0 ? "text-[#0F3854]" : "text-slate-500"
            )}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Spesa MCA2</span>
          </button>

          {breadcrumb.map((bc, idx) => (
            <div key={bc.code} className="flex items-center gap-1 text-slate-400">
              <ChevronRight className="w-3 h-3" />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx + 1)}
                className={cn(
                  "font-bold transition-colors cursor-pointer hover:text-blue-900",
                  idx === breadcrumb.length - 1 ? "text-[#0F3854]" : "text-slate-600"
                )}
              >
                {bc.name}
              </button>
            </div>
          ))}

          {drilldownPath.length > 0 && (
            <button
              type="button"
              onClick={handleGoUp}
              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
              title="Torna al livello superiore"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Indietro</span>
            </button>
          )}
        </div>

        {/* Controlli Destra: Switch comune (se > 1) + Download */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {municipalities.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {municipalities.slice(0, 4).map((m, idx) => (
                <button
                  key={m.ust_code}
                  type="button"
                  onClick={() => setActiveMuniIndex(idx)}
                  className={cn(
                    "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer text-[11px]",
                    activeMuniIndex === idx
                      ? "bg-white text-[#0F3854] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {/* Badge Anno Attivo */}
          <span
            className={cn(
              "font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1",
              selectedYear.includes("2026")
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            )}
          >
            <span>{selectedYear}</span>
            <span>{selectedYear.includes("2026") ? "Prev." : "Cons."}</span>
          </span>

          {/* Download Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isExporting}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                title="Esporta grafico gerarchico in PNG, JPEG o SVG"
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
                <span>Immagine PNG</span>
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
      </div>

      {/* Sottotitolo livello attuale */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 mb-1 px-1">
        <span className="flex items-center gap-1 font-medium min-w-0">
          <Layers className="w-3 h-3 text-sky-600 shrink-0" />
          <span className="truncate">
            {currentNodes[0]?.levelLabel || "Livello"}:{" "}
            <strong className="text-slate-800">{parentTitle}</strong>
          </span>
        </span>
        <span className="font-mono text-[10px] text-slate-500 sm:text-right shrink-0">
          {drilldownPath.length < 3
            ? "Clicca su una barra per approfondire la voce ↗"
            : "Massimo livello di dettaglio contabile (Conto 4 cifre)"}
        </span>
      </div>

      {/* 2. Grafico Nivo Bar Orizzontale Flessibile & Responsive */}
      <div
        ref={chartRef}
        className="w-full flex-1 overflow-y-auto overflow-x-hidden relative min-w-0"
        style={{ height: computedHeight, minHeight: 220 }}
      >
        <ResponsiveBar
          data={chartData}
          keys={["amountPc"]}
          indexBy="labelClean"
          layout="horizontal"
          theme={nivoOflTheme}
          colors={({ data }) => {
            const hasChild = (data as any).hasChildren;
            return hasChild ? "#0284c7" : "#0d9488";
          }}
          margin={{ top: 8, right: isNarrow ? 18 : 30, bottom: 34, left: isNarrow ? 104 : 160 }}
          padding={0.28}
          valueScale={{ type: "linear" }}
          indexScale={{ type: "band", round: true }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 4,
            tickPadding: 4,
            tickRotation: 0,
            format: (v: number | string) => formatCompactNumber(v),
            legend: "Spesa pro capite (CHF/ab)",
            legendOffset: 24,
            legendPosition: "middle",
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 10,
            tickRotation: 0,
          }}
          enableGridX={true}
          enableGridY={false}
          enableLabel={true}
          label={(d) => `${formatCompactNumber(d.value)}`}
          labelTextColor="#ffffff"
          labelSkipWidth={36}
          onClick={(node) => {
            const item = node.data as any;
            if (item.hasChildren) {
              handleDrillDown(item.code);
            }
          }}
          tooltip={({ data }: { data: any }) => (
            <div className="rounded-xl bg-slate-900/95 text-white p-2.5 text-xs font-mono shadow-2xl border border-slate-700 max-w-xs">
              <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-200">
                {data.name}
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-slate-400">Pro capite:</span>
                <span className="font-bold text-cyan-400">
                  {formatChfExact(data.amountPc, { showUnit: true })} / ab.
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-slate-400">Totale Comune:</span>
                <span className="font-bold text-slate-200">
                  {formatChfExact(data.amountTotal, { showUnit: true })}
                </span>
              </div>
              <div className="mt-1.5 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Livello: {data.levelLabel}</span>
                {data.hasChildren ? (
                  <span className="text-sky-300 font-bold">Clicca per esplorare ↗</span>
                ) : (
                  <span className="text-slate-500">Dettaglio finale</span>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {/* 3. Footer con indicazione interattiva */}
      <div className="pt-2 mt-1 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
        <span>
          Visualizzate tutte le <strong>{chartData.length}</strong> voci disponibili nel livello
        </span>
        {drilldownPath.length < 3 && (
          <span className="text-sky-800 font-semibold text-[11px]">
            Approfondisci fino al conto a 4 cifre
          </span>
        )}
      </div>
    </div>
  );
}
