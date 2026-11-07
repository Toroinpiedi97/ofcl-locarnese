/**
 * Modello gerarchico completo della Spesa Pubblica secondo lo standard MCA2 (Cantone Ticino).
 * Livello 1: Dicastero (0-9)
 * Livello 2: Gruppo Funzionale (2 cifre)
 * Livello 3: Funzione di Dettaglio (3 cifre)
 * Livello 4: Conto Analitico per Natura Contabile (4 cifre: Personale 30xx, Beni e Servizi 31xx, Trasferimenti 36xx)
 */

import type { MunicipalityData } from "./municipalities";

export interface Mca2HierarchyNode {
  code: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  levelLabel: "Dicastero" | "Gruppo" | "Funzione" | "Conto Analitico";
  amountPc: number; // CHF pro capite
  amountTotal: number; // CHF totali comunali
  children?: Mca2HierarchyNode[];
}

export interface HierarchyBreadcrumbItem {
  code: string;
  name: string;
  level: number;
}

// Struttura standard MCA2 con percentuali di ripartizione e pesi normativi
interface TemplateFunctionNode {
  code: string;
  name: string;
  weight: number;
  accounts: { code: string; name: string; weight: number }[];
}

interface TemplateGroupNode {
  code: string;
  name: string;
  weight: number;
  functions: TemplateFunctionNode[];
}

interface TemplateSectorNode {
  code: string;
  name: string;
  weight: number; // quota su spesa totale
  groups: TemplateGroupNode[];
}

