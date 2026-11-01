"""
Seed deterministico dei dati di riferimento (schema `ref.*`) per OFCL.

Carica e valida:
1. I 19 Comuni del Distretto di Locarno (UST 5091..5399) e i rispettivi enti/aziende municipalizzate da `registry/comuni.yaml`.
2. Il Piano dei conti MCA2 per natura (`ref.account_mca2` - CE, CI, BIL).
3. La Classificazione funzionale per dicastero MCA2 (`ref.function_mca2` - Dicasteri 0..9).
4. La serie storica integrale dei moltiplicatori comunali PF e PG 2019-2026 (`ref.tax_multiplier`).
5. Gli 8 Indicatori Finanziari Ufficiali SEL (`ref.indicator_def` e `ref.indicator_scale` - art. 22 lett. o RGFCC).

Genera `supabase/seed.sql` idempotente e pronto per PostgreSQL 16 / Supabase.
"""

from __future__ import annotations

import os
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

FORBIDDEN_CORFIN_REF = "vrqnbdcsavgpdgijpiic"
SEL_MCA2_SOURCE_URL = "https://www4.ti.ch/di/sel/comuni/mca2/"
MEGA_MULTIPLIERS_URL = "https://www.fiduciariamega.ch/wp-content/uploads/2026/09/Opuscolo-moltiplicatori-2026-web.pdf"


def enforce_corfin_guardrail() -> None:
    """Guardrail C-01: blocca qualsiasi operazione se punta al progetto Corfin."""
    for env_var in ("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL", "POSTGRES_URL"):
        val = os.environ.get(env_var, "")
        if FORBIDDEN_CORFIN_REF in val:
            raise RuntimeError(
                f"[CRITICAL C-01 VIOLATION] Rilevato riferimento a Corfin in {env_var}. "
                "Operazione bloccata."
            )


class EntitySpec(BaseModel):
    kind: Literal["COMUNE", "AAP", "AE", "PORTO", "CASA_ANZIANI", "ENTE_AUTONOMO", "ALTRO"]
    name: str
    aliases: list[str] = Field(default_factory=list)


class SourceSpec(BaseModel):
    kind: Literal["MM_INDEX", "CONTI_INDEX", "ALBO", "SESSION_INDEX", "WP_CATEGORY", "MANUAL"]
    url: str
    strategy: str
    params: dict[str, int | str] = Field(default_factory=dict)


class RobotsSpec(BaseModel):
    crawl_delay_s: int = 5
    disallow_all: bool = False


class MunicipalitySpec(BaseModel):
    ust_code: int = Field(ge=5001, le=5999)
    slug: str
    name: str
    circle: str
    cms_family: Literal["ASSOLO", "WORDPRESS", "JOOMLA", "CUSTOM_PHP", "CITY_LOCARNO", "UNKNOWN"]
    seat: str | None = None
    valid_from: date | str | None = None
    merger_note: str | None = None
    delegation_threshold_chf: int | None = None
    entities: list[EntitySpec]
    sources: list[SourceSpec]
    robots: RobotsSpec
    active: bool = True


