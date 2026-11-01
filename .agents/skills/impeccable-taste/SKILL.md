---
name: impeccable-taste
description: >-
  Linee guida di design, vocabolario visivo e checklist di audit anti-slop per il portale civico pubblico
  e per la console curatore /admin di OFCL. Da utilizzare ogni volta che si progettano, implementano o revisionano
  componenti UI, pagine Next.js, grafici o layout per garantire qualità svizzera impeccabile e conformità WCAG 2.1 AA.
---

# Impeccable Taste: Standard di Design Civico Svizzero per OFCL

Questo skill integra i principi di `pbakaus/impeccable` e `Leonxlnx/taste-skill` adattandoli alla finanza pubblica ticinese. Il suo scopo è eliminare qualunque elemento generico ("AI slop") e garantire un'interfaccia austera, solida, iper-leggibile e accessibile.

## 1. Principi Fondamentali di Design Civico

1. **La Regola dei 30 Secondi:**
   Un consigliere comunale, un giornalista o un cittadino deve essere in grado di comprendere la situazione finanziaria del comune (moltiplicatore, disavanzo/avanzo, debito pro capite e stato investimenti) entro 30 secondi dal caricamento della pagina.
2. **Precisione Matematica & Verificabilità:**
   Nessun numero deve essere mostrato senza la sua unità (`CHF`, `%`) e senza il link verificabile alla pagina esatta del documento ufficiale sorgente (`#page=N`). Distinguere sempre `0.00 CHF` da `n.d.` (dato non disponibile).
3. **Divieto Assoluto di "AI Slop":**
   - No a card annidate dentro altre card con bordi ridondanti.
   - No a gradienti colorati generici su bottoni o sfondi ("purple SaaS look").
   - No a icone decorative non funzionali o illustrazioni cartoon.
   - No a testi a basso contrasto (es. grigio chiaro su bianco).
4. **Vincolo Legale LPSt:**
   Non inserire MAI gli stemmi araldici ufficiali dei Comuni (violazione della Legge federale sulla protezione degli stemmi). Usare invece tipografia sobria con codice UST (es. `5113 · Città di Locarno`).

## 2. Sistema Tipografico e Spaziatura

- **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, sans-serif. Ispirazione: tipografia svizzera internazionale.
- **Numeri Tabulari:** Usare sempre `font-mono` o `tabular-nums` per qualsiasi cifra, tabella o importo contabile, garantendo l'allineamento perfetto dei decimali.
- **Scala di Spaziatura (Multipli di 4px/8px):**
  - Spaziatura stretta: `4px` (gap tra tag/badge), `8px` (padding interno celle/input).
  - Spaziatura media: `16px` (gap tra card/sezioni minori), `24px` (padding container).
  - Spaziatura ampia: `32px` o `48px` (distanza tra macro-sezioni).

## 3. Tavolozza Colori e Contrasto (WCAG 2.1 AA)

- **Sfondo principale:** Bianco neutro (`#FFFFFF`) con sfondo secondario/card `#F8FAFC` (Slate 50).
- **Testo primario:** `#0F172A` (Slate 900) con contrasto > 12:1.
- **Testo secondario:** `#475569` (Slate 600) con contrasto > 4.5:1.
- **Colori Semantici MCA2:**
  - *Positivo / Avanzo d'esercizio / Autofinanziamento sano:* Verde bosco sobrio `#15803D` (non verde neon).
  - *Negativo / Disavanzo / Sorpasso crediti:* Rosso mattone istituzionale `#B91C1C`.
  - *Attenzione / Soglia SEL limite (100–150% indebitamento):* Ambra scuro `#B45309`.
  - *Dati neutri / Serie storiche:* Blu cantonale `#1E40AF` o Slate `#334155`.

## 4. Console Curatore `/admin` (Split-View 50/50)

- **Layout a Due Colonne:**
  - Colonna Sinistra (50% larghezza): Visualizzatore PDF interattivo centrato sulla pagina e sulle coordinate `bbox` del valore estratto.
  - Colonna Destra (50% larghezza): Griglia interattiva dei valori estratti (Conto, Descrizione, Spesa, Ricavo, Saldo).
- **Stati Visivi della Griglia:**
  - `VERIFIED` (bordo verde tenue): Valore confermato dal curatore o quadrato al centesimo.
  - `NEEDS_REVIEW` (bordo ambra): Valore estratto con scostamento da confermare.
  - `OUT_OF_BALANCE` (bordo rosso): Riconciliazione fallita (es. Spese - Ricavi != Saldo).
- **Scorciatoie da Tastiera Obbligatorie:**
  - `Enter`: Approva riga corrente e passa alla successiva.
  - `Tab` / `Shift+Tab`: Sposta il focus tra le celle numeriche.
  - `Ctrl + P`: Alterna vista PDF a schermo intero.

## 5. Checklist di Audit Visivo (Self-Audit prima del commit)

1. [ ] C'è almeno un rapporto di contrasto minimo 4.5:1 per tutti i testi?
2. [ ] I numeri nelle tabelle sono allineati a destra con decimali incolonnati (`tabular-nums`)?
3. [ ] C'è un indicatore visivo chiaro dello stato (`PREVENTIVO`, `CONSUNTIVO`, `PIANO_FIN`)?
4. [ ] È presente il disclaimer legale obbligatorio ex art. 192 LOC nel footer?
5. [ ] L'interfaccia si adatta su schermi mobili (hamburger menu, tabelle a scorrimento orizzontale o card collassabili)?
