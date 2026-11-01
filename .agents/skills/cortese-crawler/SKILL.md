---
name: cortese-crawler
description: >-
  Procedure operative per l'acquisizione web e il monitoraggio automatico dei 19 albi e portali comunali del Locarnese.
  Da utilizzare per implementare o eseguire scraper con httpx, gestione di Crawl-delay, rispetto di robots.txt,
  gestione dei parametri di sessione dinamici (&rif= a Orselina, fric= in Assolo.net) e filtraggio nLPD dei dati personali.
---

# Cortese Crawler: Scraping Etico e Connettori Albi Locarnesi

Questo skill definisce le regole di web scraping cortese e conforme alla legge svizzera per monitorare i 19 Comuni del Distretto di Locarno.

## 1. Principi di Scraping Cortese (Non Negoziabili)

1. **User-Agent Trasparente:**
   Identificarsi sempre con la stringa ufficiale:
   `User-Agent: OFCL-Bot/1.0 (+https://ofcl.ch/bot; info@ofcl.ch)`
2. **Crawl-Delay Minimo:**
   Rispettare un intervallo minimo di **2.0 secondi** tra due richieste consecutive verso lo stesso dominio. Nessun attacco DoS o parallelismo aggressivo sui server comunali.
3. **Rispetto di `robots.txt` e Blocco di Locarno (`C-02`):**
   - La Città di Locarno ha `Disallow: /` per i bot web.
   - Vietato forzare il crawling su `locarno.ch` senza autorizzazione. Si applica la procedura concordata ex art. 192 LOC o prelievo da archivio statico autorizzato.
4. **Filtraggio Preventivo nLPD (Dati Personali):**
   I Messaggi Municipali contenenti decisioni su persone fisiche identificabili (es. condoni d'imposta, sussidi individuali, espropri nominativi, aiuti sociali) devono essere classificati come `CLASSIFIED_RESTRICTED` e NON indicizzati nel motore pubblico.

## 2. Specifiche dei 5 Connettori per CMS

### 1. Connettore Assolo.net / eGov (13 Comuni)
- **Comuni:** Ascona, Brione sopra Minusio, Cugnasco-Gerra, Gambarogno, Gordola, Losone, Mergoscia, Minusio, Muralto, Onsernone, Tenero-Contra, Terre di Pedemonte, Verzasca.
- **Pattern Paginazione:** `?param_sla=0&ris_n=20&fric={fric_id}&ris_pg={page_num}`
- **Pattern PDF:** URL terminante con hash esadecimale a 8 caratteri seguito da `?i=1` (es. `-daf46200?i=1&MasterId=g1_17752`).
- **Verifica Download:** Lo status HTTP deve essere 200 e il MIME-Type `application/pdf`.

### 2. Connettore WordPress (3 Comuni)
- **Comuni:** Brissago, Centovalli, Ronco sopra Ascona.
- **Pattern Albo:** Archivi di categoria `/category/a4-messaggi-municipali/` o cartelle `/documenti/consiglio-comunale/`.
- **Pattern PDF:** File memorizzati in `/wp-content/uploads/AAAA/MM/nome_file.pdf` o `/files/nome_file.pdf`.

### 3. Connettore Joomla / jDownloads (1 Comune)
- **Comune:** Lavertezzo (`lavertezzo.ch`).
- **Pattern Categorie:** `/documenti-albo-comunale/messaggi-municipali/mm-AAAA`.
- **Pattern Download:** `/documenti-albo-comunale/send/{cat_id}-{cat_slug}/{doc_id}-{doc_slug}`. Seguire i redirect 302 fino al binario PDF.

### 4. Connettore PHP ad Albero Nodale (1 Comune)
- **Comune:** Orselina (`orselina.ch`).
- **Parametro Dinamico `&rif=`:** Orselina richiede un parametro crittografico/hash variabile `&rif=...` nelle chiamate GET. Il crawler deve prima leggere la pagina nodo (`node=326`), estrarre l'attributo `href` completo contenente il parametro `&rif=` e solo dopo scaricare tramite `downdoc.php?id_doc={id}&lng=1&i=1&rif={hash}`.

### 5. Connettore Portale Città di Locarno (1 Comune)
- **Comune:** Locarno (`locarno.ch`).
- **Pattern:** Sezioni divise per legislatura (`/it/messaggi-municipali/2024-2028`) e pagina `/it/finanze`.
- **Download:** Directory diretta `/files/documenti/MMXX_Consuntivi_AAAA.pdf`.

## 3. Gestione Errori e Riprova (Exponential Backoff)

```python
import httpx
import asyncio

async def fetch_pdf_stream(client: httpx.AsyncClient, url: str, max_retries: int = 3) -> bytes:
    headers = {"User-Agent": "OFCL-Bot/1.0 (+https://ofcl.ch/bot)"}
    delay = 2.0
    for attempt in range(max_retries):
        try:
            response = await client.get(url, headers=headers, timeout=30.0, follow_redirects=True)
            if response.status_code == 200:
                return response.content
            elif response.status_code == 429:
                await asyncio.sleep(delay * (2 ** attempt))
            else:
                response.raise_for_status()
        except httpx.HTTPError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(delay * (2 ** attempt))
```
