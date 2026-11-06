"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MUNICIPALITIES, type MunicipalityData } from "@/data/municipalities";
import {
  ArrowLeft,
  ArrowUpDown,
  Download,
  Building2,
  Users,
  Percent,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
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
  reverseColor?: boolean;
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
  const [selectedUstCodes, setSelectedUstCodes] = useState<number[]>(
    MUNICIPALITIES.map((m) => m.ust_code)
  );
  const [activeMetricKey, setActiveMetricKey] = useState<MetricKey>("tax_multiplier_pf");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const activeMetric = METRICS.find((m) => m.key === activeMetricKey) ?? METRICS[0];

  function toggleMunicipality(ustCode: number) {
    setSelectedUstCodes((prev) => {
      if (prev.includes(ustCode)) {
        if (prev.length <= 2) return prev;
        return prev.filter((c) => c !== ustCode);
      } else {
        return [...prev, ustCode];
      }
    });
  }

  function selectAll() {
    setSelectedUstCodes(MUNICIPALITIES.map((m) => m.ust_code));
  }

  function selectUrbanPolo() {
    setSelectedUstCodes([5113, 5091, 5115, 5120, 5118]);
  }

  function selectLakeSide() {
    setSelectedUstCodes([5091, 5097, 5125, 5398]);
  }

  function selectValleys() {
    setSelectedUstCodes([5397, 5136, 5399, 5117]);
  }

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

  const selectedMunicipalities = useMemo(() => {
    return MUNICIPALITIES.filter((m) => selectedUstCodes.includes(m.ust_code));
  }, [selectedUstCodes]);

  const sortedMunicipalities = useMemo(() => {
    return [...selectedMunicipalities].sort((a, b) => {
      const valA = getMetricValue(a, activeMetricKey);
      const valB = getMetricValue(b, activeMetricKey);
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [selectedMunicipalities, activeMetricKey, sortDirection]);

  const maxVal = Math.max(
    ...selectedMunicipalities.map((m) => Math.abs(getMetricValue(m, activeMetricKey))),
    1
  );

  const groupAverage =
    selectedMunicipalities.reduce(
      (acc, m) => acc + getMetricValue(m, activeMetricKey),
      0
    ) / selectedMunicipalities.length;

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
      "\uFEFF" +
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
    <div className="space-y-6 pb-12">
      {/* Intestazione Comparatore */}
      <header className="ofl-card p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e232b] text-white text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Analisi Comparata MCA2 · Distretto di Locarno</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Comparatore Finanziario dei Comuni
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
              Confronta fino a 19 Comuni locarnesi su indicatori armonizzati MCA2, moltiplicatori fiscali,
              autofinanziamento e debito pro capite con scale ufficiali SEL.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="ofl-btn-frost inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 self-start md:self-auto"
          >
            <Download className="w-4 h-4 text-cyan-700" />
            <span>Esporta Dati Confronto (Excel-CH)</span>
          </button>
        </div>
      </header>

      {/* Pannello Selezione Filtri e Comuni */}
      <section aria-labelledby="filter-section" className="ofl-card p-5 space-y-4">
        {/* Preset Rapidi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-300 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Filter className="w-3.5 h-3.5 text-cyan-700" />
            <span>Filtri Rapidi Territoriali:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              Tutti i 19 Comuni
            </button>
            <button
              type="button"
              onClick={selectUrbanPolo}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              Polo Urbano (5)
            </button>
            <button
              type="button"
              onClick={selectLakeSide}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              Lago & Sponde (4)
            </button>
            <button
              type="button"
              onClick={selectValleys}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
            >
              Valli (4)
            </button>
          </div>
        </div>

        {/* Griglia Checkbox Comuni */}
        <div>
          <div className="text-xs text-slate-600 mb-2 flex items-center justify-between font-medium">
            <span>Seleziona i Comuni da confrontare ({selectedUstCodes.length} / 19 attivi):</span>
            <span className="text-[11px] font-mono text-slate-500">Min. 2 comuni</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MUNICIPALITIES.map((m) => {
              const isSelected = selectedUstCodes.includes(m.ust_code);
              return (
                <button
                  key={m.ust_code}
                  type="button"
                  onClick={() => toggleMunicipality(m.ust_code)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1e232b] text-white border-[#1e232b] shadow-xs"
                      : "bg-white/80 border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Selettore Metrica Attiva */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Metrica di Confronto:
          </span>
          <div className="inline-flex rounded-xl border border-slate-300 bg-white/70 p-1 shadow-xs overflow-x-auto max-w-full gap-1">
            {METRICS.map((met) => (
              <button
                key={met.key}
                type="button"
                onClick={() => setActiveMetricKey(met.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeMetricKey === met.key
                    ? "bg-[#1e232b] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/50"
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
            className="ofl-btn-frost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-700" />
            <span>Ordinamento: {sortDirection === "asc" ? "Crescente" : "Decrescente"}</span>
          </button>
        </div>
      </section>

      {/* Grafico a Barre Orizzontali Comparativo */}
      <section aria-labelledby="chart-section" className="ofl-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="chart-section" className="text-sm font-bold text-slate-900">
              Classifica Comparativa: {activeMetric.label}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Media del gruppo selezionato:{" "}
              <strong className="font-mono text-slate-900 font-bold">
                {activeMetric.format(groupAverage)}
              </strong>
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            {sortedMunicipalities.length} Comuni
          </span>
        </div>

        <div className="space-y-2 pt-2">
          {sortedMunicipalities.map((m, index) => {
            const val = getMetricValue(m, activeMetricKey);
            const absVal = Math.abs(val);
            const pct = Math.min(100, Math.max(4, (absVal / maxVal) * 100));

            let barColor = "bg-[#0F3854]";
            if (activeMetricKey === "tax_multiplier_pf") {
              barColor = val <= 75 ? "bg-emerald-600" : val <= 88 ? "bg-amber-600" : "bg-red-600";
            } else if (activeMetricKey === "debito_netto_pc_chf") {
              barColor = val < 2500 ? "bg-emerald-600" : val <= 5000 ? "bg-amber-600" : "bg-red-600";
            } else if (activeMetricKey === "risultato_ordinario_chf") {
              barColor = val >= 0 ? "bg-emerald-600" : "bg-red-600";
            }

            return (
              <div key={m.ust_code} className="group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 w-5 font-semibold">
                      {index + 1}°
                    </span>
                    <Link
                      href={`/comuni/${m.slug}`}
                      className="font-bold text-slate-900 hover:text-cyan-700 transition-colors"
                    >
                      {m.name}
                    </Link>
                    <span className="text-[10px] text-slate-500">({m.circle})</span>
                    {m.has_differentiated_pg && activeMetricKey === "tax_multiplier_pf" && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                        PG: {m.tax_multiplier_pg}%
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-bold tabular-nums text-slate-950">
                    {activeMetric.format(val)}
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-300/80 overflow-hidden flex">
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
      <section aria-labelledby="table-section" className="ofl-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-300 flex items-center justify-between">
          <h2 id="table-section" className="text-sm font-bold text-slate-900">
            Tabella Comparata Integrale ({sortedMunicipalities.length} Comuni)
          </h2>
          <span className="text-xs font-mono text-slate-600 font-medium">Precisione MCA2 al centesimo (0.01 CHF)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-900/5 text-[11px] font-bold uppercase text-slate-600">
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
            <tbody className="divide-y divide-slate-200 font-mono">
              {sortedMunicipalities.map((m) => {
                const isAvanzo = m.summary_30s.risultato_ordinario_chf >= 0;
                return (
                  <tr
                    key={m.ust_code}
                    className="hover:bg-slate-900/5 transition-colors"
                  >
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">
                      <Link
                        href={`/comuni/${m.slug}`}
                        className="hover:text-cyan-700 transition-colors flex items-center gap-1.5"
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-normal">
                          ({m.ust_code})
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-700 font-semibold">
                      {m.population.toLocaleString("de-CH")}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#0F3854] font-black">
                      {m.tax_multiplier_pf}%
                      {m.has_differentiated_pg && (
                        <span className="text-[9px] text-amber-700 block font-normal">
                          PG {m.tax_multiplier_pg}%
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-bold ${
                        isAvanzo ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {isAvanzo ? "+" : ""}
                      {(m.summary_30s.risultato_ordinario_chf / 1000).toFixed(0)}k
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-800 font-semibold">
                      {(m.summary_30s.autofinanziamento_chf / 1000).toFixed(0)}k
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-950 font-bold">
                      {m.summary_30s.debito_netto_pc_chf.toLocaleString("de-CH", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}{" "}
                      CHF
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {m.summary_30s.sel_conformity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-600 font-sans text-[11px]">
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
      <div className="ofl-card p-4 text-xs text-slate-700 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-900 font-bold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Avvertenza di Riconciliazione ed Omogeneità di Confronto:</span>
        </div>
        <p className="leading-relaxed text-slate-600">
          I dati contabili armonizzati (MCA2) possono riflettere perimetri aziendali differenti: alcuni Comuni
          amministrano direttamente le proprie aziende acqua potabile o energia (es. Ascona, Ronco sopra Ascona, Locarno),
          mentre altri aderiscono a consorzi o terziarizzano i servizi. Fanno fede unicamente i fascicoli originali esposti
          all&apos;Albo ex art. 192 LOC.
        </p>
      </div>
    </div>
  );
}
