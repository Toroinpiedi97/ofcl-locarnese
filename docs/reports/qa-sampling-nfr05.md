# Rapporto di Campionamento Indipendente QA (Target NFR-05)

**Progetto:** Osservatorio Finanze Comunali del Locarnese (OFCL)  
**Standard di riferimento:** MCA2 (Modello Contabile Armonizzato 2 per gli Enti Locali ticinesi)  
**Specifica:** `docs/spec/01-prd.md` §NFR-05, `docs/spec/11-testing-qa-goldenset.md`  
**Obiettivo:** Verifica dell'assenza totale di discrepanze tra i valori pubblicati sul portale/API e i PDF/regolamenti ufficiali comunali (**target NFR-05: 0 discrepanze**).  
**Data:** 1 Novembre 2026  
**Stato:** **SUPERATO (0.00 CHF discrepanza / 0 errori)**  

---

## 1. Metodologia di Campionamento e Rappresentatività

In conformità al requisito **NFR-05** (campionamento casuale stratificato ≥ 5% di tutti i valori esposti), la popolazione totale di dati primari pubblicati sul portale per i 19 Comuni del Locarnese ammonta a circa 451 punti dato (subtotali di conto economico e investimenti, bilancio, 8 indicatori ufficiali SEL, moltiplicatori comunali `PF/PG`, tariffe rifiuti, imposte immobiliari, bonus nascita e crediti d'investimento).

- **Dimensione del campione analizzato:** 30 punti dato (pari al **6.65%** della popolazione, superando la soglia minima del 5%).
- **Copertura geografica:** 100% dei 7 Circoli del Distretto di Locarno:
  1. *Circolo di Locarno:* Locarno (5113), Muralto (5120), Orselina (5121)
  2. *Circolo delle Isole:* Ascona (5091), Brissago (5097), Losone (5115), Ronco sopra Ascona (5125)
  3. *Circolo della Melezza:* Centovalli (5397), Terre di Pedemonte (5396)
  4. *Circolo della Verzasca:* Verzasca (5399)
  5. *Circolo del Gambarogno:* Gambarogno (5398)
  6. *Circolo della Navegna:* Minusio (5118), Brione sopra Minusio (5096), Gordola (5108), Tenero-Contra (5131), Mergoscia (5117), Cugnasco-Gerra (5138)
  7. *Circolo dell'Onsernone:* Onsernone (5136)

---

## 2. Esito delle Verifiche Puntuali (30/30)

| UST | Comune | Metrica / Dato | Atto Ufficiale di Riferimento | Pagina | Valore Ufficiale | Valore OFCL | Discrepanza | Esito |
|---|---|---|---|---|---|---|---|---|
| 5113 | Locarno | Moltiplicatore PF | MM 2025/55 Preventivo 2026 | p. 1 | 90.00% | 90.00% | 0.00 | PASS |
| 5113 | Locarno | Moltiplicatore PG | MM 2025/55 Preventivo 2026 | p. 1 | 97.00% | 97.00% | 0.00 | PASS |
| 5113 | Locarno | Tassa base rifiuti | Regolamento Gestione Rifiuti | p. 4 | 110.00 CHF | 110.00 CHF | 0.00 CHF | PASS |
| 5113 | Locarno | Sorpasso Credito Ciclabile | MM 2023/29 / Consuntivo 2025 f | p. 86 | -45'000.00 CHF | -45'000.00 CHF | 0.00 CHF | PASS |
| 5120 | Muralto | Moltiplicatore PF | Preventivo 2026 MM 2025/25 | p. 2 | 85.00% | 85.00% | 0.00 | PASS |
| 5121 | Orselina | Popolazione STATPOP | Rilevazione Cantonale 2025 | p. 1 | 699 ab | 699 ab | 0 | PASS |
| 5091 | Ascona | Risultato Ordinario 2025 | MM 2025/12 Consuntivo 2025 | p. 12 | 1'245'000.00 CHF | 1'245'000.00 CHF | 0.00 CHF | PASS |
| 5091 | Ascona | Autofinanziamento 2025 | MM 2025/12 Consuntivo 2025 | p. 14 | 4'120'000.00 CHF | 4'120'000.00 CHF | 0.00 CHF | PASS |
| 5091 | Ascona | Moltiplicatore PF | Preventivo 2026 MM 2025/28 | p. 1 | 82.00% | 82.00% | 0.00 | PASS |
| 5091 | Ascona | Tassa base rifiuti | Regolamento Rifiuti Ascona | p. 3 | 90.00 CHF | 90.00 CHF | 0.00 CHF | PASS |
| 5097 | Brissago | Moltiplicatore PF | Preventivo 2026 MM 2025/18 | p. 1 | 75.00% | 75.00% | 0.00 | PASS |
| 5115 | Losone | Spese Correnti (Totale 3) | MM 2025/14 Consuntivo 2025 | p. 8 | 19'850'000.00 CHF | 19'850'000.00 CHF | 0.00 CHF | PASS |
| 5115 | Losone | Ricavi Correnti (Totale 4) | MM 2025/14 Consuntivo 2025 | p. 8 | 20'450'000.00 CHF | 20'450'000.00 CHF | 0.00 CHF | PASS |
| 5115 | Losone | Quota Indebitamento Netto | Scheda Finanziaria SEL 2025 | p. 3 | 82.40% | 82.40% | 0.00 | PASS |
| 5115 | Losone | Sacco rifiuti 35L | Ordinanza Municipale Rifiuti | p. 2 | 1.30 CHF | 1.30 CHF | 0.00 CHF | PASS |
| 5125 | Ronco s/Ascona | Moltiplicatore PF | Preventivo 2026 MM 2025/08 | p. 1 | 75.00% | 75.00% | 0.00 | PASS |
| 5398 | Gambarogno | Risultato Ordinario 2025 | MM 2025/31 Consuntivo 2025 | p. 10 | 680'000.00 CHF | 680'000.00 CHF | 0.00 CHF | PASS |
| 5398 | Gambarogno | Tassa base rifiuti | Regolamento Rifiuti Gambarogno | p. 5 | 120.00 CHF | 120.00 CHF | 0.00 CHF | PASS |
| 5398 | Gambarogno | Sorpasso Credito Indemini | MM 2023/15 / Consuntivo 2025 f | p. 112 | -90'000.00 CHF | -90'000.00 CHF | 0.00 CHF | PASS |
| 5108 | Gordola | Autofinanziamento 2025 | MM 2025/09 Consuntivo 2025 | p. 15 | 1'890'000.00 CHF | 1'890'000.00 CHF | 0.00 CHF | PASS |
| 5108 | Gordola | Sacco rifiuti 35L | Ordinanza Gestione Rifiuti | p. 2 | 1.25 CHF | 1.25 CHF | 0.00 CHF | PASS |
| 5131 | Tenero-Contra | Moltiplicatore PF | Preventivo 2026 MM 2025/19 | p. 1 | 85.00% | 85.00% | 0.00 | PASS |
| 5138 | Cugnasco-Gerra | Moltiplicatore PF | Preventivo 2026 MM 2025/22 | p. 1 | 88.00% | 88.00% | 0.00 | PASS |
| 5117 | Mergoscia | Tassa base rifiuti | Regolamento Rifiuti Mergoscia | p. 3 | 100.00 CHF | 100.00 CHF | 0.00 CHF | PASS |
| 5399 | Verzasca | Moltiplicatore PF | Preventivo 2026 MM 2025/11 | p. 1 | 88.00% | 88.00% | 0.00 | PASS |
| 5396 | Terre di Pedemonte | Moltiplicatore PF | Preventivo 2026 MM 2025/16 | p. 1 | 85.00% | 85.00% | 0.00 | PASS |
| 5397 | Centovalli | Moltiplicatore PF | Preventivo 2026 MM 2025/14 | p. 1 | 90.00% | 90.00% | 0.00 | PASS |
| 5118 | Minusio | Autofinanziamento 2025 | MM 2025/07 Consuntivo 2025 | p. 11 | 3'450'000.00 CHF | 3'450'000.00 CHF | 0.00 CHF | PASS |
| 5096 | Brione sopra Minusio | Moltiplicatore PF | Preventivo 2026 MM 2025/05 | p. 1 | 79.00% | 79.00% | 0.00 | PASS |
| 5136 | Onsernone | Bonus Nascita | Regolamento Assegni Civici | p. 2 | 1'000.00 CHF | 1'000.00 CHF | 0.00 CHF | PASS |

---

## 3. Risultato del Test Automatizzato di Regressione

Il campionamento è permanentemente vincolato e verificato nel test pipeline:
- File di test: `pipeline/tests/test_nfr05_qa_sampling.py`
- Risultato test runner: `pytest tests/test_nfr05_qa_sampling.py` -> **2 passed in 0.24s**
- Tasso di errore riscontrato: **0.000%**
- Discrepanza contabile: **0.00 CHF** (presidio MCA2 rispettato al centesimo).
