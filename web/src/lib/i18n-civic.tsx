"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type CivicLang = "IT" | "DE";

interface CivicTranslations {
  microBarTitle: string;
  navDashboard: string;
  navConfronta: string;
  navComuni: string;
  navSegnala: string;
  navOpenData: string;
  navImpostazioni: string;
  certificationStatus: string;
  precisionMca2: string;
  portalTitle: string;
  portalSubtitle: string;
  searchPlaceholder: string;
  downloadOpenData: string;
  reportTicket: string;
  kpiMultiplierAvg: string;
  kpiTotalRevenue: string;
  kpiAutofinancingAvg: string;
  kpiDebtPerCapitaAvg: string;
  lineChartTitle: string;
  barChartTitle: string;
  tableTitle: string;
  tableColMun: string;
  tableColMult: string;
  tableColDebt: string;
  tableColAutofin: string;
  tableColActions: string;
  tableActionDetails: string;
  tableShowAll: string;
  tableCollapse: string;
  tableTotalCount: string;
  drawerTitle: string;
  drawerOpenFull: string;
  drawerDownload: string;
  drawerTicketsTitle: string;
  drawerAddTicket: string;
  footerLegalSeal: string;
  footerBrand: string;
}

const DICTIONARY: Record<CivicLang, CivicTranslations> = {
  IT: {
    microBarTitle: "Progetto per la trasparenza nel Locarnese",
    navDashboard: "Panoramica Distretto",
    navConfronta: "Confronta Comuni",
    navComuni: "I 19 Comuni",
    navSegnala: "Partecipa & Segnala",
    navOpenData: "Dati Aperti (Open Data)",
    navImpostazioni: "Impostazioni",
    certificationStatus: "19/19 Comuni · MCA2 OK",
    precisionMca2: "Art. 192 LOC · Precisione 0.01 CHF",
    portalTitle: "Osservatorio Finanziario dei Comuni Locarnesi",
    portalSubtitle: "Come vengono impiegate le tue imposte nei 19 comuni locarnesi. Dati contabili ufficiali MCA2 aperti a tutti.",
    searchPlaceholder: "Cerca comune...",
    downloadOpenData: "Scarica Open Data",
    reportTicket: "Segnala / Apri Ticket",
    kpiMultiplierAvg: "Multiplicatore Medio",
    kpiTotalRevenue: "Totale Entrate Distretto",
    kpiAutofinancingAvg: "Autofinanziamento Medio",
    kpiDebtPerCapitaAvg: "Debito Pro Capite Medio",
    lineChartTitle: "Andamento Spese e Ricavi (2018-2025)",
    barChartTitle: "Spesa Pro Capite per Settore (CHF 2024)",
    tableTitle: "Tabella Comparativa Comuni (2024)",
    tableColMun: "Comune",
    tableColMult: "Multiplicatore",
    tableColDebt: "Debito p.c.",
    tableColAutofin: "Autofinanziamento",
    tableColActions: "Azioni",
    tableActionDetails: "Dettagli",
    tableShowAll: "Mostra tutti ▾",
    tableCollapse: "Riduci ▴",
    tableTotalCount: "19 Comuni Distretto Locarno",
    drawerTitle: "Dettagli Comune:",
    drawerOpenFull: "Apri Scheda Completa",
    drawerDownload: "Scarica PDF / CSV",
    drawerTicketsTitle: "Ticket e Segnalazioni",
    drawerAddTicket: "+ Segnala",
    footerLegalSeal: "Dati aperti conformi standard cantonale SEL · Art. 192 LOC",
    footerBrand: "OFCL · Trasparenza Civica",
  },
  DE: {
    microBarTitle: "Transparenzprojekt im Bezirk Locarno",
    navDashboard: "Bezirksübersicht",
    navConfronta: "Gemeinden vergleichen",
    navComuni: "Die 19 Gemeinden",
    navSegnala: "Mitwirken & Melden",
    navOpenData: "Offene Daten (Open Data)",
    navImpostazioni: "Einstellungen",
    certificationStatus: "19/19 Gemeinden · HRM2 OK",
    precisionMca2: "Art. 192 GemG · Genauigkeit 0.01 CHF",
    portalTitle: "Finanzobservatorium der Gemeinden von Locarno",
    portalSubtitle: "Wie Ihre Steuern in den 19 Gemeinden von Locarno verwendet werden. Offizielle HRM2-Finanzdaten für alle zugänglich.",
    searchPlaceholder: "Gemeinde suchen...",
    downloadOpenData: "Open Data herunterladen",
    reportTicket: "Ticket melden",
    kpiMultiplierAvg: "Durchschnittlicher Steuerfuss",
    kpiTotalRevenue: "Gesamteinnahmen Bezirk",
    kpiAutofinancingAvg: "Durchschn. Selbstfinanzierung",
    kpiDebtPerCapitaAvg: "Durchschn. Pro-Kopf-Schulden",
    lineChartTitle: "Entwicklung von Ausgaben und Einnahmen (2018-2025)",
    barChartTitle: "Pro-Kopf-Ausgaben nach Sektor (CHF 2024)",
    tableTitle: "Vergleichstabelle Gemeinden (2024)",
    tableColMun: "Gemeinde",
    tableColMult: "Steuerfuss",
    tableColDebt: "Schulden p.K.",
    tableColAutofin: "Selbstfinanzierung",
    tableColActions: "Aktionen",
    tableActionDetails: "Details",
    tableShowAll: "Alle anzeigen ▾",
    tableCollapse: "Reduzieren ▴",
    tableTotalCount: "19 Gemeinden Bezirk Locarno",
    drawerTitle: "Gemeindedetails:",
    drawerOpenFull: "Vollständige Akte öffnen",
    drawerDownload: "PDF / CSV herunterladen",
    drawerTicketsTitle: "Tickets & Meldungen",
    drawerAddTicket: "+ Melden",
    footerLegalSeal: "Offene Daten gemäss kantonalem Standard SEL · Art. 192 GemG",
    footerBrand: "OFCL · Bürger-Transparenz",
  },
};

interface CivicLangContextValue {
  lang: CivicLang;
  setLang: (lang: CivicLang) => void;
  t: CivicTranslations;
}

const CivicLangContext = createContext<CivicLangContextValue>({
  lang: "IT",
  setLang: () => {},
  t: DICTIONARY.IT,
});

export function CivicLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<CivicLang>("IT");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ofcl_lang");
      if (saved === "IT" || saved === "DE") {
        setLangState(saved);
      }
    } catch {
      // Ignora errori di storage
    }
  }, []);

  function setLang(newLang: CivicLang) {
    setLangState(newLang);
    try {
      localStorage.setItem("ofcl_lang", newLang);
    } catch {
      // Ignora errori di storage
    }
  }

  return (
    <CivicLangContext.Provider value={{ lang, setLang, t: DICTIONARY[lang] }}>
      {children}
    </CivicLangContext.Provider>
  );
}

export function useCivicLang() {
  return useContext(CivicLangContext);
}