# ==============================================================================
# 1. PIANO DEI CONTI MCA2 PER NATURA (Classi 1-6)
# ==============================================================================
ACCOUNTS_MCA2: list[tuple[str, int, str | None, str, str]] = [
    # BILANCIO - ATTIVI (Classe 1)
    ("1", 1, None, "Attivi", "BIL"),
    ("10", 2, "1", "Beni patrimoniali", "BIL"),
    ("100", 3, "10", "Mezzi liquidi e crediti da imposte/tasse a breve", "BIL"),
    ("1000", 4, "100", "Cassa, Posta e Banche (Liquidità)", "BIL"),
    ("101", 3, "10", "Crediti", "BIL"),
    ("1012", 4, "101", "Debitori d'imposta", "BIL"),
    ("104", 3, "10", "Ratei e risconti attivi", "BIL"),
    ("107", 3, "10", "Partecipazioni e capitali di dotazione nei BP", "BIL"),
    ("108", 3, "10", "Immobili dei beni patrimoniali", "BIL"),
    ("14", 2, "1", "Beni amministrativi", "BIL"),
    ("140", 3, "14", "Beni materiali amministrativi", "BIL"),
    ("1400", 4, "140", "Terreni non edificati BA", "BIL"),
    ("1401", 4, "140", "Opere del genio civile (strade, ponti, canalizzazioni)", "BIL"),
    ("1402", 4, "140", "Opere idrauliche e arginature", "BIL"),
    ("1403", 4, "140", "Edifici (scuole, stabili comunali, impianti sportivi)", "BIL"),
    ("1404", 4, "140", "Beni mobili, veicoli, macchinari e attrezzature", "BIL"),
    ("142", 3, "14", "Beni immateriali (Piani regolatori, software, studi)", "BIL"),
    ("144", 3, "14", "Prestiti e mutui dei beni amministrativi", "BIL"),
    ("145", 3, "14", "Partecipazioni dei beni amministrativi", "BIL"),
    ("146", 3, "14", "Contributi d'investimento concessi a terzi", "BIL"),
    # BILANCIO - PASSIVI (Classe 2)
    ("2", 1, None, "Passivi", "BIL"),
    ("20", 2, "2", "Capitale di terzi", "BIL"),
    ("200", 3, "20", "Impegni correnti (Fornitori e creditori diversi)", "BIL"),
    ("201", 3, "20", "Debiti finanziari a breve termine", "BIL"),
    ("204", 3, "20", "Ratei e risconti passivi", "BIL"),
    ("205", 3, "20", "Accantonamenti a breve termine", "BIL"),
    ("206", 3, "20", "Debiti finanziari a medio e lungo termine (Mutui/Prestiti)", "BIL"),
    ("208", 3, "20", "Accantonamenti a lungo termine", "BIL"),
    ("29", 2, "2", "Capitale proprio", "BIL"),
    ("290", 3, "29", "Impegni/Crediti verso finanziamenti speciali (Servizi a copertura costi)", "BIL"),
    ("2910", 4, "290", "Fondi finanziamenti speciali (Acqua 710, Depurazione 720, Rifiuti 730)", "BIL"),
    ("299", 3, "29", "Risultati d'esercizio e Capitale proprio libero", "BIL"),
    ("2990", 4, "299", "Avanzo / Disavanzo d'esercizio dell'anno contabile", "BIL"),
    ("2999", 4, "299", "Risultati cumulati degli esercizi precedenti (Capitale proprio)", "BIL"),
    # CONTO ECONOMICO - SPESE (Classe 3)
    ("3", 1, None, "Spese di gestione corrente", "CE"),
    ("30", 2, "3", "Spese per il personale", "CE"),
    ("3010", 4, "30", "Stipendi del personale amministrativo e operaio", "CE"),
    ("3020", 4, "30", "Stipendi dei docenti comunali", "CE"),
    ("3050", 4, "30", "Contributi datore di lavoro (AVS/AI/IPG/AD, Cassa pensioni)", "CE"),
    ("31", 2, "3", "Spese per beni e servizi e altre spese operative", "CE"),
    ("310", 3, "31", "Acquisto materiali e merci", "CE"),
    ("3120", 4, "31", "Fornitura acqua, energia elettrica e riscaldamento stabili", "CE"),
    ("3130", 4, "31", "Prestazioni di servizi e onorari di terzi", "CE"),
    ("314", 3, "31", "Manutenzione ordinaria beni immobili e genio civile", "CE"),
    ("33", 2, "3", "Ammortamenti dei beni amministrativi", "CE"),
    ("330", 3, "33", "Ammortamenti dei beni materiali BA", "CE"),
    ("3300", 4, "330", "Ammortamenti pianificati sui beni materiali BA", "CE"),
    ("3301", 4, "330", "Ammortamenti non pianificati sui beni materiali BA", "CE"),
    ("332", 3, "33", "Ammortamenti dei beni immateriali BA", "CE"),
    ("3320", 4, "332", "Ammortamenti pianificati sui beni immateriali BA", "CE"),
    ("34", 2, "3", "Spese finanziarie", "CE"),
    ("340", 3, "34", "Interessi passivi su debiti finanziari", "CE"),
    ("3401", 4, "340", "Interessi passivi debiti a breve termine", "CE"),
    ("3406", 4, "340", "Interessi passivi debiti a medio e lungo termine", "CE"),
    ("35", 2, "3", "Versamenti a finanziamenti speciali e fondi nel capitale proprio", "CE"),
    ("3510", 4, "35", "Versamenti a finanziamenti speciali (eccedenze ricavi servizi)", "CE"),
    ("36", 2, "3", "Spese di trasferimento", "CE"),
    ("361", 3, "36", "Indennità a enti pubblici (Consorzi e Comuni)", "CE"),
    ("3612", 4, "361", "Indennità a Comuni e Consorzi (Polizia, Pompieri, PCi, Scuole)", "CE"),
    ("363", 3, "36", "Contributi a enti pubblici e privati", "CE"),
    ("3631", 4, "363", "Contributi al Cantone (Trasporto pubblico, FART, CTA, Ticino 2020)", "CE"),
    ("3632", 4, "363", "Contributi a Comuni, Consorzi e Case anziani (conguaglio cantonale)", "CE"),
    ("364", 3, "36", "Rettifiche di valore di prestiti e partecipazioni BA", "CE"),
    ("366", 3, "36", "Ammortamenti pianificati dei contributi d'investimento", "CE"),
    ("3660", 4, "366", "Ammortamenti pianificati su contributi d'investimento concessi", "CE"),
    ("37", 2, "3", "Riversamenti di entrate", "CE"),
    ("38", 2, "3", "Spese straordinarie", "CE"),
    ("389", 3, "38", "Versamenti supplementari al Capitale proprio", "CE"),
    ("39", 2, "3", "Addebiti interni", "CE"),
    ("3910", 4, "39", "Addebiti interni di prestazioni di servizi", "CE"),
    ("3940", 4, "39", "Addebiti interni di interessi calcolatori", "CE"),
    # CONTO ECONOMICO - RICAVI (Classe 4)
    ("4", 1, None, "Ricavi di gestione corrente", "CE"),
    ("40", 2, "4", "Ricavi fiscali (Imposte)", "CE"),
    ("400", 3, "40", "Imposte dirette Persone Fisiche (PF)", "CE"),
    ("4000", 4, "400", "Imposta comunale anno corrente e sopravvenienze (4000.101)", "CE"),
    ("401", 3, "40", "Imposte dirette Persone Giuridiche (PG)", "CE"),
    ("4010", 4, "401", "Imposta sull'utile e sul capitale PG e imposta immobiliare", "CE"),
    ("402", 3, "40", "Altre imposte (Utili immobiliari TUI, imposta cani)", "CE"),
    ("41", 2, "4", "Regalie e concessioni", "CE"),
    ("42", 2, "4", "Tasse, emolumenti e tariffe d'utenza", "CE"),
    ("4240", 4, "42", "Tasse d'utenza (Acqua, Canalizzazioni, Rifiuti)", "CE"),
    ("43", 2, "4", "Ricavi diversi", "CE"),
    ("44", 2, "4", "Ricavi finanziari", "CE"),
    ("440", 3, "44", "Interessi attivi e redditi da titoli", "CE"),
    ("4430", 4, "44", "Ricavi da locazione immobili dei beni patrimoniali", "CE"),
    ("45", 2, "4", "Prelievi da finanziamenti speciali e fondi nel capitale proprio", "CE"),
    ("4500", 4, "45", "Prelievi da fondi (incluso FER Fondo Energie Rinnovabili)", "CE"),
    ("4510", 4, "45", "Prelievi da finanziamenti speciali (copertura disavanzi servizi)", "CE"),
    ("46", 2, "4", "Ricavi di trasferimento", "CE"),
    ("461", 3, "46", "Indennità da enti pubblici", "CE"),
    ("462", 3, "46", "Perequazione finanziaria (Contributo di livellamento)", "CE"),
    ("463", 3, "46", "Contributi da Cantone, Confederazione e Comuni", "CE"),
    ("47", 2, "4", "Sovvenzioni da riversare", "CE"),
    ("48", 2, "4", "Ricavi straordinari", "CE"),
    ("489", 3, "48", "Prelievi dal Capitale proprio", "CE"),
    ("49", 2, "4", "Accrediti interni", "CE"),
    ("4910", 4, "49", "Accrediti interni di prestazioni di servizi", "CE"),
    ("4940", 4, "49", "Accrediti interni di interessi calcolatori", "CE"),
    # CONTO DEGLI INVESTIMENTI - USCITE (Classe 5)
    ("5", 1, None, "Uscite per investimenti", "CI"),
    ("50", 2, "5", "Beni materiali amministrativi (Attivazione)", "CI"),
    ("5010", 4, "50", "Strade e vie di comunicazione", "CI"),
    ("5020", 4, "50", "Opere idrauliche e arginature", "CI"),
    ("5030", 4, "50", "Edifici e impianti comunali", "CI"),
    ("5060", 4, "50", "Mobili, veicoli, macchinari e impianti tecnici", "CI"),
    ("52", 2, "5", "Beni immateriali (Pianificazioni, PR, software)", "CI"),
    ("5290", 4, "52", "Altri beni immateriali (GIS, PGS, PGA)", "CI"),
    ("54", 2, "5", "Prestiti dei beni amministrativi", "CI"),
    ("55", 2, "5", "Partecipazioni dei beni amministrativi", "CI"),
    ("56", 2, "5", "Contributi d'investimento propri concessi a terzi", "CI"),
    # CONTO DEGLI INVESTIMENTI - ENTRATE (Classe 6)
    ("6", 1, None, "Entrate per investimenti", "CI"),
    ("60", 2, "6", "Trasferimento di beni materiali ai beni patrimoniali", "CI"),
    ("61", 2, "6", "Contributi di miglioria e di costruzione da terzi", "CI"),
    ("63", 2, "6", "Contributi d'investimento ricevuti (Sussidi Confederazione/Cantone/PALoc)", "CI"),
    ("64", 2, "6", "Rimborso di prestiti dei beni amministrativi", "CI"),
    ("66", 2, "6", "Rimborso di contributi d'investimento propri", "CI"),
]

