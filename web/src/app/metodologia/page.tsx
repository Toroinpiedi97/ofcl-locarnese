import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Scale,
  ShieldCheck,
  TrendingUp,
  Coins,
  Building2,
  Table,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metodologia di Quadratura MCA2 & Indicatori SEL · OFCL",
  description:
    "Standard contabile MCA2 per i Comuni del Cantone Ticino, 12 verifiche formali di quadratura V01-V12 e gli 8 indicatori finanziari ufficiali SEL.",
};

const BALANCING_RULES = [
  {
    code: "V01",
    name: "Quadratura Stadio 1 Conto Economico",
    formula: "Saldo_{S1} = \\sum Ricavi_{(40..48)} - \\sum Spese_{(30..38)}",
    desc: "Il saldo operativo corrente deve corrispondere esattamente alla differenza tra ricavi operativi e spese operative.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V02",
    name: "Quadratura Stadio 2 Conto Economico",
    formula: "Saldo_{S2} = Saldo_{S1} + (Ricavi_{49} - Spese_{39})",
    desc: "Il risultato d'esercizio ordinario incorpora i proventi e oneri finanziari e straordinari.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V03",
    name: "Risultato Totale Stadio 3",
    formula: "Saldo_{S3} = Saldo_{S2} + Variazione\\ Accantonamenti",
    desc: "Riconciliazione del risultato contabile finale post-attribuzioni al capitale proprio.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V04",
    name: "Investimenti Netti Annuali",
    formula: "Investimenti_{netti} = \\sum Spese_{(50..58)} - \\sum Entrate_{(60..68)}",
    desc: "Differenza esatta tra uscite per investimenti in beni amministrativi e contributi/sussidi riscossi.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V05",
    name: "Autofinanziamento MCA2 (Cash Flow)",
    formula: "Autofinanz. = Risultato_{S2} + Ammortamenti_{(33)} + Accantonamenti",
    desc: "Misura la capacità di generare risorse finanziarie proprie per finanziare gli investimenti.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V06",
    name: "Insufficienza o Avanzo di Finanziamento",
    formula: "Saldo_{fin} = Autofinanziamento - Investimenti_{netti}",
    desc: "Se positivo indica che gli investimenti sono interamente coperti dalle entrate correnti.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V07",
    name: "Variazione del Debito Netto",
    formula: "\\Delta Debito_{netto} = - Saldo_{fin} + Variazioni\\ Patrimoniali",
    desc: "La variazione della posizione debitoria deve pareggiare il bilancio del finanziamento.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V08",
    name: "Controllo Spese per il Personale (Gruppo 30)",
    formula: "Spese_{30} = \\sum Sottoconti_{(300..309)}",
    desc: "Somma al centesimo di stipendi, oneri sociali e previdenziali del personale comunale.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V09",
    name: "Controllo Spese per Beni e Servizi (Gruppo 31)",
    formula: "Spese_{31} = \\sum Sottoconti_{(310..319)}",
    desc: "Manutenzioni, consumi energetici, consulenze e acquisti correnti d'esercizio.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V10",
    name: "Controllo Trasferimenti Correnti (Gruppo 36)",
    formula: "Spese_{36} = \\sum Sottoconti_{(360..369)}",
    desc: "Contributi a consorzi, riversamenti cantone e sussidi a enti terzi.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V11",
    name: "Controllo Entrate Fiscali Ordinarie (Gruppo 40)",
    formula: "Ricavi_{40} = Imposte_{base} \\times Moltiplicatore + Altre\\ Imposte",
    desc: "Verifica della coerenza tra gettito d'imposta stimato/consuntivato e moltiplicatore approvato.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V12",
    name: "Chiusura Bilancio Patrimoniale (Attivi = Passivi)",
    formula: "\\sum Attivi_{(10..14)} = \\sum Passivi_{(20..29)}",
    desc: "Pareggio perfetto al centesimo tra capitale patrimoniale/amministrativo e impegni/capitale proprio.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
];

const SEL_INDICATORS_DOCS = [
  {
    code: "SELF_FINANCING_DEGREE",
    name: "Grado di Autofinanziamento",
    formula: "(Autofinanziamento / Investimenti netti) * 100",
    unit: "%",
    thresholds: "> 100% Ottimo (🟢) · 70–100% Medio (🟡) · < 70% Debole (🔴)",
    desc: "Misura la quota di investimenti netti che il Comune è in grado di pagare con le proprie risorse ordinarie, senza ricorrere a nuovo debito.",
  },
  {
    code: "SELF_FINANCING_SHARE",
    name: "Quota di Autofinanziamento",
    formula: "(Autofinanziamento / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "> 20% Buona (🟢) · 10–20% Media (🟡) · < 10% Debole (🔴)",
    desc: "Quota dei ricavi correnti che residua a fine esercizio ed è disponibile per gli investimenti patrimoniali o per l'ammortamento del debito.",
  },
  {
    code: "INTEREST_BURDEN_SHARE",
    name: "Carico degli Interessi Passivi",
    formula: "(Interessi passivi netti / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "< 4% Basso (🟢) · 4–9% Medio (🟡) · > 9% Elevato (🔴)",
    desc: "Indica quanto gli oneri per il servizio del debito comprimono il margine di manovra del bilancio comunale ordinario.",
  },
  {
    code: "AMORTIZATION_SHARE",
    name: "Quota degli Ammortamenti",
    formula: "(Ammortamenti ordinari / Spese correnti) * 100",
    unit: "%",
    thresholds: "Valutazione contestualizzata al patrimonio investito",
    desc: "Riflette l'usura del patrimonio amministrativo e la velocità con cui il Comune rinnova le proprie infrastrutture.",
  },
  {
    code: "NET_DEBT_RATIO",
    name: "Tasso d'Indebitamento Netto",
    formula: "(Debito netto / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "< 100% Solido (🟢) · 100–150% Attenzione (🟡) · > 150% Critico (🔴)",
    desc: "Rapporto tra l'indebitamento netto effettivo e i ricavi ordinari comunali.",
  },
  {
    code: "NET_DEBT_PER_CAPITA",
    name: "Debito Netto pro capite",
    formula: "Debito netto / Popolazione residente",
    unit: "CHF/ab",
    thresholds: "< 2'500 Buono (🟢) · 2'500–5'000 Medio (🟡) · > 5'000 Elevato (🔴)",
    desc: "Ammontare del debito netto gravante su ciascun residente permanente.",
  },
  {
    code: "INVESTMENT_RATIO",
    name: "Quota degli Investimenti",
    formula: "(Investimenti netti / Spese correnti) * 100",
    unit: "%",
    thresholds: "> 25% Intensa (🟢) · 15–25% Media (🟡) · < 15% Debole (🔴)",
    desc: "Volume dell'attività d'investimento annuale rispetto alla spesa per la gestione ordinaria.",
  },
  {
    code: "EQUITY_RATIO",
    name: "Quota del Capitale Proprio",
    formula: "(Capitale proprio / Totale passivi) * 100",
    unit: "%",
    thresholds: "> 40% Buona (🟢) · 20–40% Media (🟡) · < 20% Debole (🔴)",
    desc: "Grado di indipendenza finanziaria e consistenza delle riserve patrimoniali del Comune.",
  },
];

export default function MetodologiaPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="ofl-card p-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e232b] text-white text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Standard Contabile MCA2 · Sezione Enti Locali (SEL)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Metodologia di Quadratura MCA2 & Indicatori SEL
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-3xl leading-relaxed">
            La guida formale al modello contabile pubblico dei Comuni ticinesi: la struttura dei tre stadi del conto economico,
            le 12 regole matematiche di quadratura al centesimo (V01–V12) e le soglie ufficiali di valutazione finanziaria SEL.
          </p>
        </div>
      </header>

      <main className="space-y-6">
        {/* Sezione 1: Il Modello Contabile MCA2 */}
        <section className="ofl-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-cyan-700" />
            <h2 className="text-base font-bold text-slate-900">
              1. L&apos;Architettura Contabile Armonizzata (MCA2)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            In conformità alla Legge Organica Comunale (LOC) e al Regolamento sulla gestione finanziaria e contabile dei Comuni (RGFCC),
            la contabilità pubblica ticinese adotta il Modello Contabile Armonizzato 2 (MCA2). Questo modello garantisce
            trasparenza e comparabilità grazie alla separazione netta tra flussi operativi correnti e investimenti patrimoniali.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/70 border border-slate-300 text-xs space-y-1.5 shadow-xs">
              <span className="font-mono text-[10px] font-bold text-cyan-800 block uppercase">
                Stadio 1 · Gestione Corrente
              </span>
              <h3 className="font-bold text-slate-900">Saldo Operativo</h3>
              <p className="text-slate-600 leading-relaxed">
                Spese per il personale (30), beni e servizi (31) e trasferimenti correnti (36) vs imposte (40) e tasse d&apos;uso (42).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/70 border border-slate-300 text-xs space-y-1.5 shadow-xs">
              <span className="font-mono text-[10px] font-bold text-cyan-800 block uppercase">
                Stadio 2 · Risultato d&apos;Esercizio
              </span>
              <h3 className="font-bold text-slate-900">Avanzo / Disavanzo Ordinario</h3>
              <p className="text-slate-600 leading-relaxed">
                Incorpora i proventi patrimoniali e finanziari (44), gli interessi passivi (34) e gli ammortamenti ordinari (33).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/70 border border-slate-300 text-xs space-y-1.5 shadow-xs">
              <span className="font-mono text-[10px] font-bold text-cyan-800 block uppercase">
                Stadio 3 · Risultato Contabile
              </span>
              <h3 className="font-bold text-slate-900">Chiusura e Capitale Proprio</h3>
              <p className="text-slate-600 leading-relaxed">
                Attribuzione o prelievo dalle riserve e dai fondi speciali del capitale proprio per il pareggio finale.
              </p>
            </div>
          </div>
        </section>

        {/* Sezione 2: Le 12 Regole di Quadratura Contabile (V01-V12) */}
        <section className="ofl-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-cyan-700" />
              <h2 className="text-base font-bold text-slate-900">
                2. Le 12 Verifiche Deterministiche di Quadratura (V01–V12)
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
              Tolleranza 0.00 CHF
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Ogni fascicolo contabile importato nella piattaforma OFCL deve soddisfare matematicamente tutte le seguenti relazioni
            prima di poter essere pubblicato. Nessun arrotondamento commerciale a 0.05 CHF è ammesso.
          </p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-900/5 text-[11px] font-bold uppercase text-slate-700">
                  <th className="py-2.5 px-3">Codice</th>
                  <th className="py-2.5 px-3">Regola di Verifica</th>
                  <th className="py-2.5 px-3">Formula Matematica</th>
                  <th className="py-2.5 px-3">Tolleranza</th>
                  <th className="py-2.5 px-3 text-center">Severità</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {BALANCING_RULES.map((rule) => (
                  <tr key={rule.code} className="hover:bg-slate-900/5">
                    <td className="py-3 px-3 font-black text-cyan-900">
                      {rule.code}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900">{rule.name}</div>
                      <div className="text-[11px] text-slate-600 font-normal mt-0.5">{rule.desc}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-800">
                      <code>{rule.formula}</code>
                    </td>
                    <td className="py-3 px-3 text-emerald-800 font-bold">
                      {rule.tolerance}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.severity === "BLOCKING"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sezione 3: Gli 8 Indicatori Finanziari SEL */}
        <section className="ofl-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              3. Gli 8 Indicatori Finanziari Ufficiali SEL (Art. 22 lett. o RGFCC)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            La Sezione degli enti locali (SEL) definisce gli 8 indicatori standard per valutare la salute finanziaria,
            la solvibilità e la capacità d&apos;investimento dei Comuni ticinesi, attribuendo bande di valutazione oggettive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {SEL_INDICATORS_DOCS.map((ind) => (
              <div
                key={ind.code}
                className="p-4 rounded-xl bg-white/70 border border-slate-300 text-xs space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/10 text-slate-800">
                    {ind.code}
                  </span>
                  <span className="font-mono font-bold text-slate-700">{ind.unit}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900">{ind.name}</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">{ind.desc}</p>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Soglie Ufficiali SEL
                  </span>
                  <div className="font-mono text-[11px] text-slate-900 font-semibold">
                    {ind.thresholds}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Normativo */}
        <div className="ofl-card p-4 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p>
            Riferimenti normativi: Legge Organica Comunale (LOC), art. 15, 17, 192; Regolamento sulla gestione finanziaria e contabile dei Comuni (RGFCC),
            allegati a–p; Manuale MCA2 della Sezione degli enti locali (Repubblica e Cantone Ticino).
          </p>
        </div>
      </main>
    </div>
  );
}
