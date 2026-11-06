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

export interface CivicDeepDiveBentoProps {
  municipality: MunicipalityData;
}

export function CivicDeepDiveBento({ municipality }: CivicDeepDiveBentoProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-[#00A3C4]/10 text-[#00A3C4] dark:text-cyan-300">
            <Info className="w-4 h-4" />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vivere a {municipality.name}: Tasse, Servizi, Famiglie & Territorio
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Quadro civico dei costi obbligatori e dei servizi municipali garantiti per residenti e famiglie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quadrante A: Tariffe di Causalità & Costi Obbligatori */}
        <div className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tariffe di Causalità & Rifiuti
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Tassa Base Rifiuti</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {municipality.waste_base_fee}
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Sacco Rifiuti Ufficiale (35L)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">1.30 CHF</span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Acqua Potabile & Fognature</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  Azienda Acqua ({municipality.circle})
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Imposta Immobiliare Comunale</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {municipality.slug === "losone" ? "0.0 ‰" : "1.0..1.5 ‰"}
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Tassa Cani Annuale</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">100.00 CHF</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
            Regolamento tariffe di causalità approvato
          </div>
        </div>

        {/* Quadrante B: Sostegno alle Famiglie, Infanzia & Educazione */}
        <div className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                <Baby className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Famiglie, Infanzia & Scuola
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Assegno Comunale di Nascita</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  500.00 CHF / neonato
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Nido d&apos;Infanzia & Parascolastico</span>
                <span className="text-slate-700 dark:text-slate-300">Tariffa calmierata per reddito</span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Mense Scolastiche</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">8.00–10.00 CHF / pasto</span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Sussidi Attività Sport & Musica</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  Fino a 200 CHF / giovane
                </span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
            Contributi integrativi ai sussidi cantonali
          </div>
        </div>

        {/* Quadrante C: Terza Età, Inclusione Sociale & Salute */}
        <div className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Terza Età, Salute & Sociale
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Pasti a Domicilio Spitex</span>
                <span className="text-slate-700 dark:text-slate-300">Servizio attivo su richiesta</span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Agevolazioni Lidi & Balneazione</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Sconti per residenti AVS/AI
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Trasporto Sociale Anziani</span>
                <span className="text-slate-700 dark:text-slate-300">Accompagnamento visite mediche</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
            In collaborazione con i consorzi sanitari regionali
          </div>
        </div>

        {/* Quadrante D: Sostenibilità Energetica, Clima & Trasporti */}
        <div className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Clima, Energia & Mobilità
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Fondo Comunale per l&apos;Energia</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Incentivi solare & termopompe
                </span>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-600 dark:text-slate-400">Abbonamento Arcobaleno TPL</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  Contributo per giovani residenti
                </span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Smaltimento Scarti Vegetali</span>
                <span className="text-slate-700 dark:text-slate-300">Ecocentro comunale gratuito</span>
              </li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
            Cumulabile con incentivi cantonali FER Ticino
          </div>
        </div>

        {/* Quadrante E: Sportello & Informazioni Istituzionali */}
        <div className="bento-card p-5 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Building className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sportello Comunale & Recapiti Ufficiali
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">Sede Municipale</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {municipality.seat}
                </p>
                <div className="mt-2 text-slate-600 dark:text-slate-400">
                  Circolo elettorale e giudiziario di {municipality.circle}
                </div>
              </div>

              <div>
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">Enti & Aziende Amministrate</span>
                <ul className="space-y-1">
                  {municipality.entities.map((e, idx) => (
                    <li key={idx} className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00A3C4] shrink-0" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Fanno fede gli atti esposti all&apos;Albo ex art. 192 LOC</span>
            <span className="font-mono">Codice UST {municipality.ust_code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
