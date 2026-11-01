# 05 · Registro Fonti & Connettori di Acquisizione

## 1. Stato verificato dei 19 portali (probe live 31.10.2026, 08:55 CET)

Metodo: 1 GET sulla pagina indice MM/conti + GET `robots.txt`, User-Agent dichiarato, nessun download di PDF.

| UST | Comune | CMS (rilevato) | URL indice testato | HTTP | Link doc trovati | robots.txt (`User-agent: *`) | Esito |
|---|---|---|---|---|---|---|---|
| 5091 | Ascona | Assolo | `/Messaggi-municipali` | 200 | 46 | Allow `/`, **Crawl-delay 30** | ✅ |
| 5096 | Brione s/Minusio | Assolo | `/Messaggi-municipali-di-nuova-promulgazione-a459ef00` | 200 | **0** | Crawl-delay 30 | ⚠️ C-07 |
| 5097 | Brissago | WordPress | `/comune/amministrazione/consiglio-comunale/documenti-consiglio-comunale/` | 200 | 18 | nessun vincolo | ✅ |
| 5108 | Gordola | Assolo | `/Messaggi-municipali-f3c97f00` | 200 | 40 | Crawl-delay 30 | ✅ |
| 5112 | Lavertezzo | Joomla | `/documenti-albo-comunale/messaggi-municipali/mm-2026` | 200 | 17 | Disallow `/images/PDF/` | ✅ (usare `/send/`) |
| 5113 | Locarno | Custom | `/it/messaggi-municipali/2024-2028` | 200 | 138 | **Disallow `/files/`** | 🔴 C-02 |
| 5113 | Locarno (finanze) | Custom | `/it/finanze` | 200 | 6 | **Disallow `/files/`** | 🔴 C-02 |
| 5115 | Losone | Assolo | `/Conti-del-Comune-519c1a00` | 200 | **0** | Crawl-delay 30 | ⚠️ C-07 |
| 5117 | Mergoscia | Assolo | `/Messaggi-municipali-861f7d00` | 200 | 40 | Crawl-delay 30 | ✅ |
| 5118 | Minusio | Assolo | `/Messaggi-municipali-584f1a00` | 200 | 78 | Crawl-delay 30 | ✅ |
| 5120 | Muralto | Assolo | `/Messaggi-municipali/IT-ac4d1f00` | 200 | 62 | Crawl-delay 30 | ✅ |
| 5121 | Orselina | Assolo legacy (`node=`) | `/index.php?node=326&lng=1` (404 senza `rif`) / `/` (200) | 200 (con `&vis=2&rif=b07ebc24cc`) | 5+ in home | Crawl-delay 30 (Assolo) | ⚠️ C-03a (`rif` firmato) |
| 5125 | Ronco s/Ascona | WordPress 7.1.4 | `/istituzione/conti-consuntivi/` | 200 | 77 | Disallow `/wp-admin/` | ✅ |
| 5131 | Tenero-Contra | Assolo | `/Messaggi-municipali-43c4a500` | 200 | 25 | Crawl-delay 30 | ✅ |
| 5136 | Onsernone | Assolo | `/Messaggi-861f7d00` | 200 | 20 | Crawl-delay 30 | ✅ |
| 5138 | Cugnasco-Gerra | Assolo | `/I-conti-del-Comune-43c4a500` | 200 | 26 | Crawl-delay 30 | ✅ |
| 5396 | Terre di Pedemonte | Assolo | `/Messaggi-861f7d00` | 200 | 146 | Crawl-delay 30 | ✅ |
| 5397 | Centovalli | WordPress | `/category/a4-messaggi-municipali/` | 200 | **0** | crawl-delay 10 | ⚠️ 2 livelli (post → PDF) |
| 5398 | Gambarogno | Assolo | `/Messaggi-861f7d00` | 200 | 20 | Crawl-delay 30 | ✅ |
| 5399 | Verzasca | Assolo | `/Documenti-Consiglio-comunale-d5961d00` | 200 | 10 | Crawl-delay 30 | ✅ |

> **Nota verificata su Orselina**: il sito utilizza un motore Assolo legacy (`index.php?node=...`) con checksum anti-manomissione obbligatorio `&vis=2&rif=<10-hex>`. Qualsiasi URL privo del parametro `rif` esatto restituisce HTTP 404: il connettore deve partire dalla homepage `/` ed estrarre gli href firmati senza alterare la query string.
> I `Disallow: /` visti nei robots Assolo riguardano **solo bot SEO** (Ahrefs, Semrush, Bytespider…), non `*`.

## 2. Formato `registry/comuni.yaml`

