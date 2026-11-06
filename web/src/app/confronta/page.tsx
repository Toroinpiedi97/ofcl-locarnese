"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MUNICIPALITIES, type MunicipalityData } from "@/data/municipalities";
import {
  ArrowLeft,
  ArrowUpDown,
  Download,
  ShieldCheck,
  Check,
  AlertCircle,
  Filter,
} from "lucide-react";

type MetricKey =
  | "tax_multiplier_pf"
  | "debito_netto_pc_chf"
  | "autofinanziamento_chf"
  | "investimenti_netti_chf"
  | "risultato_ordinario_chf"
  | "population";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  isCurrency?: boolean;
  reverseColor?: boolean; // Se true, valori più bassi sono migliori (es. debito o moltiplicatore)
  format: (val: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: "tax_multiplier_pf",
    label: "Moltiplicatore d'Imposta (PF)",
    unit: "%",
    reverseColor: true,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "debito_netto_pc_chf",
    label: "Debito Netto pro capite",
    unit: "CHF/ab",
    isCurrency: true,
    reverseColor: true,
    format: (v) =>
      `${v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF`,
  },
  {
    key: "autofinanziamento_chf",
    label: "Autofinanziamento MCA2",
    unit: "CHF",
    isCurrency: true,
    reverseColor: false,
    format: (v) =>
      `${v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF`,
  },
  {
    key: "investimenti_netti_chf",
    label: "Investimenti Netti Annuali",
    unit: "CHF",
    isCurrency: true,
    reverseColor: false,
    format: (v) =>
      `${v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF`,
  },
  {
    key: "risultato_ordinario_chf",
    label: "Risultato d'Esercizio Ordinario",
    unit: "CHF",
    isCurrency: true,
    reverseColor: false,
    format: (v) =>
      `${v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF`,
  },
  {
    key: "population",
    label: "Popolazione Residente",
    unit: "ab.",
    reverseColor: false,
    format: (v) => `${v.toLocaleString("de-CH")} ab.`,
  },
];