# ==============================================================================
# 2. CLASSIFICAZIONE FUNZIONALE MCA2 (10 Dicasteri e Sottodicasteri principali)
# ==============================================================================
FUNCTIONS_MCA2: list[tuple[str, int, str | None, str]] = [
    ("0", 1, None, "Amministrazione generale"),
    ("01", 2, "0", "Organi legislativo ed esecutivo"),
    ("011", 3, "01", "Potere legislativo (Consiglio comunale)"),
    ("012", 3, "01", "Potere esecutivo (Municipio)"),
    ("02", 2, "0", "Amministrazione generale"),
    ("021", 3, "02", "Amministrazione finanze e contribuzioni"),
    ("022", 3, "02", "Servizi generali e Cancelleria"),
    ("029", 3, "02", "Amministrazione immobili comunali"),
    ("1", 1, None, "Ordine e sicurezza pubblica, difesa"),
    ("11", 2, "1", "Sicurezza pubblica"),
    ("111", 3, "11", "Polizia comunale e intercomunale"),
    ("15", 2, "1", "Difesa contro il fuoco"),
    ("150", 3, "15", "Corpo Pompieri"),
    ("16", 2, "1", "Difesa generale"),
    ("162", 3, "16", "Protezione civile regionale"),
    ("2", 1, None, "Educazione"),
    ("21", 2, "2", "Scuola dell'obbligo"),
    ("211", 3, "21", "Scuola dell'infanzia"),
    ("212", 3, "21", "Scuola elementare"),
    ("213", 3, "21", "Scuola media (contributo cantonale)"),
    ("217", 3, "21", "Stabili e impianti scolastici"),
    ("3", 1, None, "Cultura, sport e tempo libero, chiesa"),
    ("31", 2, "3", "Beni culturali e musei"),
    ("32", 2, "3", "Cultura, biblioteche e manifestazioni"),
    ("34", 2, "3", "Sport e tempo libero"),
    ("341", 3, "34", "Impianti sportivi e palestre"),
    ("343", 3, "34", "Lidi comunali e porti"),
    ("4", 1, None, "Salute pubblica"),
    ("41", 2, "4", "Ospedali, case per anziani e di cura"),
    ("412", 3, "41", "Case per anziani medicalizzate"),
    ("42", 2, "4", "Servizi ambulatoriali e cure a domicilio (SACD)"),
    ("5", 1, None, "Previdenza sociale"),
    ("53", 2, "5", "Vecchiaia e superstiti (Contributi AVS/PC)"),
    ("54", 2, "5", "Famiglia e gioventù (Asili nido, strutture extrascolastiche)"),
    ("57", 2, "5", "Aiuto sociale e assistenza"),
    ("6", 1, None, "Traffico e trasporti"),
    ("61", 2, "6", "Circolazione stradale"),
    ("615", 3, "61", "Strade comunali, piazze e posteggi"),
    ("62", 2, "6", "Trasporti pubblici"),
    ("622", 3, "62", "Traffico regionale e d'agglomerato (PALoc / FART / CTA)"),
    ("7", 1, None, "Protezione dell'ambiente e pianificazione del territorio"),
    ("71", 2, "7", "Approvvigionamento idrico"),
    ("710", 3, "71", "Servizio approvvigionamento idrico"),
    ("72", 2, "7", "Protezione delle acque e depurazione"),
    ("720", 3, "72", "Smaltimento e depurazione delle acque (Canalizzazioni/IDA)"),
    ("73", 2, "7", "Gestione dei rifiuti"),
    ("730", 3, "73", "Servizio raccolta e smaltimento rifiuti"),
    ("74", 2, "7", "Sistemazione corsi d'acqua e opere di premunizione"),
    ("77", 2, "7", "Cimitero e pompe funebri"),
    ("79", 2, "7", "Pianificazione del territorio (Piano regolatore)"),
    ("8", 1, None, "Economia pubblica"),
    ("81", 2, "8", "Agricoltura e foreste"),
    ("84", 2, "8", "Turismo"),
    ("86", 2, "8", "Energia"),
    ("863", 3, "86", "Elettricità e Fondo Energie Rinnovabili (FER)"),
    ("9", 1, None, "Finanze e imposte"),
    ("91", 2, "9", "Imposte"),
    ("910", 3, "91", "Imposte comunali (PF, PG, TUI)"),
    ("93", 2, "9", "Perequazione finanziaria intercomunale"),
    ("96", 2, "9", "Amministrazione del patrimonio e del debito"),
    ("99", 2, "9", "Voci non ripartite e chiusura"),
    ("990", 3, "99", "Sopravvenienze e partite diverse"),
]

