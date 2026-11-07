import { NextResponse } from "next/server";
import {
  getPublicDocumentsDataset,
  getPublicCreditsDataset,
} from "@/lib/data/mca2-dal";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dati.ofcl.ch";
  const nowRfc822 = new Date().toUTCString();

  const [credits, documents] = await Promise.all([
    getPublicCreditsDataset(),
    getPublicDocumentsDataset(),
  ]);

  // 1. Alert Sorpassi di Credito (Art. 15 LOC)
  const overruns = credits.filter((c) => c.is_overrun).map((c) => {
    const overrunChf = Math.abs(c.residual_chf).toLocaleString("it-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const votedChf = c.voted_credit_chf.toLocaleString("it-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const spentChf = c.spent_total_chf.toLocaleString("it-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      title: `[SORPASSO ART. 15 LOC] ${c.municipality_name}: ${c.description}`,
      link: `${baseUrl}/comuni/${c.municipality_slug}`,
      guid: `ofcl-overrun-${c.id}`,
      pubDate: c.vote_date ? new Date(c.vote_date).toUTCString() : nowRfc822,
      description: `Rilevato sorpasso di spesa sul credito d'opera votato dal CC. Credito votato: ${votedChf} CHF | Totale speso: ${spentChf} CHF | Sorpasso effettivo: +${overrunChf} CHF (${c.pct_used.toFixed(1)}%). Rif: ${c.mm_reference}, conto MCA2: ${c.account_code}, pag. ${c.page_ref}.`,
    };
  });

  // 2. Pubblicazioni Documenti Ufficiali
  const docItems = documents.map((d) => ({
    title: `[ATTO PUBBLICATO] ${d.municipality_name}: ${d.title}`,
    link: `${baseUrl}/documenti`,
    guid: `ofcl-doc-${d.id}`,
    pubDate: d.approval_date ? new Date(d.approval_date).toUTCString() : nowRfc822,
    description: `Fascicolo ufficiale ${d.document_kind} per l'anno contabile ${d.fiscal_year}. Pagine: ${d.pages} | Dimensione: ${(d.file_size_bytes / 1024 / 1024).toFixed(2)} MB | SHA-256: ${d.sha256}. Fanno fede gli atti esposti ex art. 192 LOC.`,
  }));

  const allItems = [...overruns, ...docItems];

  const xmlItems = allItems
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`
    )
    .join("\n");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OFCL · Osservatorio Finanze Comunali del Locarnese</title>
    <link>${baseUrl}</link>
    <description>Feed di monitoraggio civico, nuovi fascicoli finanziari pubblicati e alert su sorpassi di spesa ex art. 15 LOC nei 19 Comuni del Locarnese.</description>
    <language>it-ch</language>
    <lastBuildDate>${nowRfc822}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${xmlItems}
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