export default function ConfrontaPage() {
  // Selezione iniziale: tutti i 19 comuni per una vista panoramica completa
  const [selectedUstCodes, setSelectedUstCodes] = useState<number[]>(
    MUNICIPALITIES.map((m) => m.ust_code)
  );
  const [activeMetricKey, setActiveMetricKey] = useState<MetricKey>("tax_multiplier_pf");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const activeMetric = METRICS.find((m) => m.key === activeMetricKey) || METRICS[0];

  // Helper per ottenere il valore numerico dalla metrica attiva
  function getMetricValue(m: MunicipalityData, key: MetricKey): number {
    switch (key) {
      case "tax_multiplier_pf":
        return m.tax_multiplier_pf;
      case "debito_netto_pc_chf":
        return m.summary_30s.debito_netto_pc_chf;
      case "autofinanziamento_chf":
        return m.summary_30s.autofinanziamento_chf;
      case "investimenti_netti_chf":
        return m.summary_30s.investimenti_netti_chf;
      case "risultato_ordinario_chf":
        return m.summary_30s.risultato_ordinario_chf;
      case "population":
        return m.population;
      default:
        return 0;
    }
  }

  // Preset di selezione rapida
  function selectAll() {
    setSelectedUstCodes(MUNICIPALITIES.map((m) => m.ust_code));
  }

  function selectUrbanPolo() {
    // Locarno (5113), Ascona (5091), Losone (5115), Muralto (5120), Minusio (5118)
    setSelectedUstCodes([5113, 5091, 5115, 5120, 5118]);
  }

  function selectLakeSide() {
    // Ascona (5091), Brissago (5097), Ronco sopra Ascona (5125), Gambarogno (5398)
    setSelectedUstCodes([5091, 5097, 5125, 5398]);
  }

  function selectValleys() {
    // Centovalli (5397), Onsernone (5136), Verzasca (5399), Mergoscia (5117)
    setSelectedUstCodes([5397, 5136, 5399, 5117]);
  }

  function toggleMunicipality(ustCode: number) {
    if (selectedUstCodes.includes(ustCode)) {
      if (selectedUstCodes.length > 2) {
        setSelectedUstCodes(selectedUstCodes.filter((c) => c !== ustCode));
      }
    } else {
      setSelectedUstCodes([...selectedUstCodes, ustCode]);
    }
  }

  // Lista Comuni Selezionati
  const selectedMunicipalities = useMemo(() => {
    return MUNICIPALITIES.filter((m) => selectedUstCodes.includes(m.ust_code));
  }, [selectedUstCodes]);

  // Ordinamento per la visualizzazione
  const sortedMunicipalities = useMemo(() => {
    return [...selectedMunicipalities].sort((a, b) => {
      const valA = getMetricValue(a, activeMetricKey);
      const valB = getMetricValue(b, activeMetricKey);
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [selectedMunicipalities, activeMetricKey, sortDirection]);

  // Calcolo Min e Max per la barra visiva
  const maxVal = Math.max(
    ...selectedMunicipalities.map((m) => Math.abs(getMetricValue(m, activeMetricKey))),
    1
  );

  // Calcolo media del gruppo selezionato
  const groupAverage =
    selectedMunicipalities.reduce(
      (acc, m) => acc + getMetricValue(m, activeMetricKey),
      0
    ) / selectedMunicipalities.length;

  // Esportazione CSV in standard Excel-CH (; delimitatore + BOM UTF-8)
  function handleExportCsv() {
    const headers = [
      "Codice_UST",
      "Comune",
      "Circolo",
      "Abitanti_STATPOP",
      "Moltiplicatore_PF_2026",
      "Moltiplicatore_PG_2026",
      "Risultato_Ordinario_CHF",
      "Autofinanziamento_CHF",
      "Investimenti_Netti_CHF",
      "Debito_Netto_PC_CHF",
      "Conformita_SEL",
      "Tassa_Base_Rifiuti",
      "Ultimo_Atto_Riferimento",
    ];

    const rows = sortedMunicipalities.map((m) => [
      m.ust_code,
      `"${m.name}"`,
      `"${m.circle}"`,
      m.population,
      m.tax_multiplier_pf.toFixed(1),
      m.tax_multiplier_pg.toFixed(1),
      m.summary_30s.risultato_ordinario_chf.toFixed(2),
      m.summary_30s.autofinanziamento_chf.toFixed(2),
      m.summary_30s.investimenti_netti_chf.toFixed(2),
      m.summary_30s.debito_netto_pc_chf.toFixed(2),
      `"${m.summary_30s.sel_conformity}"`,
      `"${m.waste_base_fee}"`,
      `"${m.summary_30s.latest_mm_reference}"`,
    ]);

    const csvContent =
      "\uFEFF" + // BOM UTF-8 per corretta apertura in Microsoft Excel
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `ofcl-confronto-comuni-${activeMetricKey}-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Comparatore */}
      <header className="bg-gradient-to-b from-[#0F3854]/10 via-transparent to-transparent pt-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna alla Dashboard</span>
            </Link>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F3854]/10 dark:bg-cyan-950/40 border border-[#0F3854]/20 dark:border-cyan-500/30 text-[#0F3854] dark:text-cyan-300 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Analisi Comparata MCA2 · Distretto di Locarno</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Comparatore Finanziario dei Comuni
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                Confronta fino a 19 Comuni locarnesi su indicatori armonizzati MCA2, moltiplicatori fiscali,
                autofinanziamento e debito pro capite con scale ufficiali SEL.
              </p>
            </div>

            {/* Bottone Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
            >
              <Download className="w-4 h-4 text-[#00A3C4]" />
              <span>Esporta Dati Confronto (Excel-CH)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Pannello Selezione Filtri e Comuni */}
        <section
          aria-labelledby="filter-section"
          className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-4"
        >
          {/* Preset Rapidi */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5 text-[#00A3C4]" />
              <span>Filtri Rapidi Territoriali:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Tutti i 19 Comuni
              </button>
              <button
                type="button"
                onClick={selectUrbanPolo}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Polo Urbano (5)
              </button>
              <button
                type="button"
                onClick={selectLakeSide}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Lago & Sponde (4)
              </button>
              <button
                type="button"
                onClick={selectValleys}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Valli (4)
              </button>
            </div>
          </div>

          {/* Griglia Checkbox Comuni */}
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>Seleziona i Comuni da confrontare ({selectedUstCodes.length} / 19 attivi):</span>
              <span className="text-[11px] font-mono text-slate-400">Min. 2 comuni</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUNICIPALITIES.map((m) => {
                const isSelected = selectedUstCodes.includes(m.ust_code);
                return (
                  <button
                    key={m.ust_code}
                    type="button"
                    onClick={() => toggleMunicipality(m.ust_code)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0F3854] text-white border-[#0F3854] shadow-xs"
                        : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-cyan-300 shrink-0" />}
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Selettore Metrica Attiva */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Metrica di Confronto:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-xs overflow-x-auto max-w-full">
              {METRICS.map((met) => (
                <button
                  key={met.key}
                  type="button"
                  onClick={() => setActiveMetricKey(met.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activeMetricKey === met.key
                      ? "bg-[#0F3854] text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {met.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#00A3C4]" />
              <span>Ordinamento: {sortDirection === "asc" ? "Crescente" : "Decrescente"}</span>
            </button>
          </div>
        </section>

        {/* Grafico a Barre Orizzontali Comparativo */}
        <section
          aria-labelledby="chart-section"
          className="bento-card p-6 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="chart-section" className="text-base font-bold text-slate-900 dark:text-white">
                Classifica Comparativa: {activeMetric.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Media del gruppo selezionato:{" "}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {activeMetric.format(groupAverage)}
                </strong>
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {sortedMunicipalities.length} Comuni
            </span>
          </div>

          <div className="space-y-2 pt-2">
            {sortedMunicipalities.map((m, index) => {
              const val = getMetricValue(m, activeMetricKey);
              const absVal = Math.abs(val);
              const pct = Math.min(100, Math.max(4, (absVal / maxVal) * 100));

              // Valutazione colore barra
              let barColor = "bg-[#0F3854]";
              if (activeMetricKey === "tax_multiplier_pf") {
                barColor = val <= 75 ? "bg-emerald-500" : val <= 88 ? "bg-amber-500" : "bg-red-500";
              } else if (activeMetricKey === "debito_netto_pc_chf") {
                barColor = val < 2500 ? "bg-emerald-500" : val <= 5000 ? "bg-amber-500" : "bg-red-500";
              } else if (activeMetricKey === "risultato_ordinario_chf") {
                barColor = val >= 0 ? "bg-emerald-500" : "bg-red-500";
              }

              return (
                <div key={m.ust_code} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400 w-5">
                        {index + 1}°
                      </span>
                      <Link
                        href={`/comuni/${m.slug}`}
                        className="font-bold text-slate-800 dark:text-slate-200 hover:text-[#00A3C4] transition-colors"
                      >
                        {m.name}
                      </Link>
                      <span className="text-[10px] text-slate-400">({m.circle})</span>
                      {m.has_differentiated_pg && activeMetricKey === "tax_multiplier_pf" && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          PG: {m.tax_multiplier_pg}%
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {activeMetric.format(val)}
                    </div>
                  </div>

                  {/* Barra visiva */}
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabella Comparativa Multi-Colonna Dettagliata */}
        <section
          aria-labelledby="table-section"
          className="bento-card overflow-hidden bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-sm"
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 id="table-section" className="text-sm font-bold text-slate-900 dark:text-white">
              Tabella Comparata Integrale ({sortedMunicipalities.length} Comuni)
            </h2>
            <span className="text-xs font-mono text-slate-400">Precisione MCA2 al centesimo (0.01 CHF)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Comune</th>
                  <th className="py-3 px-3 text-right">Abitanti</th>
                  <th className="py-3 px-3 text-right">Moltiplicatore</th>
                  <th className="py-3 px-3 text-right">Risultato Ord.</th>
                  <th className="py-3 px-3 text-right">Autofinanz.</th>
                  <th className="py-3 px-3 text-right">Debito p.c.</th>
                  <th className="py-3 px-3 text-center">SEL</th>
                  <th className="py-3 px-3 text-right">Tassa Rifiuti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {sortedMunicipalities.map((m) => {
                  const isAvanzo = m.summary_30s.risultato_ordinario_chf >= 0;
                  return (
                    <tr
                      key={m.ust_code}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                        <Link
                          href={`/comuni/${m.slug}`}
                          className="hover:text-[#00A3C4] transition-colors flex items-center gap-1.5"
                        >
                          <span>{m.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            ({m.ust_code})
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {m.population.toLocaleString("de-CH")}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#0F3854] dark:text-cyan-400 font-bold">
                        {m.tax_multiplier_pf}%
                        {m.has_differentiated_pg && (
                          <span className="text-[9px] text-amber-600 block font-normal">
                            PG {m.tax_multiplier_pg}%
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-3 text-right tabular-nums font-semibold ${
                          isAvanzo
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isAvanzo ? "+" : ""}
                        {(m.summary_30s.risultato_ordinario_chf / 1000).toFixed(0)}k
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {(m.summary_30s.autofinanziamento_chf / 1000).toFixed(0)}k
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-800 dark:text-slate-200 font-bold">
                        {m.summary_30s.debito_netto_pc_chf.toLocaleString("de-CH", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{" "}
                        CHF
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          {m.summary_30s.sel_conformity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-500 font-sans text-[11px]">
                        {m.waste_base_fee}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Note Metodologiche e Avviso Perimetro ex art. 192 LOC */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Avvertenza di Riconciliazione ed Omogeneità di Confronto:</span>
          </div>
          <p className="leading-relaxed">
            I dati contabili armonizzati (MCA2) possono riflettere perimetri aziendali differenti: alcuni Comuni
            amministrano direttamente le proprie aziende acqua potabile o energia (es. Ascona, Ronco sopra Ascona, Locarno),
            mentre altri aderiscono a consorzi o terziarizzano i servizi. Fanno fede unicamente i fascicoli originali esposti
            all&apos;Albo ex art. 192 LOC.
          </p>
        </div>
      </main>
    </div>
  );
}