# ==============================================================================
# 3. MOLTIPLICATORI STORICI PF E PG (2019-2026) PER I 19 COMUNI DEL LOCARNESE
# Formato: ust_code -> {year: (pf_pct, pg_pct)}
# ==============================================================================
TAX_MULTIPLIERS_2019_2026: dict[int, dict[int, tuple[Decimal, Decimal]]] = {
    5091: {y: (Decimal("75.00"), Decimal("75.00")) for y in range(2019, 2027)},  # Ascona
    5096: {y: (Decimal("78.00"), Decimal("78.00")) for y in range(2019, 2027)},  # Brione s/Minusio
    5097: {y: (Decimal("85.00"), Decimal("85.00")) for y in range(2019, 2027)},  # Brissago
    5108: {  # Gordola
        2019: (Decimal("84.00"), Decimal("84.00")),
        2020: (Decimal("84.00"), Decimal("84.00")),
        2021: (Decimal("84.00"), Decimal("84.00")),
        2022: (Decimal("84.00"), Decimal("84.00")),
        2023: (Decimal("88.00"), Decimal("88.00")),
        2024: (Decimal("86.00"), Decimal("86.00")),
        2025: (Decimal("86.00"), Decimal("86.00")),
        2026: (Decimal("88.00"), Decimal("88.00")),
    },
    5112: {y: (Decimal("100.00"), Decimal("100.00")) for y in range(2019, 2027)},  # Lavertezzo
    5113: {  # Locarno (PG differenziato al 97% dal 2025)
        2019: (Decimal("90.00"), Decimal("90.00")),
        2020: (Decimal("90.00"), Decimal("90.00")),
        2021: (Decimal("90.00"), Decimal("90.00")),
        2022: (Decimal("90.00"), Decimal("90.00")),
        2023: (Decimal("90.00"), Decimal("90.00")),
        2024: (Decimal("90.00"), Decimal("90.00")),
        2025: (Decimal("90.00"), Decimal("97.00")),
        2026: (Decimal("90.00"), Decimal("97.00")),
    },
    5115: {y: (Decimal("90.00"), Decimal("90.00")) for y in range(2019, 2027)},  # Losone
    5117: {y: (Decimal("100.00"), Decimal("100.00")) for y in range(2019, 2027)},  # Mergoscia
    5118: {  # Minusio
        2019: (Decimal("78.00"), Decimal("78.00")),
        2020: (Decimal("78.00"), Decimal("78.00")),
        2021: (Decimal("78.00"), Decimal("78.00")),
        2022: (Decimal("78.00"), Decimal("78.00")),
        2023: (Decimal("78.00"), Decimal("78.00")),
        2024: (Decimal("78.00"), Decimal("78.00")),
        2025: (Decimal("82.00"), Decimal("82.00")),
        2026: (Decimal("82.00"), Decimal("82.00")),
    },
    5120: {  # Muralto
        2019: (Decimal("80.00"), Decimal("80.00")),
        2020: (Decimal("80.00"), Decimal("80.00")),
        2021: (Decimal("80.00"), Decimal("80.00")),
        2022: (Decimal("78.00"), Decimal("78.00")),
        2023: (Decimal("78.00"), Decimal("78.00")),
        2024: (Decimal("73.00"), Decimal("73.00")),
        2025: (Decimal("75.00"), Decimal("75.00")),
        2026: (Decimal("75.00"), Decimal("75.00")),
    },
    5121: {  # Orselina
        2019: (Decimal("70.00"), Decimal("70.00")),
        2020: (Decimal("75.00"), Decimal("75.00")),
        2021: (Decimal("75.00"), Decimal("75.00")),
        2022: (Decimal("75.00"), Decimal("75.00")),
        2023: (Decimal("75.00"), Decimal("75.00")),
        2024: (Decimal("82.00"), Decimal("82.00")),
        2025: (Decimal("82.00"), Decimal("82.00")),
        2026: (Decimal("82.00"), Decimal("82.00")),
    },
    5125: {y: (Decimal("75.00"), Decimal("75.00")) for y in range(2019, 2027)},  # Ronco s/Ascona
    5131: {y: (Decimal("93.00"), Decimal("93.00")) for y in range(2019, 2027)},  # Tenero-Contra
    5136: {y: (Decimal("95.00"), Decimal("95.00")) for y in range(2019, 2027)},  # Onsernone
    5138: {  # Cugnasco-Gerra
        2019: (Decimal("90.00"), Decimal("90.00")),
        2020: (Decimal("90.00"), Decimal("90.00")),
        2021: (Decimal("90.00"), Decimal("90.00")),
        2022: (Decimal("86.00"), Decimal("86.00")),
        2023: (Decimal("86.00"), Decimal("86.00")),
        2024: (Decimal("88.00"), Decimal("88.00")),
        2025: (Decimal("90.00"), Decimal("90.00")),
        2026: (Decimal("90.00"), Decimal("90.00")),
    },
    5396: {  # Terre di Pedemonte
        2019: (Decimal("90.00"), Decimal("90.00")),
        2020: (Decimal("90.00"), Decimal("90.00")),
        2021: (Decimal("90.00"), Decimal("90.00")),
        2022: (Decimal("85.00"), Decimal("85.00")),
        2023: (Decimal("85.00"), Decimal("85.00")),
        2024: (Decimal("85.00"), Decimal("85.00")),
        2025: (Decimal("85.00"), Decimal("85.00")),
        2026: (Decimal("85.00"), Decimal("85.00")),
    },
    5397: {  # Centovalli (PG differenziato al 120% nel 2026)
        2019: (Decimal("95.00"), Decimal("95.00")),
        2020: (Decimal("95.00"), Decimal("95.00")),
        2021: (Decimal("95.00"), Decimal("95.00")),
        2022: (Decimal("95.00"), Decimal("95.00")),
        2023: (Decimal("95.00"), Decimal("95.00")),
        2024: (Decimal("95.00"), Decimal("95.00")),
        2025: (Decimal("95.00"), Decimal("95.00")),
        2026: (Decimal("95.00"), Decimal("120.00")),
    },
    5398: {  # Gambarogno (PG differenziato al 100% dal 2025)
        2019: (Decimal("85.00"), Decimal("85.00")),
        2020: (Decimal("85.00"), Decimal("85.00")),
        2021: (Decimal("85.00"), Decimal("85.00")),
        2022: (Decimal("85.00"), Decimal("85.00")),
        2023: (Decimal("85.00"), Decimal("85.00")),
        2024: (Decimal("85.00"), Decimal("85.00")),
        2025: (Decimal("85.00"), Decimal("100.00")),
        2026: (Decimal("85.00"), Decimal("100.00")),
    },
    5399: {  # Verzasca (Operativo dal 2021 dopo fusione 18.10.2020)
        2021: (Decimal("95.00"), Decimal("95.00")),
        2022: (Decimal("95.00"), Decimal("95.00")),
        2023: (Decimal("95.00"), Decimal("95.00")),
        2024: (Decimal("100.00"), Decimal("100.00")),
        2025: (Decimal("100.00"), Decimal("100.00")),
        2026: (Decimal("100.00"), Decimal("100.00")),
    },
}

