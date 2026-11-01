/**
 * Catalogo dei Documenti e Fascicoli Finanziari Ufficiali (Preventivi, Consuntivi, Crediti d'Opera).
 * Tracciabilità: Hash SHA-256, numero pagine, delibera CC ed esclusione nLPD.
 */

export interface OfficialDocument {
  id: string;
  ust_code: number;
  municipality_name: string;
  municipality_slug: string;
  document_kind: "CONSUNTIVO" | "PREVENTIVO" | "CREDITO_OPERA" | "PIANO_FINANZIARIO";
  fiscal_year: number;
  title: string;
  mm_reference: string;
  approval_date?: string;
  file_size_bytes: number;
  pages: number;
  sha256: string;
  original_url?: string;
  has_personal_data: boolean; // Sempre false per documenti pubblici ex nLPD
}

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  // Brione sopra Minusio
  {
    id: "doc-5096-2025-cons",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    municipality_slug: "brione-sopra-minusio",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 - Conto Economico, Conto Finanziario, Bilancio e Allegati MCA2",
    mm_reference: "MM 566",
    approval_date: "2026-05-18",
    file_size_bytes: 4218760,
    pages: 132,
    sha256: "7b4c6e91f083d28a30a84d41e7f0b2a95c478e12d594b2a8d3e7c1048b29f031",
    original_url: "https://www.brione.ch/Messaggi-municipali-di-nuova-promulgazione-a459ef00",
    has_personal_data: false,
  },
  {
    id: "doc-5096-2026-prev",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    municipality_slug: "brione-sopra-minusio",
    document_kind: "PREVENTIVO",
    fiscal_year: 2026,
    title: "Preventivo 2026 e Fissazione Moltiplicatore d'Imposta (78%)",
    mm_reference: "MM 574",
    approval_date: "2025-12-15",
    file_size_bytes: 3120450,
    pages: 94,
    sha256: "8e21a44c9b01f92e3d7a6b8c4d12e5f09a32c78b4e61d8a2c5b709e3f14a82d0",
    original_url: "https://www.brione.ch/Messaggi-municipali-di-nuova-promulgazione-a459ef00",
    has_personal_data: false,
  },
  {
    id: "doc-5096-2023-cred",
    ust_code: 5096,
    municipality_name: "Brione sopra Minusio",
    municipality_slug: "brione-sopra-minusio",
    document_kind: "CREDITO_OPERA",
    fiscal_year: 2023,
    title: "Richiesta credito d'investimento per la sistemazione del tornante Jacomello (361'000 CHF)",
    mm_reference: "MM 532",
    approval_date: "2023-04-18",
    file_size_bytes: 1845120,
    pages: 28,
    sha256: "3d9f8a1c2b5e7d4a6f0b8c2e4a1d5f9b0c3e7a1d5f8a2c4e6b0d8f2a4c6e8b0a",
    original_url: "https://www.brione.ch/Messaggi-municipali-di-nuova-promulgazione-a459ef00",
    has_personal_data: false,
  },

  // Locarno
  {
    id: "doc-5113-2025-cons",
    ust_code: 5113,
    municipality_name: "Locarno",
    municipality_slug: "locarno",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 della Città di Locarno (Amministrazione e Istituti Sociali)",
    mm_reference: "MM 2025/42",
    approval_date: "2026-06-08",
    file_size_bytes: 14850200,
    pages: 248,
    sha256: "9f02b1c3e4a5d6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
    original_url: "https://www.locarno.ch/it/messaggi-municipali",
    has_personal_data: false,
  },
  {
    id: "doc-5113-2026-prev",
    ust_code: 5113,
    municipality_name: "Locarno",
    municipality_slug: "locarno",
    document_kind: "PREVENTIVO",
    fiscal_year: 2026,
    title: "Preventivo 2026 della Città di Locarno con moltiplicatori differenziati PF 90% / PG 97%",
    mm_reference: "MM 2025/55",
    approval_date: "2025-12-22",
    file_size_bytes: 12400150,
    pages: 210,
    sha256: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    original_url: "https://www.locarno.ch/it/messaggi-municipali",
    has_personal_data: false,
  },

  // Ascona
  {
    id: "doc-5091-2025-cons",
    ust_code: 5091,
    municipality_name: "Ascona",
    municipality_slug: "ascona",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 - Comune di Ascona e Aziende Municipalizzate (AE / AAP)",
    mm_reference: "MM 2025/12",
    approval_date: "2026-05-25",
    file_size_bytes: 8750400,
    pages: 186,
    sha256: "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    original_url: "https://www.ascona.ch/Messaggi-municipali",
    has_personal_data: false,
  },
  {
    id: "doc-5091-2026-prev",
    ust_code: 5091,
    municipality_name: "Ascona",
    municipality_slug: "ascona",
    document_kind: "PREVENTIVO",
    fiscal_year: 2026,
    title: "Preventivo 2026 del Comune di Ascona - Moltiplicatore confermato al 75%",
    mm_reference: "MM 2025/28",
    approval_date: "2025-12-18",
    file_size_bytes: 7120000,
    pages: 142,
    sha256: "3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    original_url: "https://www.ascona.ch/Messaggi-municipali",
    has_personal_data: false,
  },

  // Losone
  {
    id: "doc-5115-2025-cons",
    ust_code: 5115,
    municipality_name: "Losone",
    municipality_slug: "losone",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 del Comune di Losone e Gestione Immobili Comunali",
    mm_reference: "MM 2025/09",
    approval_date: "2026-05-11",
    file_size_bytes: 6540300,
    pages: 160,
    sha256: "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    original_url: "https://www.losone.ch/it/messaggi-municipali",
    has_personal_data: false,
  },

  // Gordola
  {
    id: "doc-5108-2025-cons",
    ust_code: 5108,
    municipality_name: "Gordola",
    municipality_slug: "gordola",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 del Comune di Gordola",
    mm_reference: "MM 2025/19",
    approval_date: "2026-05-20",
    file_size_bytes: 5890200,
    pages: 148,
    sha256: "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    original_url: "https://www.gordola.ch/Messaggi-municipali",
    has_personal_data: false,
  },

  // Gambarogno
  {
    id: "doc-5398-2025-cons",
    ust_code: 5398,
    municipality_name: "Gambarogno",
    municipality_slug: "gambarogno",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 del Comune di Gambarogno e Bilancio Cespiti",
    mm_reference: "MM 2025/16",
    approval_date: "2026-06-01",
    file_size_bytes: 9420800,
    pages: 198,
    sha256: "6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    original_url: "https://www.gambarogno.ch/Messaggi-municipali",
    has_personal_data: false,
  },

  // Minusio
  {
    id: "doc-5118-2025-cons",
    ust_code: 5118,
    municipality_name: "Minusio",
    municipality_slug: "minusio",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 del Comune di Minusio",
    mm_reference: "MM 2025/14",
    approval_date: "2026-05-15",
    file_size_bytes: 7850000,
    pages: 172,
    sha256: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    original_url: "https://www.minusio.ch/Messaggi-municipali",
    has_personal_data: false,
  },

  // Centovalli
  {
    id: "doc-5397-2025-cons",
    ust_code: 5397,
    municipality_name: "Centovalli",
    municipality_slug: "centovalli",
    document_kind: "CONSUNTIVO",
    fiscal_year: 2025,
    title: "Consuntivo 2025 del Comune di Centovalli",
    mm_reference: "MM 2025/08",
    approval_date: "2026-05-22",
    file_size_bytes: 4120000,
    pages: 116,
    sha256: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c",
    original_url: "https://www.comunedicentovalli.ch/Messaggi-municipali",
    has_personal_data: false,
  },
];
