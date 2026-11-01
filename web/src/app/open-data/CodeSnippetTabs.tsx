"use client";

import { useState } from "react";
import { Check, Copy, Terminal, FileCode2, Sheet } from "lucide-react";

interface Snippet {
  id: string;
  label: string;
  icon: typeof Terminal;
  lang: string;
  code: string;
}

const SNIPPETS: Snippet[] = [
  {
    id: "curl",
    label: "cURL",
    icon: Terminal,
    lang: "bash",
    code: `# 1. Lista Comuni con moltiplicatori e indicatori
curl -s "https://dati.ofcl.ch/api/v1/comuni" \\
  -H "Accept: application/json"

# 2. Riassunto Generale per un comune (es. Locarno 5113)
curl -s "https://dati.ofcl.ch/api/v1/riassunto?comune=5113&anno=2025"

# 3. 8 Indicatori Ufficiali SEL
curl -s "https://dati.ofcl.ch/api/v1/indicatori?comune=locarno"

# 4. Crediti d'opera e sorpassi ex art. 15 LOC
curl -s "https://dati.ofcl.ch/api/v1/crediti?overrun_only=true"`,
  },
  {
    id: "python",
    label: "Python (pandas)",
    icon: FileCode2,
    lang: "python",
    code: `import pandas as pd
import requests

# Opzione A: Lettura diretta del file Parquet (massima velocità e tipi esatti)
df_bilanci = pd.read_parquet("https://dati.ofcl.ch/data/opendata/bilanci_mca2.parquet")
print(df_bilanci.head())

# Opzione B: Query REST API v1
url = "https://dati.ofcl.ch/api/v1/indicatori"
res = requests.get(url, headers={"Accept": "application/json"})
data = res.json()
df_sel = pd.DataFrame(data["data"])
print(df_sel[["comune", "indicatore_codice", "valore", "conforme_sel"]])`,
  },
  {
    id: "r",
    label: "R (tidyverse)",
    icon: FileCode2,
    lang: "r",
    code: `library(tidyverse)
library(jsonlite)

# Opzione A: Download e lettura CSV standard (separatore virgola)
url_csv <- "https://dati.ofcl.ch/data/opendata/bilanci_mca2.csv"
bilanci <- read_csv(url_csv)
glimpse(bilanci)

# Opzione B: Chiamata API REST
api_data <- fromJSON("https://dati.ofcl.ch/api/v1/indicatori")
indicatori <- as_tibble(api_data$data)
filter(indicatori, conforme_sel == FALSE)`,
  },
  {
    id: "excel",
    label: "Excel-CH",
    icon: Sheet,
    lang: "text",
    code: `/* ISTRUZIONI PER EXCEL SVIZZERO (Punto e Virgola + BOM UTF-8) */

1. Scarica direttamente il file 'bilanci_mca2_excel_ch.csv'
   oppure da Excel: Dati -> Da Testo/CSV.
2. Formato codifica: 65001: Unicode (UTF-8) con BOM pre-applicato.
3. Delimitatore: Punto e virgola (;)
4. Separatore decimali: Punto (.) conforme alle convenzioni valutarie CHF.

Oppure importa via Web Query (Power Query):
Origine: https://dati.ofcl.ch/api/v1/comuni`,
  },
];

export function CodeSnippetTabs() {
  const [activeTab, setActiveTab] = useState("curl");
  const [copied, setCopied] = useState(false);

  const current = SNIPPETS.find((s) => s.id === activeTab) || SNIPPETS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden shadow-sm">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-2">
        <div className="flex gap-1">
          {SNIPPETS.map((snippet) => {
            const Icon = snippet.icon;
            const isActive = snippet.id === activeTab;
            return (
              <button
                key={snippet.id}
                onClick={() => setActiveTab(snippet.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-red-500" />
                {snippet.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Copia codice negli appunti"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiato!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copia</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
        <code>{current.code}</code>
      </pre>
    </div>
  );
}