# ==============================================================================
# 4. DEFINIZIONE DEGLI 8 INDICATORI FINANZIARI UFFICIALI SEL (Art. 22 lett. o RGFCC)
# ==============================================================================
INDICATORS_DEF: list[tuple[str, str, str, str, bool]] = [
    (
        "NET_DEBT_RATIO",
        "1. Tasso di indebitamento netto",
        "(Capitale di terzi - Beni patrimoniali) / Gettito d'imposta * 100",
        "PCT",
        False,
    ),
    (
        "SELF_FINANCING_DEGREE",
        "2. Grado di autofinanziamento",
        "Autofinanziamento / Investimenti netti sui beni amministrativi * 100",
        "PCT",
        True,
    ),
    (
        "INTEREST_BURDEN_RATIO",
        "3. Quota delle spese per interessi",
        "(Spese per interessi 340 - Ricavi da interessi 440) / Ricavi correnti * 100",
        "PCT",
        False,
    ),
    (
        "NET_DEBT_PER_CAPITA",
        "4. Debito pubblico netto pro capite",
        "(Capitale di terzi - Beni patrimoniali) / Popolazione residente permanente",
        "CHF_PER_CAPITA",
        False,
    ),
    (
        "INVESTMENT_RATIO",
        "5. Quota degli investimenti",
        "Investimenti lordi sui beni amministrativi / Uscite consolidate * 100",
        "PCT",
        True,
    ),
    (
        "EQUITY_RATIO",
        "6. Quota di capitale proprio",
        "Capitale proprio / Totale dei passivi * 100",
        "PCT",
        True,
    ),
    (
        "CAPITAL_SERVICE_RATIO",
        "7. Quota degli oneri finanziari",
        "(Interessi netti + Ammortamenti 33) / Ricavi correnti * 100",
        "PCT",
        False,
    ),
    (
        "SELF_FINANCING_CAPACITY",
        "8. Capacità di autofinanziamento",
        "Autofinanziamento / Ricavi correnti * 100",
        "PCT",
        True,
    ),
]