```yaml
- ust_code: 5115
  slug: losone
  name: Losone
  circle: Isole
  cms_family: ASSOLO
  entities:
    - { kind: COMUNE, name: "Comune di Losone" }
  sources:
    - kind: CONTI_INDEX
      url: https://www.losone.ch/Conti-del-Comune-519c1a00
      strategy: assolo_list          # connettore
      params: { ris_n: 200 }         # da verificare
    - kind: MM_INDEX
      url: https://www.losone.ch/Documenti-del-Consiglio-comunale-b1cb9e00
      strategy: assolo_list
  robots:
    crawl_delay_s: 30
    checked_at: 2026-10-31
  verification:
    status: PARTIAL                  # UNVERIFIED | PARTIAL | VERIFIED
    verified_at: null
    notes: "Indice senza link statici: testare parametri ris_n/fric (C-07)"
  delegation_threshold_chf: 70000    # soglia delega Municipio (Regolamento comunale) - da fonte
```

## 3. Connettori (Stadio 1)

Interfaccia comune (Python):

```python
class Connector(Protocol):
    family: str
    async def discover(self, source: Source, since: date | None) -> AsyncIterator[Candidate]: ...
    # Candidate = (url, title, published_on, page_url, hints)
```

| Connettore | Strategia | Paginazione | Download | Rischi |
|---|---|---|---|---|
| `assolo_list` | GET indice, parse elenco risultati (`ris_n`, `fric`, `ris_pg`) | `ris_pg=1..N` finché pagina vuota | link con suffisso hash 8 hex + `?i=1` | C-06 crawl-delay, C-07 render dinamico, hash non univoci tra siti |
| `wordpress_rest` | `GET /wp-json/wp/v2/categories?slug=…` → `posts?categories=ID&per_page=100` → `media?parent=POST` | header `X-WP-TotalPages` | URL `source_url` del media | REST disabilitata → fallback HTML (`/category/.../page/N/`) |
| `joomla_jdownloads` | indice per anno `mm-YYYY` | anni 2021..corrente | `/send/{cat}-{slug}/{id}-{slug}` | `/images/PDF/` vietato da robots → mai usarlo |
| `assolo_legacy_signed` (Orselina) | crawl da `/` → estrae `index.php?node=326&lng=1&vis=2&rif=…` preservando il token HMAC `rif` | `ris_pg` firmato nella pagina | `downdoc.php?id_doc={id}&lng=1&i=1&vis=2&rif={hmac}` | C-03a: vietato manipolare i parametri URL (pena 404) |
| `locarno_city` | indice per legislatura (2016-2021, 2021-2024, 2024-2028) + `/it/finanze` — **solo metadati** | lista unica per pagina | ❌ vietato `/files/` → `MANUAL_UPLOAD` finché non autorizzati | C-02 |

### Regole di cortesia (NFR-04)
1. `User-Agent: OFCL-bot/1.0 (+https://<dominio>/bot; contatto@<dominio>)`.
2. `protego` per interpretare robots.txt; **cache robots 24 h**; se robots non raggiungibile → si salta l'host.
3. Delay per host = `max(crawl_delay, 5 s)`; 1 connessione per host; parallelismo **tra** host.
4. Richieste condizionali (`ETag`/`If-Modified-Since`); HEAD prima del GET per PDF > 20 MB.
5. Orari: 02:00–06:00 CET; nessun retry aggressivo (max 3, backoff esponenziale, rispetto `Retry-After`).
6. Kill-switch per Comune in `comuni.yaml` (`active: false`).

## 4. Calendario di scansione

| Periodo | Frequenza | Schedulazione | Motivo |
|---|---|---|---|
| Tutto l'anno | 1×/settimana (massiva) | Lunedì 04:00 CET | Acquisizione massiva e cortese dei 19 albi con hash SHA-256 e zero impatto sui server comunali |
| Picchi preventivi / consuntivi | 1×/settimana + dispatch manuale | Lunedì 04:00 CET | Aggiornamento rapido su richiesta a seguito delle delibere dei Consigli Comunali |

## 5. Fonti cantonali e federali

| Fonte | Uso in OFCL | Formato | Priorità |
|---|---|---|---|
| UST/BFS STAT-TAB + opendata.swiss (STATPOP) | `ref.population` | CSV/PX/API | MVP |
| UST – Elenco ufficiale Comuni (AGVCH) | verifica UST/fusioni | API/CSV | MVP |
| SEL – Manuale MCA2 + piano dei conti | `ref.account_mca2`, `ref.function_mca2`, `ref.indicator_scale` | PDF/XLS | MVP (manuale) |
| SEL – Dati finanziari/statistica finanziaria | cross-check indicatori pubblicati dal Cantone | tabelle | Fase 2 |
| DFE – Divisione contribuzioni (moltiplicatori ufficiali) | `ref.tax_multiplier` (VERIFIED) | tabelle | MVP |
| swisstopo – swissBOUNDARIES3D | confini comunali per mappa | GeoJSON/Shapefile | MVP |
| Opuscolo moltiplicatori fiduciaria (citato nel report) | solo seed `UNVERIFIED` | PDF | ❌ non fonte primaria |
