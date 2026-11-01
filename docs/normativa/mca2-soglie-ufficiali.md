# Normativa e Parametri Ufficiali MCA2 — Sezione degli Enti Locali (SEL)

Documento di riferimento per la validazione contabile e il calcolo degli 8 indicatori finanziari ufficiali ex art. 22 lett. o RGFCC e art. 15, 17, 156 LOC.

---

## 1. Risoluzione Incoerenze e Buche di Fascia (C-03g, C-03h)

Nelle pubblicazioni divulgative e nei prospetti comunali compaiono spesso incongruenze grafiche o buchi nei range (es. 4–9% e >10%). Conformemente alle direttive consolidata SEL (Dipartimento delle Istituzioni, Cantone Ticino):

1. **Quota spese per interessi (C-03g)**:
   - `< 4.00%`: **Buono** (carico finanziario trascurabile).
   - `4.00% – 9.00%`: **Sufficiente** (carico sopportabile).
   - `> 9.00%`: **Critico / Eccessivo** (estremo continuo: nessun buco tra 9.00% e 10.00%).

2. **Grado di autofinanziamento (C-03h)**:
   - `> 100.00%`: **Buono** (il Comune finanzia integralmente gli investimenti con risorse proprie).
   - `70.00% – 100.00%`: **Accettabile / Medio** (fascia standard SEL Cantone Ticino; nei comuni a forte ciclo d'investimento la soglia minima di allerta ordinaria è 70.00%, con target raccomandato a 80.00%).
   - `< 70.00%`: **Debole** (indebitamento netto destinato a crescere rapidamente).

---

## 2. Specifiche Formule degli 8 Indicatori Ufficiali SEL

Tutti i valori sono calcolati con precisione al centesimo (`0.01 CHF`) sul perimetro consolidato del Comune (`COMUNE`), escludendo doppie imputazioni (gruppi 39 e 49).

### 1. `NET_DEBT_RATIO` — Tasso di Indebitamento Netto
- **Formula**: `(Debito Pubblico Netto / Gettito Fiscale) * 100`
- **Componenti**:
  - *Debito pubblico netto*: Capitale dei terzi (passivo gruppo 20) − Beni patrimoniali liquidi e realizzabili (attivo gruppo 10).
  - *Gettito fiscale*: Gettito d'imposta comunale complessivo (conto 4000 + 4001 + 4002 + 4010).
- **Scale SEL**:
  - `< 100.00%`: Buono (verde)
  - `100.00% – 150.00%`: Accettabile (giallo)
  - `> 150.00%`: Eccessivo (rosso)

### 2. `SELF_FIN_DEGREE` — Grado di Autofinanziamento
- **Formula**: `(Autofinanziamento / Investimenti Netti Beni Amministrativi) * 100`
- **Componenti**:
  - *Autofinanziamento*: Risultato d'esercizio a CE + Ammortamenti (gruppo 33 + 366) + Attribuzioni a fondi (35) − Prelievi da fondi (45).
  - *Investimenti netti BA*: Spese per investimenti BA (gruppo 50..56) − Entrate per investimenti BA (gruppo 60..66).
- **Scale SEL**:
  - `> 100.00%`: Buono (verde)
  - `70.00% – 100.00%`: Medio (giallo)
  - `< 70.00%`: Debole (rosso)

### 3. `INTEREST_SHARE` — Quota Spese per Interessi
- **Formula**: `(Interessi Passivi Netti / Ricavi Correnti) * 100`
- **Componenti**:
  - *Interessi passivi netti*: Conto 3400 (Interessi passivi) − Conto 4400 (Interessi attivi).
  - *Ricavi correnti*: Totale ricavi correnti a CE (gruppo 4 al netto di 48/49).
- **Scale SEL**:
  - `< 4.00%`: Buono (verde)
  - `4.00% – 9.00%`: Sufficiente (giallo)
  - `> 9.00%`: Eccessivo (rosso)

### 4. `NET_DEBT_PC` — Debito Pubblico Netto Pro Capite
- **Formula**: `Debito Pubblico Netto / Popolazione Residente Permanente`
- **Componenti**:
  - *Debito pubblico netto*: `Capitale dei terzi (20) − Beni patrimoniali (10)`.
  - *Popolazione*: Censimento federale STATPOP (USTAT).
- **Scale SEL**:
  - `< 1'000.00 CHF`: Basso (verde)
  - `1'000.00 – 3'000.00 CHF`: Medio (verde chiaro)
  - `3'000.01 – 5'000.00 CHF`: Elevato (giallo)
  - `> 5'000.00 CHF`: Eccessivo / Critico (rosso)

### 5. `INVEST_SHARE` — Quota degli Investimenti
- **Formula**: `(Investimenti Lordi BA / Uscite Consolidate) * 100`
- **Componenti**:
  - *Investimenti lordi BA*: Totale uscite conto investimenti (gruppo 50..56).
  - *Uscite consolidate*: Uscite correnti (gruppo 3 al netto di 39) + Uscite investimenti (gruppo 5).
- **Scale SEL**:
  - `< 10.00%`: Ridotta (giallo)
  - `10.00% – 20.00%`: Media (verde)
  - `20.01% – 30.00%`: Elevata (giallo)
  - `> 30.00%`: Molto elevata (rosso)

### 6. `EQUITY_SHARE` — Quota di Capitale Proprio
- **Formula**: `(Capitale Proprio / Totale Passivi) * 100`
- **Componenti**:
  - *Capitale proprio*: Passivo gruppo 29 (Fondi e capitale proprio).
  - *Totale passivi*: Totale stato patrimoniale (gruppo 2).
- **Scale SEL**:
  - `< 10.00%`: Debole (rosso)
  - `10.00% – 20.00%`: Media (giallo)
  - `20.01% – 40.00%`: Buona (verde)
  - `> 40.00%`: Eccessiva / Molto solida (verde scuro)

### 7. `DEBT_SERVICE_SHARE` — Quota degli Oneri Finanziari
- **Formula**: `((Interessi Passivi Netti + Ammortamenti) / Ricavi Correnti) * 100`
- **Componenti**:
  - *Interessi netti*: 3400 − 4400.
  - *Ammortamenti*: Gruppo 33 + 366.
  - *Ricavi correnti*: Ricavi gruppo 4 al netto di 48/49.
- **Scale SEL**:
  - `< 5.00%`: Debole / Basso impatto (verde)
  - `5.00% – 15.00%`: Sopportabile (giallo)
  - `> 15.00%`: Elevato / Critico (rosso)

### 8. `SELF_FIN_CAPACITY` — Capacità di Autofinanziamento
- **Formula**: `(Autofinanziamento / Ricavi Correnti) * 100`
- **Componenti**:
  - *Autofinanziamento*: Risultato + 33 + 35 − 45.
  - *Ricavi correnti*: Gruppo 4 al netto di 48/49.
- **Scale SEL**:
  - `> 20.00%`: Buona (verde)
  - `10.00% – 20.00%`: Media (giallo)
  - `< 10.00%`: Debole (rosso)

---

## 3. Riferimenti Normativi Primari
- **LOC (RL 181.100)**: Art. 15 (Competenze CC e crediti), Art. 17 (Spese urgenti non preventivate), Art. 156 (Struttura CE a 3 stadi).
- **RGFCC (RL 181.110)**: Art. 15 (Controllo crediti), Art. 17 (Ammortamenti lineari), Art. 22 (Allegati a–p al consuntivo).
- **Manuale MCA2 SEL**: Circolari 4/2022, 7/2022 e Prontuario per l'esame della gestione finanziaria dei Comuni (SEL, Bellinzona).