# Scale ufficiali SEL (Manuale MCA2 - Sezione degli enti locali)
# Formato: (indicator_code, valid_from, band_order, lower_bound, upper_bound, label_it, color_token)
INDICATOR_SCALES: list[tuple[str, str, int, str | None, str | None, str, str]] = [
    # 1. Tasso di indebitamento netto
    ("NET_DEBT_RATIO", "2022-01-01", 1, None, "100.0", "Buono", "good"),
    ("NET_DEBT_RATIO", "2022-01-01", 2, "100.0", "150.0", "Accettabile", "ok"),
    ("NET_DEBT_RATIO", "2022-01-01", 3, "150.0", None, "Eccessivo", "bad"),
    # 2. Grado di autofinanziamento
    ("SELF_FINANCING_DEGREE", "2022-01-01", 1, "100.0", None, "Buono", "good"),
    ("SELF_FINANCING_DEGREE", "2022-01-01", 2, "80.0", "100.0", "Normale", "ok"),
    ("SELF_FINANCING_DEGREE", "2022-01-01", 3, None, "80.0", "Debole", "bad"),
    # 3. Quota delle spese per interessi
    ("INTEREST_BURDEN_RATIO", "2022-01-01", 1, None, "4.0", "Buono", "good"),
    ("INTEREST_BURDEN_RATIO", "2022-01-01", 2, "4.0", "9.0", "Sufficiente", "ok"),
    ("INTEREST_BURDEN_RATIO", "2022-01-01", 3, "9.0", None, "Eccessivo", "bad"),
    # 4. Debito pubblico netto pro capite
    ("NET_DEBT_PER_CAPITA", "2022-01-01", 1, None, "1000.0", "Basso", "good"),
    ("NET_DEBT_PER_CAPITA", "2022-01-01", 2, "1000.0", "3000.0", "Medio", "ok"),
    ("NET_DEBT_PER_CAPITA", "2022-01-01", 3, "3000.0", "5000.0", "Elevato", "warn"),
    ("NET_DEBT_PER_CAPITA", "2022-01-01", 4, "5000.0", None, "Eccessivo", "bad"),
    # 5. Quota degli investimenti
    ("INVESTMENT_RATIO", "2022-01-01", 1, None, "10.0", "Ridotta", "ok"),
    ("INVESTMENT_RATIO", "2022-01-01", 2, "10.0", "20.0", "Media", "good"),
    ("INVESTMENT_RATIO", "2022-01-01", 3, "20.0", "30.0", "Elevata", "warn"),
    ("INVESTMENT_RATIO", "2022-01-01", 4, "30.0", None, "Molto elevata", "bad"),
    # 6. Quota di capitale proprio
    ("EQUITY_RATIO", "2022-01-01", 1, None, "10.0", "Debole", "bad"),
    ("EQUITY_RATIO", "2022-01-01", 2, "10.0", "20.0", "Media", "ok"),
    ("EQUITY_RATIO", "2022-01-01", 3, "20.0", "40.0", "Buona", "good"),
    ("EQUITY_RATIO", "2022-01-01", 4, "40.0", None, "Eccessiva", "warn"),
    # 7. Quota degli oneri finanziari
    ("CAPITAL_SERVICE_RATIO", "2022-01-01", 1, None, "5.0", "Debole", "good"),
    ("CAPITAL_SERVICE_RATIO", "2022-01-01", 2, "5.0", "15.0", "Sopportabile", "ok"),
    ("CAPITAL_SERVICE_RATIO", "2022-01-01", 3, "15.0", None, "Alto", "bad"),
    # 8. Capacità di autofinanziamento
    ("SELF_FINANCING_CAPACITY", "2022-01-01", 1, "20.0", None, "Buona", "good"),
    ("SELF_FINANCING_CAPACITY", "2022-01-01", 2, "10.0", "20.0", "Media", "ok"),
    ("SELF_FINANCING_CAPACITY", "2022-01-01", 3, None, "10.0", "Debole", "bad"),
]


