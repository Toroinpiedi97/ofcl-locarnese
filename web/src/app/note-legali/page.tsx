import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  FileCheck2,
  Scale,
  ExternalLink,
  AlertTriangle,
  Mail,
  ArrowLeft,
  Building2,
  Database,
  Lock,
} from "lucide-react";
import {
  LEGAL_CONFIG,
  OFFICIAL_SOURCES,
  LEGAL_SECTIONS,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Note Legali, Fonti e Disclaimer di Responsabilità | OFCL",
  description:
    "Quadro giuridico, fonti ufficiali dei 19 Comuni del Locarnese, avvertenza ex art. 192 LOC, clausole di manleva e tutela della privacy (nLPD/LPDP).",
};

export default function NoteLegaliPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Intestazione di navigazione */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              Versione Specifica 1.0.0
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              CC BY 4.0
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Titolo e badge */}
        <div className="border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="inline-flex items-center gap-2 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
            <Scale className="h-3.5 w-3.5" />
            Quadro Giuridico Ufficiale & Clausole di Manleva
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Note Legali, Fonti e Disclaimer di Responsabilità
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Disciplina sull’utilizzo dei dati contabili pubblici dei 19 Comuni del Distretto di Locarno,
            valore giuridico dell’Albo comunale (art. 192 LOC), esclusione di responsabilità ed esercizio della trasparenza.
          </p>
        </div>

        {/* Box Avviso Primario (Art. 192 LOC) */}
        <section
          aria-labelledby="primary-disclaimer-heading"
          className="my-8 rounded-lg border-2 border-amber-300 bg-amber-50/80 p-6 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/30"
        >
          <div className="flex items-start gap-4">
            <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-amber-800 dark:text-amber-400" />
            <div>
              <h2
                id="primary-disclaimer-heading"
                className="text-lg font-bold text-amber-950 dark:text-amber-200"
              >
                Principio Fondamentale: Fanno fede solo gli atti pubblicati all’Albo comunale
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-900 dark:text-amber-300">
                L’<strong>Osservatorio Finanze Comunali del Locarnese (OFCL)</strong> è una piattaforma civica indipendente di
                trasparenza sui dati aperti e non costituisce in alcun modo un servizio pubblico o governativo ufficiale.
                Ai sensi dell’<strong>art. 192 della Legge organica comunale (LOC, RL 181.100)</strong>, hanno valore legale e probatorio
                esclusivamente gli atti originali affissi agli albi comunali fisici e sui canali di pubblicazione formale delle singole Cancellerie comunali.
              </p>
            </div>
          </div>
        </section>

        {/* Quadro Fonti Ufficiali */}
        <section aria-labelledby="sources-heading" className="my-10">
          <h2 id="sources-heading" className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Building2 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            Origine dei Dati & Fonti Istituzionali
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            OFCL non inventa né stima i dati: ogni cifra proviene direttamente da atti pubblici verificabili.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {OFFICIAL_SOURCES.map((source, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {source.name}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 10 Sezioni Dettagliate */}
        <section aria-labelledby="clauses-heading" className="mt-12 space-y-8">
          <h2 id="clauses-heading" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Condizioni di Utilizzo e Inquadramento Normativo Vigente
          </h2>

          <div className="space-y-6">
            {LEGAL_SECTIONS.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-16 rounded-lg border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 sm:text-lg">
                  {section.title}
                </h3>
                <div className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-line font-sans">
                  {section.content}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Box Segnalazione Rapida (Notice & Correction) */}
        <section
          aria-labelledby="report-error-heading"
          className="mt-12 rounded-lg border border-zinc-300 bg-zinc-100 p-6 dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 id="report-error-heading" className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Hai riscontrato un errore o una discrepanza con il fascicolo comunale?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Aiutaci a mantenere il database impeccabile. Le segnalazioni motivate vengono verificate e gestite entro 24 ore.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <a
                href={`mailto:${LEGAL_CONFIG.correctionsEmail}?subject=Segnalazione%20imprecisione%20OFCL`}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <Mail className="h-3.5 w-3.5" />
                Invia e-mail
              </a>
              <Link
                href={LEGAL_CONFIG.correctionsUrl}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Modulo di segnalazione →
              </Link>
            </div>
          </div>
        </section>

        {/* Quadro Riassuntivo delle Norme Richiamate */}
        <section aria-labelledby="norms-table-heading" className="mt-12">
          <h2 id="norms-table-heading" className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Riepilogo Norme Federali e Cantonali Applicabili
          </h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-xs dark:divide-zinc-800">
              <thead className="bg-zinc-100 dark:bg-zinc-800/60 font-semibold text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th scope="col" className="px-4 py-3">Norma</th>
                  <th scope="col" className="px-4 py-3">Titolo Ufficiale</th>
                  <th scope="col" className="px-4 py-3">Presidio in OFCL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Art. 192 LOC (RL 181.100)</td>
                  <td className="px-4 py-3">Legge organica comunale (Ticino)</td>
                  <td className="px-4 py-3">Valore probatorio esclusivo dell'albo pretorio; manleva su rielaborazioni civiche.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">Art. 5 cpv. 1 LDA (RS 231.1)</td>
                  <td className="px-4 py-3">Legge federale sul diritto d'autore</td>
                  <td className="px-4 py-3">Atti ufficiali esclusi dal copyright; riuso dati con licenza libera CC BY 4.0.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">LPSt (RS 232.21)</td>
                  <td className="px-4 py-3">Protezione degli stemmi pubblici (Confederazione)</td>
                  <td className="px-4 py-3">Zero stemmi araldici ufficiali nella UI per evitare inganni sull'origine pubblica.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">nLPD (RS 235.1) & LPDP (RL 163.100)</td>
                  <td className="px-4 py-3">Protezione dei dati personali (CH & TI)</td>
                  <td className="px-4 py-3">Esclusione preventiva di atti nominativi o sensibili (es. naturalizzazioni, condoni).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">LIT (RL 162.100)</td>
                  <td className="px-4 py-3">Trasparenza dello Stato (Ticino)</td>
                  <td className="px-4 py-3">Diritto civico d'accesso e consultazione dei documenti amministrativi ufficiali.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer pagina note legali */}
        <footer className="mt-14 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            {LEGAL_CONFIG.portalName} · Foro competente: {LEGAL_CONFIG.courtOfJurisdiction} · {LEGAL_CONFIG.applicableLaw}
          </p>
          <p className="mt-1">
            Dati aperti conformi a Opendata.swiss sotto licenza{" "}
            <a
              href={LEGAL_CONFIG.license.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {LEGAL_CONFIG.license.name}
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
