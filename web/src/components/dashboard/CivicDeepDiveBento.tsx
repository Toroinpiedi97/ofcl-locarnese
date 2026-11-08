"use client";

import { useState } from "react";
import type { MunicipalityData } from "@/data/municipalities";
import {
  Trash2,
  Baby,
  HeartHandshake,
  Sun,
  Building,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CivicDeepDiveBentoProps {
  municipality: MunicipalityData;
  className?: string;
}

type BentoFilter = "all" | "waste" | "families" | "social" | "climate" | "desk";

export function CivicDeepDiveBento({
  municipality,
  className = "",
}: CivicDeepDiveBentoProps) {
  const [activeFilter, setActiveFilter] = useState<BentoFilter>("all");

  const filterButtons: { id: BentoFilter; label: string }[] = [
    { id: "all", label: "Tutti i 5 Ambiti" },
    { id: "waste", label: "Rifiuti & Tariffe" },
    { id: "families", label: "Famiglie & Scuola" },
    { id: "social", label: "Terza Età & Sociale" },
    { id: "climate", label: "Clima & Mobilità" },
    { id: "desk", label: "Sportello Comunale" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#00A3C4]/10 text-[#00A3C4]">
            <Info className="w-4 h-4" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
            Vivere a {municipality.name}: Tasse, Servizi, Famiglie & Territorio
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Quadro civico dei costi obbligatori e dei servizi municipali garantiti per residenti e famiglie.
        </p>
      </div>

      {/* Pill Filter Bar per Mobile & Tablet Rapido */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none sm:hidden">
        {filterButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setActiveFilter(btn.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === btn.id
                ? "bg-[#0F3854] text-white shadow-xs"
                : "bg-white/80 text-slate-700 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quadrante A: Tariffe di Causalità & Costi Obbligatori */}
        <div
          className={cn(
            "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-w-0 transition-all",
            activeFilter !== "all" && activeFilter !== "waste" && "hidden sm:flex"
          )}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Tariffe di Causalità & Rifiuti
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Tassa Base Rifiuti</span>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  {municipality.civic_tariffs.waste_base_fee}
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Sacco Rifiuti Ufficiale (35L)</span>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  {municipality.civic_tariffs.waste_bag_35l_chf.toFixed(2)} CHF
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Acqua Potabile & Fognature</span>
                <span className="font-mono text-slate-700 shrink-0 text-right">
                  Azienda Acqua ({municipality.circle})
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Imposta Immobiliare Comunale</span>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  {municipality.civic_tariffs.real_estate_tax_permille.toFixed(1)} ‰
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600">Tassa Cani Annuale</span>
                <span className="font-mono font-bold text-slate-900 shrink-0">
                  {municipality.civic_tariffs.dog_tax_chf.toFixed(2)} CHF
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10px] text-slate-600">
            Regolamento tariffe di causalità approvato
          </div>
        </div>

        {/* Quadrante B: Sostegno alle Famiglie, Infanzia & Educazione */}
        <div
          className={cn(
            "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-w-0 transition-all",
            activeFilter !== "all" && activeFilter !== "families" && "hidden sm:flex"
          )}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 shrink-0">
                <Baby className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Famiglie, Infanzia & Scuola
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="min-w-0">
                  <span className="text-slate-600 block">Assegno Parentale di Nascita</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Cantonale IAS (RL 856.100, RFL &lt; 110k, sostanza &lt; 400k)
                  </span>
                </div>
                <span className="font-mono font-bold text-emerald-700 shrink-0 text-right">
                  {municipality.civic_tariffs.birth_bonus_chf.toLocaleString("it-CH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  CHF
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Nido d&apos;Infanzia & Parascolastico</span>
                <span className="text-slate-800 text-right shrink-0">Tariffa calmierata per reddito</span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Mense Scolastiche</span>
                <span className="font-mono text-slate-800 shrink-0">
                  {municipality.civic_tariffs.canteen_meal_chf.toFixed(2)} CHF / pasto
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600">Sussidi Attività Sport & Musica</span>
                <span className="font-mono font-bold text-emerald-700 shrink-0">
                  Fino a 200 CHF / giovane
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10px] text-slate-600">
            Richieste tramite Sportello LAPS e Agenzia AVS comunale entro 6 mesi
          </div>
        </div>

        {/* Quadrante C: Terza Età, Inclusione Sociale & Salute */}
        <div
          className={cn(
            "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-w-0 transition-all",
            activeFilter !== "all" && activeFilter !== "social" && "hidden sm:flex"
          )}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Terza Età, Salute & Sociale
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Pasti a Domicilio Spitex</span>
                <span className="text-slate-800 text-right">Servizio attivo su richiesta</span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Agevolazioni Lidi & Balneazione</span>
                <span className="font-semibold text-emerald-700 text-right">
                  Sconti per residenti AVS/AI
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600">Trasporto Sociale Anziani</span>
                <span className="text-slate-800 text-right">Accompagnamento visite mediche</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10px] text-slate-600">
            In collaborazione con i consorzi sanitari regionali
          </div>
        </div>

        {/* Quadrante D: Sostenibilità Energetica, Clima & Trasporti */}
        <div
          className={cn(
            "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden min-w-0 transition-all",
            activeFilter !== "all" && activeFilter !== "climate" && "hidden sm:flex"
          )}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Clima, Energia & Mobilità
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Fondo Comunale per l&apos;Energia</span>
                <span className="font-semibold text-emerald-700 text-right">
                  {municipality.civic_tariffs.climate_fund_active
                    ? "Incentivi comunali solare & termopompe"
                    : "Sussidi cantonali FER Ticino"}
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-600">Abbonamento Arcobaleno TPL</span>
                <span className="font-mono text-slate-800 text-right">
                  Contributo per giovani residenti
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600">Smaltimento Scarti Vegetali</span>
                <span className="text-slate-800 text-right">Ecocentro comunale gratuito</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/80 text-[10px] text-slate-600">
            Cumulabile con incentivi cantonali FER Ticino
          </div>
        </div>

        {/* Quadrante E: Sportello & Informazioni Istituzionali */}
        <div
          className={cn(
            "ofl-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between md:col-span-2 lg:col-span-2 overflow-hidden min-w-0 transition-all",
            activeFilter !== "all" && activeFilter !== "desk" && "hidden sm:flex"
          )}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <Building className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Sportello Comunale & Recapiti Ufficiali
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-600 block mb-0.5">Sede Municipale</span>
                <p className="font-semibold text-slate-900">
                  {municipality.seat}
                </p>
                <div className="mt-2 text-slate-600">
                  Circolo elettorale e giudiziario di {municipality.circle}
                </div>
              </div>

              <div>
                <span className="text-slate-600 block mb-0.5">Enti & Aziende Amministrate</span>
                <ul className="space-y-1">
                  {municipality.entities.map((e, idx) => (
                    <li key={idx} className="font-mono text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00A3C4] shrink-0" />
                      <span className="truncate">{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-2">
            <span>Fanno fede gli atti esposti all&apos;Albo ex art. 192 LOC</span>
            <span className="font-mono font-semibold text-slate-800">Codice UST {municipality.ust_code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