def _sql_str(val: str | None) -> str:
    if val is None:
        return "NULL"
    escaped = val.replace("'", "''")
    return f"'{escaped}'"


def load_municipalities(yaml_path: Path) -> list[MunicipalitySpec]:
    raw_data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    municipalities = [MunicipalitySpec.model_validate(item) for item in raw_data]
    if len(municipalities) != 19:
        raise ValueError(f"Attesi 19 comuni nel Locarnese, trovati {len(municipalities)}")
    return municipalities


def generate_seed_sql(municipalities: list[MunicipalitySpec]) -> str:
    lines: list[str] = [
        "-- =========================================================",
        "-- OFCL Deterministic Seed SQL (ref.* + raw.source)",
        "-- Generato automaticamente da pipeline/src/ofcl/seed_ref.py",
        "-- =========================================================",
        "",
        "BEGIN;",
        "",
        "-- 1. Comuni del Distretto di Locarno (19 Comuni)",
    ]

    for m in municipalities:
        lines.append(
            f"INSERT INTO ref.municipality (ust_code, slug, name, seat, circle, district_code, cms_family, valid_from, merger_note) "
            f"VALUES ({m.ust_code}, {_sql_str(m.slug)}, {_sql_str(m.name)}, {_sql_str(m.seat)}, "
            f"{_sql_str(m.circle)}, 2104, {_sql_str(m.cms_family)}, "
            f"{_sql_str(str(m.valid_from) if m.valid_from else None)}, {_sql_str(m.merger_note)}) "
            f"ON CONFLICT (ust_code) DO UPDATE SET "
            f"slug = EXCLUDED.slug, name = EXCLUDED.name, seat = EXCLUDED.seat, "
            f"circle = EXCLUDED.circle, cms_family = EXCLUDED.cms_family, "
            f"valid_from = EXCLUDED.valid_from, merger_note = EXCLUDED.merger_note;"
        )

    lines.extend(["", "-- 2. Enti Contabili e Aziende Municipalizzate"])
    for m in municipalities:
        for ent in m.entities:
            aliases_sql = "ARRAY[" + ", ".join(_sql_str(a) for a in ent.aliases) + "]::text[]" if ent.aliases else "'{}'::text[]"
            lines.append(
                f"INSERT INTO ref.entity (ust_code, kind, name, aliases) "
                f"VALUES ({m.ust_code}, {_sql_str(ent.kind)}, {_sql_str(ent.name)}, {aliases_sql}) "
                f"ON CONFLICT (ust_code, kind, name) DO UPDATE SET aliases = EXCLUDED.aliases;"
            )

    lines.extend(["", "-- 3. Fonti di Crawling (raw.source)"])
    for m in municipalities:
        robots_allowed = "false" if m.robots.disallow_all else "true"
        for src in m.sources:
            lines.append(
                f"INSERT INTO raw.source (ust_code, kind, url, robots_allowed, crawl_delay_s, active) "
                f"VALUES ({m.ust_code}, {_sql_str(src.kind)}, {_sql_str(src.url)}, {robots_allowed}, {m.robots.crawl_delay_s}, {str(m.active).lower()}) "
                f"ON CONFLICT (url) DO UPDATE SET "
                f"kind = EXCLUDED.kind, robots_allowed = EXCLUDED.robots_allowed, "
                f"crawl_delay_s = EXCLUDED.crawl_delay_s, active = EXCLUDED.active;"
            )

    lines.extend(["", "-- 4. Piano dei Conti MCA2 per Natura"])
    for code, level, parent, label, stmt in ACCOUNTS_MCA2:
        lines.append(
            f"INSERT INTO ref.account_mca2 (code, level, parent_code, label_it, statement, source_url) "
            f"VALUES ({_sql_str(code)}, {level}, {_sql_str(parent)}, {_sql_str(label)}, {_sql_str(stmt)}, {_sql_str(SEL_MCA2_SOURCE_URL)}) "
            f"ON CONFLICT (code) DO UPDATE SET label_it = EXCLUDED.label_it, statement = EXCLUDED.statement;"
        )

    lines.extend(["", "-- 5. Classificazione Funzionale MCA2 (10 Dicasteri)"])
    for code, level, parent, label in FUNCTIONS_MCA2:
        lines.append(
            f"INSERT INTO ref.function_mca2 (code, level, parent_code, label_it) "
            f"VALUES ({_sql_str(code)}, {level}, {_sql_str(parent)}, {_sql_str(label)}) "
            f"ON CONFLICT (code) DO UPDATE SET label_it = EXCLUDED.label_it;"
        )

    lines.extend(["", "-- 6. Moltiplicatori Comunali Storici PF e PG (2019-2026)"])
    for ust_code, years_map in sorted(TAX_MULTIPLIERS_2019_2026.items()):
        for year, (pf, pg) in sorted(years_map.items()):
            lines.append(
                f"INSERT INTO ref.tax_multiplier (ust_code, year, pf_pct, pg_pct, source_url, verification) "
                f"VALUES ({ust_code}, {year}, {pf:.2f}, {pg:.2f}, {_sql_str(MEGA_MULTIPLIERS_URL)}, 'VERIFIED') "
                f"ON CONFLICT (ust_code, year) DO UPDATE SET pf_pct = EXCLUDED.pf_pct, pg_pct = EXCLUDED.pg_pct, verification = EXCLUDED.verification;"
            )

    lines.extend(["", "-- 7. Definizioni degli 8 Indicatori Finanziari Ufficiali SEL"])
    for code, label, formula, unit, higher in INDICATORS_DEF:
        lines.append(
            f"INSERT INTO ref.indicator_def (code, label_it, formula_text, unit, higher_is_better) "
            f"VALUES ({_sql_str(code)}, {_sql_str(label)}, {_sql_str(formula)}, {_sql_str(unit)}, {str(higher).lower()}) "
            f"ON CONFLICT (code) DO UPDATE SET label_it = EXCLUDED.label_it, formula_text = EXCLUDED.formula_text;"
        )

    lines.extend(["", "-- 8. Scale di Valutazione SEL"])
    for ind_code, v_from, order, low, high, label, color in INDICATOR_SCALES:
        low_sql = low if low is not None else "NULL"
        high_sql = high if high is not None else "NULL"
        lines.append(
            f"INSERT INTO ref.indicator_scale (indicator_code, valid_from, band_order, lower_bound, upper_bound, label_it, color_token, source_url) "
            f"VALUES ({_sql_str(ind_code)}, {_sql_str(v_from)}, {order}, {low_sql}, {high_sql}, {_sql_str(label)}, {_sql_str(color)}, {_sql_str(SEL_MCA2_SOURCE_URL)}) "
            f"ON CONFLICT (indicator_code, valid_from, band_order) DO UPDATE SET "
            f"lower_bound = EXCLUDED.lower_bound, upper_bound = EXCLUDED.upper_bound, label_it = EXCLUDED.label_it, color_token = EXCLUDED.color_token;"
        )

    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines)