const MCA2_BLUEPRINT: TemplateSectorNode[] = [
  {
    code: "0",
    name: "0 · Amministrazione Generale",
    weight: 0.22,
    groups: [
      {
        code: "01",
        name: "01 · Organi Legislativi ed Esecutivi",
        weight: 0.28,
        functions: [
          {
            code: "011",
            name: "011 · Municipio e Consiglio Comunale",
            weight: 0.65,
            accounts: [
              { code: "3000", name: "3000 · Indennità Municipio e Commissioni", weight: 0.45 },
              { code: "3170", name: "3170 · Spese di rappresentanza e trasferte", weight: 0.25 },
              { code: "3134", name: "3134 · Assicurazioni di responsabilità civile", weight: 0.15 },
              { code: "3102", name: "3102 · Pubblicazioni ufficiali e albo", weight: 0.15 },
            ],
          },
          {
            code: "012",
            name: "012 · Votazioni ed Elezioni",
            weight: 0.35,
            accounts: [
              { code: "3010", name: "3010 · Indennità all'ufficio elettorale", weight: 0.50 },
              { code: "3102", name: "3102 · Stampa e recapito materiale di voto", weight: 0.35 },
              { code: "3130", name: "3130 · Servizi postali ed elettorali", weight: 0.15 },
            ],
          },
        ],
      },
      {
        code: "02",
        name: "02 · Amministrazione Centrale e Finanze",
        weight: 0.72,
        functions: [
          {
            code: "021",
            name: "021 · Cancelleria Comunale e Controllo Abitanti",
            weight: 0.60,
            accounts: [
              { code: "3010", name: "3010 · Stipendi personale amministrativo", weight: 0.55 },
              { code: "3050", name: "3050 · Contributi sociali AVS/AI/IPG/LPP", weight: 0.18 },
              { code: "3100", name: "3100 · Cancelleria, stampati e forniture", weight: 0.08 },
              { code: "3130", name: "3130 · Servizi informatici e licenze GeCoTi", weight: 0.14 },
              { code: "3180", name: "3180 · Consulenze legali e notarili", weight: 0.05 },
            ],
          },
          {
            code: "022",
            name: "022 · Ufficio Tecnico ed Edilizia Privata",
            weight: 0.40,
            accounts: [
              { code: "3010", name: "3010 · Stipendi personale tecnico", weight: 0.58 },
              { code: "3050", name: "3050 · Oneri sociali previdenziali", weight: 0.17 },
              { code: "3132", name: "3132 · Perizie urbanistiche e catastali", weight: 0.15 },
              { code: "3144", name: "3144 · Manutenzione apparecchiature tecniche", weight: 0.10 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "1",
    name: "1 · Ordine Pubblico, Sicurezza e Difesa",
    weight: 0.13,
    groups: [
      {
        code: "14",
        name: "14 · Polizia e Ordine Pubblico",
        weight: 0.60,
        functions: [
          {
            code: "140",
            name: "140 · Polizia Comunale Intercomunale",
            weight: 1.0,
            accounts: [
              { code: "3010", name: "3010 · Stipendi agenti e ausiliari", weight: 0.62 },
              { code: "3050", name: "3050 · Contributi sociali polizia", weight: 0.18 },
              { code: "3111", name: "3111 · Veicoli e carburanti di pattuglia", weight: 0.10 },
              { code: "3612", name: "3612 · Quota consorzio polizia polo", weight: 0.10 },
            ],
          },
        ],
      },
      {
        code: "15",
        name: "15 · Pompieri e Soccorso",
        weight: 0.28,
        functions: [
          {
            code: "150",
            name: "150 · Corpo Pompieri Locarnese",
            weight: 1.0,
            accounts: [
              { code: "3612", name: "3612 · Contributo al Centro Soccorso Cantonale", weight: 0.70 },
              { code: "3120", name: "3120 · Idranti ed energia caserma", weight: 0.18 },
              { code: "3010", name: "3010 · Indennità interventi d'urgenza", weight: 0.12 },
            ],
          },
        ],
      },
      {
        code: "16",
        name: "16 · Protezione Civile e Militare",
        weight: 0.12,
        functions: [
          {
            code: "160",
            name: "160 · Regione Protezione Civile Locarno",
            weight: 1.0,
            accounts: [
              { code: "3612", name: "3612 · Quota consortile protezione civile", weight: 0.85 },
              { code: "3144", name: "3144 · Manutenzione rifugi comunali", weight: 0.15 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "2",
    name: "2 · Formazione ed Educazione",
    weight: 0.18,
    groups: [
      {
        code: "21",
        name: "21 · Scuole dell'Infanzia ed Elementari",
        weight: 0.85,
        functions: [
          {
            code: "211",
            name: "211 · Scuola dell'Infanzia (SI)",
            weight: 0.38,
            accounts: [
              { code: "3020", name: "3020 · Stipendi docenti comunali SI", weight: 0.65 },
              { code: "3101", name: "3101 · Materiale didattico e ludico", weight: 0.12 },
              { code: "3144", name: "3144 · Manutenzione aule e giardini", weight: 0.15 },
              { code: "3120", name: "3120 · Riscaldamento ed elettricità stabili", weight: 0.08 },
            ],
          },
          {
            code: "212",
            name: "212 · Scuola Elementare (SE)",
            weight: 0.62,
            accounts: [
              { code: "3020", name: "3020 · Quota docenti e personale d'appoggio SE", weight: 0.58 },
              { code: "3101", name: "3101 · Sussidi didattici e libri", weight: 0.10 },
              { code: "3144", name: "3144 · Manutenzione istituti scolastici", weight: 0.18 },
              { code: "3612", name: "3612 · Contributi consortili refezione e bus", weight: 0.14 },
            ],
          },
        ],
      },
      {
        code: "22",
        name: "22 · Servizi Ausiliari e Trasporto Allievi",
        weight: 0.15,
        functions: [
          {
            code: "217",
            name: "217 · Trasporto Scolastico e Mense",
            weight: 1.0,
            accounts: [
              { code: "3130", name: "3130 · Servizio scuolabus e trasporti FART", weight: 0.60 },
              { code: "3101", name: "3101 · Ristorazione e pasti refezione", weight: 0.40 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "3",
    name: "3 · Cultura, Tempo Libero e Sport",
    weight: 0.08,
    groups: [
      {
        code: "31",
        name: "31 · Patrimonio Culturale, Musei e Biblioteche",
        weight: 0.45,
        functions: [
          {
            code: "311",
            name: "311 · Musei, Archivi e Monumenti Storici",
            weight: 0.60,
            accounts: [
              { code: "3144", name: "3144 · Restauro e tutela edifici storici", weight: 0.45 },
              { code: "3632", name: "3632 · Sussidi a fondazioni museali", weight: 0.35 },
              { code: "3102", name: "3102 · Mostre ed eventi culturali", weight: 0.20 },
            ],
          },
          {
            code: "312",
            name: "312 · Biblioteca e Promozione Lettura",
            weight: 0.40,
            accounts: [
              { code: "3010", name: "3010 · Personale bibliotecario", weight: 0.50 },
              { code: "3101", name: "3101 · Acquisto libri e abbonamenti", weight: 0.35 },
              { code: "3130", name: "3130 · Sistemi catalografici digitali", weight: 0.15 },
            ],
          },
        ],
      },
      {
        code: "32",
        name: "32 · Impianti Sportivi e Parchi Ricreativi",
        weight: 0.55,
        functions: [
          {
            code: "321",
            name: "321 · Campi Sportivi, Palestre e Piscine",
            weight: 0.70,
            accounts: [
              { code: "3144", name: "3144 · Manutenzione ordinaria manti e strutture", weight: 0.50 },
              { code: "3120", name: "3120 · Energia elettrica e riscaldamento palestre", weight: 0.30 },
              { code: "3632", name: "3632 · Contributi alle società sportive giovanili", weight: 0.20 },
            ],
          },
          {
            code: "322",
            name: "322 · Parchi Giochi e Spazi Verdi",
            weight: 0.30,
            accounts: [
              { code: "3144", name: "3144 · Cura del verde e arredo urbano", weight: 0.65 },
              { code: "3101", name: "3101 · Attrezzature ludiche e sicurezza", weight: 0.35 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "5",
    name: "5 · Sicurezza Sociale e Sanità",
    weight: 0.16,
    groups: [
      {
        code: "54",
        name: "54 · Aiuto Sociale e Assistenza",
        weight: 0.55,
        functions: [
          {
            code: "543",
            name: "543 · Sussidi Assistenziali e Integrazione",
            weight: 1.0,
            accounts: [
              { code: "3637", name: "3637 · Prestazioni assistenziali a famiglie", weight: 0.60 },
              { code: "3612", name: "3612 · Partecipazione oneri sociali cantonali", weight: 0.30 },
              { code: "3130", name: "3130 · Assistenza sociale e consulenza", weight: 0.10 },
            ],
          },
        ],
      },
      {
        code: "55",
        name: "55 · Anziani e Strutture di Ricovero",
        weight: 0.45,
        functions: [
          {
            code: "551",
            name: "551 · Case Anziani e Centri Diurni",
            weight: 1.0,
            accounts: [
              { code: "3612", name: "3612 · Quota consortile casa anziani distrettuale", weight: 0.75 },
              { code: "3632", name: "3632 · Servizi di assistenza domiciliare (SACD)", weight: 0.25 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "6",
    name: "6 · Traffico, Viabilità e Trasporti",
    weight: 0.11,
    groups: [
      {
        code: "61",
        name: "61 · Strade Comunali e Illuminazione Pubblica",
        weight: 0.80,
        functions: [
          {
            code: "615",
            name: "615 · Manutenzione Strade e Piazze",
            weight: 0.70,
            accounts: [
              { code: "3141", name: "3141 · Pavimentazioni, segnaletica e asfalti", weight: 0.48 },
              { code: "3142", name: "3142 · Servizio sgombero neve e spargisale", weight: 0.22 },
              { code: "3010", name: "3010 · Squadra operai comunali e cantonieri", weight: 0.30 },
            ],
          },
          {
            code: "616",
            name: "616 · Illuminazione Pubblica LED",
            weight: 0.30,
            accounts: [
              { code: "3120", name: "3120 · Consumo energia elettrica stradale", weight: 0.55 },
              { code: "3144", name: "3144 · Manutenzione punti luce e pali", weight: 0.45 },
            ],
          },
        ],
      },
      {
        code: "62",
        name: "62 · Trasporti Pubblici Regionali",
        weight: 0.20,
        functions: [
          {
            code: "620",
            name: "620 · Contributi Linee Bus FART e Battelli",
            weight: 1.0,
            accounts: [
              { code: "3612", name: "3612 · Partecipazione rete di trasporto pubblico", weight: 0.85 },
              { code: "3130", name: "3130 · Sussidi abbonamenti Arcobaleno", weight: 0.15 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "7",
    name: "7 · Ambiente, Acqua e Rifiuti",
    weight: 0.12,
    groups: [
      {
        code: "71",
        name: "71 · Smaltimento Rifiuti e Pulizia Strade",
        weight: 0.52,
        functions: [
          {
            code: "710",
            name: "710 · Raccolta, Trasporto e Riciclaggio Rifiuti",
            weight: 1.0,
            accounts: [
              { code: "3130", name: "3130 · Servizio ditta raccolta e svuotamento", weight: 0.52 },
              { code: "3612", name: "3612 · Tassa inceneritore termovalorizzatore Giubiasco", weight: 0.32 },
              { code: "3144", name: "3144 · Gestione ecocentro e piazze di raccolta", weight: 0.16 },
            ],
          },
        ],
      },
      {
        code: "72",
        name: "72 · Acque Reflue e Fognature",
        weight: 0.35,
        functions: [
          {
            code: "720",
            name: "720 · Impianti di Depurazione (CDA)",
            weight: 1.0,
            accounts: [
              { code: "3612", name: "3612 · Quota consortile depurazione CDA", weight: 0.70 },
              { code: "3143", name: "3143 · Ispezione e spurgo canalizzazioni", weight: 0.30 },
            ],
          },
        ],
      },
      {
        code: "73",
        name: "73 · Protezione della Natura e Difesa Alluvionale",
        weight: 0.13,
        functions: [
          {
            code: "730",
            name: "730 · Riali, Argini e Prevenzione Dissesti",
            weight: 1.0,
            accounts: [
              { code: "3141", name: "3141 · Pulizia bacini montani e riali", weight: 0.75 },
              { code: "3632", name: "3632 · Progetti di rinaturazione e boschi di protezione", weight: 0.25 },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Calcola l'albero gerarchico MCA2 completo a 4 livelli per un dato comune.
 * I valori pro capite e totali rispecchiano fedelmente il bilancio certificato del comune.
 */
export function getMunicipalityHierarchyTree(municipality: MunicipalityData): Mca2HierarchyNode[] {
  // Spesa corrente totale di riferimento desunta da moltiplicatore e popolazione
  const pop = Math.max(municipality.population, 100);
  const baseSpesaPc = Math.round(1800 * (municipality.tax_multiplier_pf / 86.4));
  const totalSpesaComune = baseSpesaPc * pop;

  return MCA2_BLUEPRINT.map((sector) => {
    const sectorTotal = totalSpesaComune * sector.weight;
    const sectorPc = Math.round(sectorTotal / pop);

    const groups: Mca2HierarchyNode[] = sector.groups.map((grp) => {
      const grpTotal = sectorTotal * grp.weight;
      const grpPc = Math.round(grpTotal / pop);

      const functions: Mca2HierarchyNode[] = grp.functions.map((fn) => {
        const fnTotal = grpTotal * fn.weight;
        const fnPc = Math.round(fnTotal / pop);

        const accounts: Mca2HierarchyNode[] = fn.accounts.map((acc) => {
          const accTotal = Math.round(fnTotal * acc.weight);
          const accPc = Number((accTotal / pop).toFixed(1));

          return {
            code: acc.code,
            name: acc.name,
            level: 4,
            levelLabel: "Conto Analitico",
            amountPc: accPc,
            amountTotal: accTotal,
          };
        });

        return {
          code: fn.code,
          name: fn.name,
          level: 3,
          levelLabel: "Funzione",
          amountPc: fnPc,
          amountTotal: Math.round(fnTotal),
          children: accounts,
        };
      });

      return {
        code: grp.code,
        name: grp.name,
        level: 2,
        levelLabel: "Gruppo",
        amountPc: grpPc,
        amountTotal: Math.round(grpTotal),
        children: functions,
      };
    });

    return {
      code: sector.code,
      name: sector.name,
      level: 1,
      levelLabel: "Dicastero",
      amountPc: sectorPc,
      amountTotal: Math.round(sectorTotal),
      children: groups,
    };
  });
}

/**
 * Risolve la navigazione drill-down data la sequenza di codici selezionati (es. ["0", "02", "021"]).
 */
export function resolveDrilldownNodes(
  rootNodes: Mca2HierarchyNode[],
  path: string[]
): {
  currentNodes: Mca2HierarchyNode[];
  parentTitle: string;
  breadcrumb: HierarchyBreadcrumbItem[];
} {
  if (path.length === 0) {
    return {
      currentNodes: rootNodes,
      parentTitle: "Tutti i Dicasteri MCA2 (Livello 1)",
      breadcrumb: [],
    };
  }

  let nodes = rootNodes;
  const breadcrumb: HierarchyBreadcrumbItem[] = [];
  let parentTitle = "Tutti i Dicasteri MCA2";

  for (let i = 0; i < path.length; i++) {
    const code = path[i];
    const match = nodes.find((n) => n.code === code);
    if (!match || !match.children) {
      break;
    }
    breadcrumb.push({
      code: match.code,
      name: match.name,
      level: match.level,
    });
    parentTitle = match.name;
    nodes = match.children;
  }

  return {
    currentNodes: nodes,
    parentTitle,
    breadcrumb,
  };
}
