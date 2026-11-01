---
name: mca2-validation-engine
description: >-
  Specifiche formali delle 12 verifiche di quadratura contabile (V01-V12), calcolo degli 8 indicatori finanziari SEL
  e verifica del ciclo crediti/cespiti per il Cantone Ticino. Da utilizzare ogni volta che si riconciliano, validano
  o testano i dati contabili estratti dai consuntivi e preventivi comunali.
---

# MCA2 Validation Engine: Verifiche Contabili e Indicatori SEL

Questo skill implementa il motore di validazione matematico che controlla che ogni bilancio comunale soddisfi le regole di quadratura prima di consentirne la pubblicazione.

## 1. Le 12 Quadrature Contabili Bloccanti (`V01` – `V12`)

| ID | Nome Verifica | Formula Algebrica MCA2 | Esito Accettabile |
|---|---|---|---|
| `V01` | **Risultato Operativo** | `Spese operative (30+31+33+35+36+37) - Ricavi operativi (40+41+42+43+45+46)` | Coincidenza esatta con riga 1A |
| `V02` | **Risultato Finanziario** | `Spese finanziarie (34) - Ricavi finanziari (44)` | Coincidenza esatta con riga 1B |
| `V03` | **Risultato Ordinario** | `Risultato Operativo + Risultato Finanziario` | Coincidenza esatta con riga 1C |
| `V04` | **Risultato Straordinario** | `Spese straordinarie (38) - Ricavi straordinari (48)` | Coincidenza esatta con riga 1D |
| `V05` | **Risultato Totale Esercizio** | `Risultato Ordinario + Risultato Straordinario` | Saldo d'esercizio identico |
| `V06` | **Imputazioni Interne** | `Totale Gruppo 39 (Addebiti interni) == Totale Gruppo 49 (Accrediti interni)` | Differenza esatta = `0.00 CHF` |
| `V07` | **Onere Netto Investimenti** | `Uscite per investimenti (5) - Entrate per investimenti (6)` | Coincidenza con Riassunto CI |
| `V08` | **Autofinanziamento Indiretto** | `Risultato Totale + Gruppo 33 + Versamenti 35 - Prelievi 45 + Rettifiche 364/365 + Amm. contr. 366 ± Movimenti CP 389/489` | Coincidenza con prospetto SEL |
| `V09` | **Finanziamenti Speciali (Servizi)** | `Variazione saldi fondi Capitale Proprio (2910) == Gruppo 35 - Gruppo 45` | Pareggio per Idrico (710), Depurazione (720), Rifiuti (730) |
| `V10` | **Ponte Beni Amministrativi (BA)** | `BA al 31.12 == BA al 01.01 + Uscite nette BA (classe 50) - Ammortamenti (3300+3320+366)` | Coincidenza con Bilancio e Allegato e |
| `V11` | **Controllo Crediti (Allegato f)** | `uscite_totali == utilizzato_01_01 + uscite_anno` AND `credito_residuo == credito_votato - uscite_totali` | Coerenza su ogni singolo credito |
| `V12` | **Flusso di Cassa Indiretto** | `Flusso Operativo + Flusso Investimenti + Flusso Finanziamento == Delta Liquidità (conto 100)` | Coincidenza con Allegato l |

## 2. Gli 8 Indicatori Finanziari Ufficiali della SEL (Art. 22 lett. o RGFCC)

```python
from decimal import Decimal

def calcola_indicatori_sel(dati: dict) -> dict:
    """
    Calcola gli 8 indicatori SEL con le rispettive scale di valutazione.
    """
    debito_netto = dati["capitale_terzi"] - dati["beni_patrimoniali"]
    gettito = dati["gettito_imposta_comunale_base"]
    autofinanziamento = dati["autofinanziamento"]
    investimenti_netti_ba = dati["investimenti_netti_ba"]
    interessi_netti = dati["spese_interessi_340"] - dati["ricavi_interessi_440"]
    ricavi_correnti = dati["ricavi_operativi"] - dati["ricavi_straordinari"]
    popolazione = dati["popolazione_residente"]
    
    # 1. Tasso di indebitamento netto (%)
    tasso_indebitamento = (debito_netto / gettito) * 100 if gettito else None
    
    # 2. Grado di autofinanziamento (%)
    grado_autofin = (autofinanziamento / investimenti_netti_ba) * 100 if investimenti_netti_ba else None
    
    # 3. Quota spese per interessi (%)
    quota_interessi = (interessi_netti / ricavi_correnti) * 100 if ricavi_correnti else None
    
    # 4. Debito pubblico netto pro capite (CHF/ab)
    debito_pro_capite = debito_netto / popolazione if popolazione else None
    
    return {
        "tasso_indebitamento_netto": {
            "valore": tasso_indebitamento,
            "giudizio": "Buono" if tasso_indebitamento < 100 else ("Accettabile" if tasso_indebitamento <= 150 else "Eccessivo")
        },
        "grado_autofinanziamento": {
            "valore": grado_autofin,
            "giudizio": "Buono" if grado_autofin > 100 else ("Normale" if grado_autofin >= 80 else "Debole")
        },
        "quota_interessi": {
            "valore": quota_interessi,
            "giudizio": "Buono" if quota_interessi <= 4 else ("Sufficiente" if quota_interessi <= 9 else "Eccessivo")
        },
        "debito_pro_capite": {
            "valore": debito_pro_capite,
            "giudizio": "Basso" if debito_pro_capite < 1000 else ("Medio" if debito_pro_capite <= 3000 else ("Elevato" if debito_pro_capite <= 5000 else "Eccessivo"))
        }
    }
```

## 3. Gestione dei Casi Limite Contabili

1. **Moltiplicatore Sdoppiato (PF vs PG):**
   A partire dal 2025/2026, Locarno (90/97%), Gambarogno (85/100%) e Centovalli (95/120%) differenziano il moltiplicatore. La formula del gettito deve calcolare separatamente la base imponibile PF e PG.
2. **Conti Emendati dal Consiglio Comunale:**
   Se il Consiglio comunale approva emendamenti rispetto al preventivo licenziato dal Municipio, il record in database deve essere marchiato con `tipo_versione = 'APPROVATO_CON_EMENDAMENTI'` e conservare la proposta originaria per l'analisi comparativa.
3. **Sorpassi di Spesa:**
   Ogni riga di `fact_controllo_crediti` con `credito_residuo < 0` deve generare un evento di allerta (`SIGNAL_OVERSPEND`), verificando se il Municipio ha sottoposto un Credito Suppletorio o se la spesa rientra nella soglia di delega esecutiva regolamentare (es. 70'000 CHF a Losone).
