---
name: pdf-layout-extractor
description: >-
  Procedure operative per l'estrazione deterministica dei tabulati contabili MCA2 da file PDF generati da Ge.Co.Ti. Web (CCE Gordola).
  Da utilizzare quando si scrivono, testano o eseguono parser PDF basati su pdfplumber (motore primario) e docling (validatore di fallback)
  per estrarre Preventivi, Consuntivi, Allegato e (Cespiti) e Allegato f (Controllo Crediti) con precisione a 0.01 CHF.
---

# PDF Layout Extractor: Guida Deterministica MCA2

Questa skill guida l'estrazione dati dai bilanci comunali locarnesi pubblicati in PDF, garantendo precisione assoluta a `0.01 CHF` ed eliminando allucinazioni.

## 1. Caratteristiche dei PDF Ge.Co.Ti. Web (CCE Gordola)

I tabulati ufficiali dei Comuni ticinesi non sono scansioni ma documenti PDF vettoriali digitali generati da Crystal Reports / Ge.Co.Ti. Web.
Marcatori costanti nell'header di pagina:
- `Comune di [NOME] MCA2`
- Timestamp di stampa: `GG.MM.AAAA OO:MM:SS`
- Struttura multi-colonna affiancata per Conto Economico e Investimenti:
  - 3 colonne per le Spese (Consuntivo T, Preventivo T, Consuntivo T-1)
  - 3 colonne per i Ricavi (Consuntivo T, Preventivo T, Consuntivo T-1)

## 2. Configurazione Deterministica di `pdfplumber` (Motore Core)

Per evitare collisioni tra colonne numeriche contigue, `pdfplumber` deve essere configurato con strategie geometriche esplicite:

```python
import pdfplumber
import re
from decimal import Decimal

TABLE_SETTINGS = {
    "vertical_strategy": "text",      # oppure "explicit" se definite le linee
    "horizontal_strategy": "text",
    "snap_tolerance": 3,
    "join_tolerance": 3,
    "edge_min_length": 5,
    "min_words_vertical": 2
}

def parse_chf(value_str: str) -> Decimal:
    """
    Pulisce e converte gli importi in franchi svizzeri in Decimal esatto al centesimo.
    Gestisce: 15'432'147.41, 15’432’147.41, .--, ./., parentesi negative.
    """
    if not value_str or value_str.strip() in ("", "-", "--", ".-", ".--", "n.d."):
        return Decimal("0.00")
    
    cleaned = value_str.strip()
    is_negative = False
    
    # Gestione deduzioni ./. o parentesi
    if cleaned.startswith("./."):
        is_negative = True
        cleaned = cleaned.replace("./.", "").strip()
    elif cleaned.startswith("(") and cleaned.endswith(")"):
        is_negative = True
        cleaned = cleaned[1:-1].strip()
    elif cleaned.startswith("-"):
        is_negative = True
        cleaned = cleaned[1:].strip()
        
    # Pulizia separatori
    cleaned = cleaned.replace("'", "").replace("’", "").replace(" ", "").replace(".--", ".00").replace(".-", ".00")
    val = Decimal(cleaned)
    return -val if is_negative else val
```

## 3. Estrazione dell'Allegato f (Controllo Crediti d'Investimento)

L'Allegato f è la tabella più complessa perché le descrizioni dei lavori e dei Messaggi Municipali possono essere spezzate su 2–3 righe orizzontali.

**Procedura di Normalizzazione Multi-Riga:**
1. Rileva la riga principale tramite la presenza di un codice conto valido MCA2 (es. `615.5010.011`).
2. Se la riga successiva non contiene un codice conto ma contiene testo nella colonna descrizione e celle vuote nelle colonne numeriche, concatena la descrizione alla riga precedente con uno spazio.
3. Le 9 colonne obbligatorie devono essere mappate rispettando la formula:
   `uscite_totali = utilizzato_01_01 + uscite_anno`
   `credito_residuo = credito_votato - uscite_totali`
4. Se `credito_residuo < 0`, imposta il flag `sorpasso_credito = True`.

## 4. Fallback su `docling` (IBM TableFormer)

Quando un bilancio comunale presenta tabelle con bordi insoliti, sfondi colorati o celle multi-riga che sfuggono alla geometria pura di `pdfplumber`, si attiva `docling`:

```python
from docling.document_converter import DocumentConverter

def extract_with_docling_fallback(pdf_path: str, page_number: int):
    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    # Estrae la struttura della tabella in JSON/Markdown
    # e la invia al validatore di quadratura per confrontare i totali di colonna
```

## 5. Criteri di Accettazione e Verifica

- Ogni valore numerico estratto DEVE conservare il metadato `{"page": N, "bbox": [x0, top, x1, bottom]}` per il link `#page=N` nella console curatore.
- La somma delle singole righe estratte per dicastero deve coincidere al centesimo esatto (`0.00 CHF` di scostamento) con il totale riportato a fondo pagina nel PDF.