def main() -> int:
    enforce_corfin_guardrail()
    repo_root = Path(__file__).resolve().parents[3]
    yaml_path = repo_root / "registry" / "comuni.yaml"
    seed_out_path = repo_root / "supabase" / "seed.sql"

    municipalities = load_municipalities(yaml_path)
    sql_content = generate_seed_sql(municipalities)
    seed_out_path.write_text(sql_content, encoding="utf-8")

    total_entities = sum(len(m.entities) for m in municipalities)
    total_sources = sum(len(m.sources) for m in municipalities)
    total_mults = sum(len(ym) for ym in TAX_MULTIPLIERS_2019_2026.values())

    print(f"[SEED REF OK] Validati {len(municipalities)}/19 Comuni da {yaml_path.name}")
    print(f"  -> Enti contabili/aziende: {total_entities}")
    print(f"  -> Fonti di crawling (raw.source): {total_sources}")
    print(f"  -> Conti MCA2 per natura: {len(ACCOUNTS_MCA2)}")
    print(f"  -> Funzioni dicasteriali MCA2: {len(FUNCTIONS_MCA2)}")
    print(f"  -> Moltiplicatori storici PF/PG (2019-2026): {total_mults}")
    print(f"  -> Indicatori SEL: {len(INDICATORS_DEF)} ({len(INDICATOR_SCALES)} fasce ufficiali)")
    print(f"  -> Scritto file SQL idempotente: {seed_out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
