import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Scale,
  ShieldCheck,
  TrendingUp,
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
    name: "Fabbisogno / Eccedenza di Finanziamento",
    formula: "Fabbisogno = Investimenti_{netti} - Autofinanziamento",
    desc: "Se positivo, indica la necessità di ricorrere a nuovi prestiti bancari o consumo di liquidità.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V07",
    name: "Pareggio di Bilancio Patrimoniale",
    formula: "Attivo_{Totale} = Passivo_{Totale}",
    desc: "Regola contabile universale: il totale degli attivi deve pareggiare al centesimo il totale dei passivi.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V08",
    name: "Articolazione Attivo Patrimoniale",
    formula: "Attivo = Beni\\ Patrimoniali_{(10)} + Beni\\ Amministrativi_{(14)}",
    desc: "Beni liberamente alienabili vs beni destinati all'uso pubblico comunale.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V09",
    name: "Articolazione Passivo",
    formula: "Passivo = Capitale\\ Terzi_{(20)} + Capitale\\ Proprio_{(29)}",
    desc: "Debiti e impegni verso terzi vs riserve e patrimonio netto del Comune.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V10",
    name: "Quadratura Allegato f (Controllo Crediti)",
    formula: "Residuo = Credito\\ Votato - Uscite\\ Totali\\ Cumulate",
    desc: "Per ogni credito d'opera deliberato dal CC, verifica la congruenza tra speso e residuo contabile.",
    tolerance: "0.00 CHF",
    severity: "BLOCKING",
  },
  {
    code: "V11",
    name: "Rilevazione Sorpasso di Spesa (Art. 15 LOC)",
    formula: "Residuo < 0.00\\text{ CHF} \\implies \\text{S01 SORPASSO}",
    desc: "Se le uscite cumulate superano il credito votato, scatta l'allerta automatica per credito suppletorio.",
    tolerance: "0.00 CHF",
    severity: "WARNING",
  },
  {
    code: "V12",
    name: "Riconciliazione Indicatori Ufficiali SEL",
    formula: "|Indicatore_{dichiarato} - Indicatore_{calcolato}| \\le 0.05",
    desc: "Confronto incrociato tra gli 8 indicatori finanziari dichiarati dal Comune e quelli ricalcolati dal motore.",
    tolerance: "0.05 pt",
    severity: "WARNING",
  },
];

