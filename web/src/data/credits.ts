/**
 * Dataset Certificato dei Crediti d'Investimento e d'Opera (Allegato f MCA2).
 * Traccia l'evoluzione delle opere pubbliche approvate dai Consigli Comunali del Locarnese.
 * Normativa: Art. 15 LOC (Controllo dei crediti d'opera e sorpassi).
 */

export interface InvestmentCredit {
  id: string;
  ust_code: number;
  municipality_slug: string;
  municipality_name: string;
  account_code: string;
  description: string;
  mm_reference: string;
  vote_date?: string;
  fiscal_year: number;
  voted_credit_chf: number;
  spent_prev_chf: number; // Speso fino al 31.12 anno precedente (01.01)
  spent_year_chf: number; // Speso durante l'esercizio
  spent_total_chf: number; // Spesa cumulata totale
  residual_chf: number; // Credito residuo (se negativo = SORPASSO)
  is_overrun: boolean; // residual_chf < 0
  pct_used: number; // (spent_total_chf / voted_credit_chf) * 100
  page_ref: number;
}

export const INVESTMENT_CREDITS: InvestmentCredit[] = [
  // Brione sopra Minusio (UST 5096) - Consuntivo 2025 Allegato f
  {
    id: "cred-5096-01",
    ust_code: 5096,
    municipality_slug: "brione-sopra-minusio",
    municipality_name: "Brione sopra Minusio",
    account_code: "615.5010.200",
    description: "Messa in sicurezza tornante Jacomello",
    mm_reference: "MM 532 / CC 2023",
    vote_date: "2023-04-18",
    fiscal_year: 2025,
    voted_credit_chf: 361000.0,
    spent_prev_chf: 346781.3,
    spent_year_chf: 30349.35,
    spent_total_chf: 377130.65,
    residual_chf: -16130.65,
    is_overrun: true,
    pct_used: 104.47,
    page_ref: 126,
  },
  {
    id: "cred-5096-02",
    ust_code: 5096,
    municipality_slug: "brione-sopra-minusio",
    municipality_name: "Brione sopra Minusio",
    account_code: "570.5010.100",
    description: "Risanamento canalizzazione e collettore via Contra",
    mm_reference: "MM 540 / CC 2023",
    vote_date: "2023-11-20",
    fiscal_year: 2025,
    voted_credit_chf: 820000.0,
    spent_prev_chf: 310000.0,
    spent_year_chf: 330200.0,
    spent_total_chf: 640200.0,
    residual_chf: 179800.0,
    is_overrun: false,
    pct_used: 78.07,
    page_ref: 126,
  },
  {
    id: "cred-5096-03",
    ust_code: 5096,
    municipality_slug: "brione-sopra-minusio",
    municipality_name: "Brione sopra Minusio",
    account_code: "150.5010.050",
    description: "Digitalizzazione archivio storico e sicurezza dati",
    mm_reference: "MM 551 / CC 2024",
    vote_date: "2024-05-14",
    fiscal_year: 2025,
    voted_credit_chf: 95000.0,
    spent_prev_chf: 42000.0,
    spent_year_chf: 52500.0,
    spent_total_chf: 94500.0,
    residual_chf: 500.0,
    is_overrun: false,
    pct_used: 99.47,
    page_ref: 127,
  },

  // Locarno (UST 5113) - Consuntivo 2025
  {
    id: "cred-5113-01",
    ust_code: 5113,
    municipality_slug: "locarno",
    municipality_name: "Locarno",
    account_code: "312.5010.010",
    description: "Riqualifica urbana Piazza Grande e arredo",
    mm_reference: "MM 2022/18",
    vote_date: "2022-09-28",
    fiscal_year: 2025,
    voted_credit_chf: 4500000.0,
    spent_prev_chf: 2600000.0,
    spent_year_chf: 1250000.0,
    spent_total_chf: 3850000.0,
    residual_chf: 650000.0,
    is_overrun: false,
    pct_used: 85.56,
    page_ref: 84,
  },
  {
    id: "cred-5113-02",
    ust_code: 5113,
    municipality_slug: "locarno",
    municipality_name: "Locarno",
    account_code: "540.5010.200",
    description: "Potenziamento bacino balneare coperto Lido Locarno",
    mm_reference: "MM 2023/04",
    vote_date: "2023-03-15",
    fiscal_year: 2025,
    voted_credit_chf: 6200000.0,
    spent_prev_chf: 3800000.0,
    spent_year_chf: 2100000.0,
    spent_total_chf: 5900000.0,
    residual_chf: 300000.0,
    is_overrun: false,
    pct_used: 95.16,
    page_ref: 85,
  },
  {
    id: "cred-5113-03",
    ust_code: 5113,
    municipality_slug: "locarno",
    municipality_name: "Locarno",
    account_code: "620.5010.080",
    description: "Completamento tracciato ciclabile Locarno-Muralto",
    mm_reference: "MM 2023/29",
    vote_date: "2023-10-12",
    fiscal_year: 2025,
    voted_credit_chf: 1100000.0,
    spent_prev_chf: 920000.0,
    spent_year_chf: 225000.0,
    spent_total_chf: 1145000.0,
    residual_chf: -45000.0,
    is_overrun: true,
    pct_used: 104.09,
    page_ref: 86,
  },

  // Ascona (UST 5091) - Consuntivo 2025
  {
    id: "cred-5091-01",
    ust_code: 5091,
    municipality_slug: "ascona",
    municipality_name: "Ascona",
    account_code: "410.5010.010",
    description: "Risanamento e ripavimentazione nucleo storico Borgo",
    mm_reference: "MM 2022/31",
    vote_date: "2022-12-05",
    fiscal_year: 2025,
    voted_credit_chf: 3200000.0,
    spent_prev_chf: 1800000.0,
    spent_year_chf: 1150000.0,
    spent_total_chf: 2950000.0,
    residual_chf: 250000.0,
    is_overrun: false,
    pct_used: 92.19,
    page_ref: 92,
  },
  {
    id: "cred-5091-02",
    ust_code: 5091,
    municipality_slug: "ascona",
    municipality_name: "Ascona",
    account_code: "610.5010.030",
    description: "Potenziamento acquedotto comunale e stazione captazione lago",
    mm_reference: "MM 2023/15",
    vote_date: "2023-06-20",
    fiscal_year: 2025,
    voted_credit_chf: 2100000.0,
    spent_prev_chf: 850000.0,
    spent_year_chf: 1030000.0,
    spent_total_chf: 1880000.0,
    residual_chf: 220000.0,
    is_overrun: false,
    pct_used: 89.52,
    page_ref: 93,
  },

  // Losone (UST 5115) - Consuntivo 2025
  {
    id: "cred-5115-01",
    ust_code: 5115,
    municipality_slug: "losone",
    municipality_name: "Losone",
    account_code: "720.5010.040",
    description: "Nuova passerella ciclopedonale sul fiume Maggia",
    mm_reference: "MM 2023/08",
    vote_date: "2023-05-08",
    fiscal_year: 2025,
    voted_credit_chf: 1850000.0,
    spent_prev_chf: 1200000.0,
    spent_year_chf: 520000.0,
    spent_total_chf: 1720000.0,
    residual_chf: 130000.0,
    is_overrun: false,
    pct_used: 92.97,
    page_ref: 78,
  },

  // Gordola (UST 5108) - Consuntivo 2025
  {
    id: "cred-5108-01",
    ust_code: 5108,
    municipality_slug: "gordola",
    municipality_name: "Gordola",
    account_code: "530.5010.020",
    description: "Riqualifica centro sportivo comunale e illuminazione LED",
    mm_reference: "MM 2024/02",
    vote_date: "2024-02-19",
    fiscal_year: 2025,
    voted_credit_chf: 1450000.0,
    spent_prev_chf: 450000.0,
    spent_year_chf: 930000.0,
    spent_total_chf: 1380000.0,
    residual_chf: 70000.0,
    is_overrun: false,
    pct_used: 95.17,
    page_ref: 65,
  },

  // Gambarogno (UST 5398) - Consuntivo 2025
  {
    id: "cred-5398-01",
    ust_code: 5398,
    municipality_slug: "gambarogno",
    municipality_name: "Gambarogno",
    account_code: "640.5010.050",
    description: "Messa in sicurezza versante montano e regimazione acque Indemini",
    mm_reference: "MM 2023/15",
    vote_date: "2023-11-27",
    fiscal_year: 2025,
    voted_credit_chf: 1600000.0,
    spent_prev_chf: 1100000.0,
    spent_year_chf: 590000.0,
    spent_total_chf: 1690000.0,
    residual_chf: -90000.0,
    is_overrun: true,
    pct_used: 105.63,
    page_ref: 112,
  },
];
