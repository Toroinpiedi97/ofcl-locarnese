import { NextResponse } from "next/server";
import { apiOptions } from "@/lib/api-response";

export async function OPTIONS() {
  return apiOptions();
}

export async function GET() {
  const schema = {
    openapi: "3.1.0",
    info: {
      title: "OFCL REST API - Osservatorio Finanze Comunali del Locarnese",
      version: "1.0.0",
      description:
        "API pubblica e gratuita per la consultazione dei dati contabili armonizzati (MCA2), indicatori SEL, crediti d'investimento e tariffe civiche dei 19 Comuni del Locarnese.",
      license: {
        name: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        url: "https://creativecommons.org/licenses/by/4.0/",
      },
    },
    servers: [
      {
        url: "https://ofcl.ch/api/v1",
        description: "Server di Produzione",
      },
    ],
    paths: {
      "/comuni": {
        get: {
          summary: "Elenco dei 19 Comuni del Locarnese",
          description: "Restituisce l'anagrafica, moltiplicatori PF/PG e sintesi dei 30 secondi.",
          parameters: [
            { name: "ust", in: "query", schema: { type: "integer" }, description: "Filtra per codice UST (es. 5091)" },
            { name: "slug", in: "query", schema: { type: "string" }, description: "Filtra per slug del comune (es. ascona)" },
          ],
          responses: { "200": { description: "Lista dei comuni con metadati ufficiali" } },
        },
      },
      "/riassunto": {
        get: {
          summary: "Subtotali MCA2 per Comune e Anno",
          description: "Restituisce i subtotali di Conto Economico, Conto Investimenti e Bilancio.",
          parameters: [
            { name: "ust", in: "query", schema: { type: "integer" } },
            { name: "anno", in: "query", schema: { type: "integer", default: 2025 } },
          ],
          responses: { "200": { description: "Riepilogo contabile armonizzato" } },
        },
      },
      "/indicatori": {
        get: {
          summary: "8 Indicatori Finanziari SEL",
          description: "Restituisce gli 8 indicatori SEL ufficiali con codice, formula e fascia di conformità.",
          parameters: [
            { name: "ust", in: "query", schema: { type: "integer" } },
            { name: "anno", in: "query", schema: { type: "integer", default: 2025 } },
          ],
          responses: { "200": { description: "Indicatori finanziari SEL" } },
        },
      },
      "/crediti": {
        get: {
          summary: "Controllo Crediti d'Opera (Allegato f)",
          description: "Restituisce l'elenco delle opere pubbliche con credito votato, speso, residuo e flag sorpasso art. 15 LOC.",
          parameters: [
            { name: "ust", in: "query", schema: { type: "integer" } },
            { name: "overruns_only", in: "query", schema: { type: "boolean" } },
          ],
          responses: { "200": { description: "Crediti d'investimento e sorpassi" } },
        },
      },
      "/documenti": {
        get: {
          summary: "Biblioteca Fascicoli Ufficiali",
          description: "Catalogo dei Preventivi e Consuntivi comunali con impronta crittografica SHA-256.",
          parameters: [
            { name: "ust", in: "query", schema: { type: "integer" } },
            { name: "kind", in: "query", schema: { type: "string" } },
            { name: "anno", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Fascicoli contabili ufficiali" } },
        },
      },
      "/comuni/{slug}/servizi-tariffe": {
        get: {
          summary: "Tariffe Civiche e Servizi Municipali (Quadranti A-E)",
          description: "Dati civici pratici per residenti e famiglie (rifiuti, acqua, assegno nascita, nidi, clima).",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Quadranti A-E per il comune richiesto" } },
        },
      },
    },
  };

  return NextResponse.json(schema, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=86400",
      "Content-Type": "application/json",
    },
  });
}