const SEL_INDICATORS_DOCS = [
  {
    code: "SELF_FINANCING_DEGREE",
    name: "Grado di Autofinanziamento",
    formula: "(Autofinanziamento / Investimenti netti) * 100",
    unit: "%",
    thresholds: "> 100% Buono (🟢) · 70–100% Accettabile (🟡) · < 70% Debole (🔴)",
    desc: "Misura la quota di investimenti netti coperta con risorse generate internamente senza ricorrere a nuovo debito.",
  },
  {
    code: "SELF_FINANCING_CAPACITY",
    name: "Capacità di Autofinanziamento",
    formula: "(Autofinanziamento / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "> 20% Buona (🟢) · 10–20% Media (🟡) · < 10% Debole (🔴)",
    desc: "Percentuale dei ricavi correnti d'esercizio che il Comune riesce a destinare a riserva per investimenti.",
  },
  {
    code: "INTEREST_BURDEN_RATIO",
    name: "Quota Oneri Finanziari (Carico Interessi)",
    formula: "(Interessi passivi netti / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "< 2% Buono (🟢) · 2–5% Medio (🟡) · > 5% Elevato (🔴)",
    desc: "Misura quanto gli interessi sul debito assorbono i ricavi correnti del Comune.",
  },
  {
    code: "CAPITAL_SERVICE_RATIO",
    name: "Quota del Servizio del Debito",
    formula: "((Interessi passivi + Ammortamenti ordinari) / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "< 5% Sostenibile (🟢) · 5–15% Medio (🟡) · > 15% Critico (🔴)",
    desc: "Incidenza complessiva degli oneri del capitale (interessi e ammortamenti) sul bilancio.",
  },
  {
    code: "NET_DEBT_RATIO",
    name: "Quota del Debito Netto",
    formula: "(Debito netto / Ricavi correnti) * 100",
    unit: "%",
    thresholds: "< 100% Basso (🟢) · 100–150% Medio (🟡) · > 150% Elevato (🔴)",
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
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

          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0F3854]/10 dark:bg-cyan-950/40 border border-[#0F3854]/20 dark:border-cyan-500/30 text-[#0F3854] dark:text-cyan-300 text-xs font-semibold mb-2">
              <Scale className="w-3.5 h-3.5" />
              <span>Standard Contabile MCA2 · Sezione Enti Locali (SEL)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Metodologia di Quadratura MCA2 & Indicatori SEL
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              La guida formale al modello contabile pubblico dei Comuni ticinesi: la struttura dei tre stadi del conto economico,
              le 12 regole matematiche di quadratura al centesimo (V01–V12) e le soglie ufficiali di valutazione finanziaria SEL.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* Sezione 1: Il Modello Contabile MCA2 */}
        <section className="bento-card p-6 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#00A3C4]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              1. L&apos;Architettura Contabile Armonizzata (MCA2)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            In conformità alla Legge Organica Comunale (LOC) e al Regolamento sulla gestione finanziaria e contabile dei Comuni (RGFCC),
            la contabilità pubblica ticinese adotta il Modello Contabile Armonizzato 2 (MCA2). Questo modello garantisce
            trasparenza e comparabilità grazie alla separazione netta tra flussi operativi correnti e investimenti patrimoniali.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <span className="font-mono text-[10px] font-bold text-[#0F3854] dark:text-cyan-400 block uppercase">
                Stadio 1 · Gestione Corrente
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white">Saldo Operativo</h3>
              <p className="text-slate-500 leading-relaxed">
                Spese per il personale (30), beni e servizi (31) e trasferimenti correnti (36) vs imposte (40) e tasse d&apos;uso (42).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <span className="font-mono text-[10px] font-bold text-[#0F3854] dark:text-cyan-400 block uppercase">
                Stadio 2 · Risultato d&apos;Esercizio
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white">Avanzo / Disavanzo Ordinario</h3>
              <p className="text-slate-500 leading-relaxed">
                Incorpora i proventi patrimoniali e finanziari (44), gli interessi passivi (34) e gli ammortamenti ordinari (33).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <span className="font-mono text-[10px] font-bold text-[#0F3854] dark:text-cyan-400 block uppercase">
                Stadio 3 · Risultato Contabile
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white">Chiusura e Capitale Proprio</h3>
              <p className="text-slate-500 leading-relaxed">
                Attribuzione o prelievo dalle riserve e dai fondi speciali del capitale proprio per il pareggio finale.
              </p>
            </div>
          </div>
        </section>

        {/* Sezione 2: Le 12 Regole di Quadratura Contabile (V01-V12) */}
        <section className="bento-card p-6 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-[#0F3854] dark:text-cyan-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Le 12 Verifiche Deterministiche di Quadratura (V01–V12)
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Tolleranza 0.00 CHF
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Ogni fascicolo contabile importato nella piattaforma OFCL deve soddisfare matematicamente tutte le seguenti relazioni
            prima di poter essere pubblicato. Nessun arrotondamento commerciale a 0.05 CHF è ammesso.
          </p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-3">Codice</th>
                  <th className="py-2.5 px-3">Regola di Verifica</th>
                  <th className="py-2.5 px-3">Formula Matematica</th>
                  <th className="py-2.5 px-3">Tolleranza</th>
                  <th className="py-2.5 px-3 text-center">Severità</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {BALANCING_RULES.map((rule) => (
                  <tr key={rule.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-[#0F3854] dark:text-cyan-400">
                      {rule.code}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-slate-900 dark:text-white">{rule.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-normal mt-0.5">{rule.desc}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <code>{rule.formula}</code>
                    </td>
                    <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-semibold">
                      {rule.tolerance}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.severity === "BLOCKING"
                            ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
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
        <section className="bento-card p-6 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              3. Gli 8 Indicatori Finanziari Ufficiali SEL (Art. 22 lett. o RGFCC)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            La Sezione degli enti locali (SEL) definisce gli 8 indicatori standard per valutare la salute finanziaria,
            la solvibilità e la capacità d&apos;investimento dei Comuni ticinesi, attribuendo bande di valutazione oggettive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {SEL_INDICATORS_DOCS.map((ind) => (
              <div
                key={ind.code}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {ind.code}
                  </span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{ind.unit}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{ind.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{ind.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400 block mb-0.5">
                    Soglie Ufficiali SEL
                  </span>
                  <div className="font-mono text-[11px] text-slate-800 dark:text-slate-200 font-medium">
                    {ind.thresholds}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer Normativo */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            Riferimenti normativi: Legge Organica Comunale (LOC), art. 15, 17, 192; Regolamento sulla gestione finanziaria e contabile dei Comuni (RGFCC),
            allegati a–p; Manuale MCA2 della Sezione degli enti locali (Repubblica e Cantone Ticino).
          </p>
        </div>
      </main>
    </div>
  );
}
