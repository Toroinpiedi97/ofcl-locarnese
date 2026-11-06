import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  Scale,
  AlertTriangle,
  Mail,
  Building2,
  Database,
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
    <div className="space-y-6 pb-12">
      {/* Intestazione .ofl-card */}
      <header className="ofl-card p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 border border-amber-300 mb-3">
            <Scale className="h-3.5 w-3.5 text-amber-800" />
            Quadro Giuridico Ufficiale & Clausole di Manleva
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Note Legali, Fonti e Disclaimer di Responsabilità
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-700 max-w-3xl leading-relaxed">
            Disciplina sull’utilizzo dei dati contabili pubblici dei 19 Comuni del Distretto di Locarno,
            valore giuridico dell’Albo comunale (art. 192 LOC), esclusione di responsabilità ed esercizio della trasparenza.
          </p>
        </div>
      </header>

      <main className="space-y-6">
        {/* Box Avviso Primario (Art. 192 LOC) */}
        <section
          aria-labelledby="primary-disclaimer-heading"
          className="ofl-card p-6 border-2 border-amber-400 bg-amber-50/90 shadow-xs"
        >
          <div className="flex items-start gap-4">
            <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <h2
                id="primary-disclaimer-heading"
                className="text-base font-bold text-amber-950"
              >
                Principio Fondamentale: Fanno fede solo gli atti pubblicati all’Albo comunale
              </h2>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-amber-900">
                L’<strong>Osservatorio Finanze Comunali del Locarnese (OFCL)</strong> è una piattaforma civica indipendente di
                trasparenza sui dati aperti e non costituisce in alcun modo un servizio pubblico o governativo ufficiale.
                Ai sensi dell’<strong>art. 192 della Legge organica comunale (LOC, RL 181.100)</strong>, hanno valore legale e probatorio
                esclusivamente gli atti originali affissi agli albi comunali fisici e sui canali di pubblicazione formale delle singole Cancellerie comunali.
              </p>
            </div>
          </div>
        </section>

        {/* Quadro Fonti Ufficiali */}
        <section aria-labelledby="sources-heading" className="space-y-3">
          <h2 id="sources-heading" className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900">
            <Building2 className="h-5 w-5 text-cyan-700" />
            Origine dei Dati & Fonti Istituzionali
          </h2>
          <p className="text-xs text-slate-600">
            OFCL non inventa né stima i dati: ogni cifra proviene direttamente da atti pubblici verificabili.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 pt-1">
            {OFFICIAL_SOURCES.map((source, idx) => (
              <div
                key={idx}
                className="ofl-card p-4 shadow-xs"
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Database className="h-4 w-4 text-emerald-700 shrink-0" />
                  {source.name}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 10 Sezioni Dettagliate */}
        <section aria-labelledby="clauses-heading" className="space-y-4">
          <h2 id="clauses-heading" className="text-base font-bold tracking-tight text-slate-900">
            Condizioni di Utilizzo e Inquadramento Normativo Vigente
          </h2>

          <div className="space-y-4">
            {LEGAL_SECTIONS.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="ofl-card p-6 shadow-xs scroll-mt-16"
              >
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {section.title}
                </h3>
                <div className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-line font-sans">
                  {section.content}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Box Segnalazione Rapida (Notice & Correction) */}
        <section
          aria-labelledby="report-error-heading"
          className="ofl-card p-6 shadow-xs"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 id="report-error-heading" className="text-sm font-bold text-slate-900">
                  Hai riscontrato un errore o una discrepanza con il fascicolo comunale?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Aiutaci a mantenere il database impeccabile. Le segnalazioni motivate vengono verificate e gestite entro 24 ore.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <a
                href={`mailto:${LEGAL_CONFIG.correctionsEmail}?subject=Segnalazione%20imprecisione%20OFCL`}
                className="ofl-btn-frost inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 rounded-xl"
              >
                <Mail className="h-3.5 w-3.5" />
                Invia e-mail
              </a>
              <Link
                href={LEGAL_CONFIG.correctionsUrl}
                className="ofl-btn-blue inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
              >
                Modulo di segnalazione →
              </Link>
            </div>
          </div>
        </section>

        {/* Quadro Riassuntivo delle Norme Richiamate */}
        <section aria-labelledby="norms-table-heading" className="space-y-3">
          <h2 id="norms-table-heading" className="text-base font-bold tracking-tight text-slate-900">
            Riepilogo Norme Federali e Cantonali Applicabili
          </h2>
          <div className="overflow-x-auto ofl-card p-0 shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-900/5 font-bold text-slate-700">
                <tr>
                  <th scope="col" className="px-4 py-3">Norma</th>
                  <th scope="col" className="px-4 py-3">Titolo Ufficiale</th>
                  <th scope="col" className="px-4 py-3">Presidio in OFCL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900">Art. 192 LOC (RL 181.100)</td>
                  <td className="px-4 py-3">Legge organica comunale (Ticino)</td>
                  <td className="px-4 py-3">Valore probatorio esclusivo dell&apos;albo pretorio; manleva su rielaborazioni civiche.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900">Art. 5 cpv. 1 LDA (RS 231.1)</td>
                  <td className="px-4 py-3">Legge federale sul diritto d&apos;autore</td>
                  <td className="px-4 py-3">Atti ufficiali esclusi dal copyright; riuso dati con licenza libera CC BY 4.0.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900">LPSt (RS 232.21)</td>
                  <td className="px-4 py-3">Protezione degli stemmi pubblici (Confederazione)</td>
                  <td className="px-4 py-3">Zero stemmi araldici ufficiali nella UI per evitare inganni sull&apos;origine pubblica.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900">nLPD (RS 235.1) & LPDP (RL 163.100)</td>
                  <td className="px-4 py-3">Protezione dei dati personali (CH & TI)</td>
                  <td className="px-4 py-3">Esclusione preventiva di atti nominativi o sensibili (es. naturalizzazioni, condoni).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900">LIT (RL 162.100)</td>
                  <td className="px-4 py-3">Trasparenza dello Stato (Ticino)</td>
                  <td className="px-4 py-3">Diritto civico d&apos;accesso e consultazione dei documenti amministrativi ufficiali.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer pagina note legali */}
        <footer className="mt-8 pt-4 border-t border-slate-300 text-center text-xs text-slate-600">
          <p>
            {LEGAL_CONFIG.portalName} · Foro competente: {LEGAL_CONFIG.courtOfJurisdiction} · {LEGAL_CONFIG.applicableLaw}
          </p>
          <p className="mt-1">
            Dati aperti conformi a Opendata.swiss sotto licenza{" "}
            <a
              href={LEGAL_CONFIG.license.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-900"
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
