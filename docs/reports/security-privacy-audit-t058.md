# Rapporto Finale di Sicurezza e Privacy nLPD (Task T058)

**Progetto:** Osservatorio Finanze Comunali del Locarnese (OFCL)  
**Specifica di riferimento:** `docs/spec/03-architettura.md` §6, `docs/spec/04-data-model.md` §5, `docs/spec/12-legal-compliance.md`  
**Data:** 1 Novembre 2026  
**Auditor:** QA & Security Auditor  
**Esito Complessivo:** **SUPERATO (0 vulnerabilità critiche o alte)**  

---

## 1. Ispezione Row Level Security (RLS) & Isolamento Database

1. **Deny-by-default su tutte le tabelle applicative:**
   - Schemi verificati: `ref`, `raw`, `core`, `api`, `audit`.
   - `enable row level security` attivo su 100% delle tabelle (inclusa `audit.feedback_ticket` e `audit.curator_action`).
   - Nessun accesso `SELECT` o `INSERT` concesso al ruolo `anon` sulle tabelle sensibili di audit o dati grezzi.
   - Accesso curatore vincolato rigorosamente al claim crittografico server-side `app_metadata.role = 'curator'`.
2. **Trigger transazionale anti-tampering (`fn_audit_ledger_correction`):**
   - Qualsiasi modifica diretta a `core.ledger_value` richiede contestualmente una riga in `audit.curator_action` con motivazione ≥ 10 caratteri.
3. **Guardrail C-01 (Isolamento Assoluto da Corfin):**
   - Script di verifica `scripts/check-not-corfin.mjs` integrato in tutti i workflow CI e nei comandi pipeline Python (`enforce_corfin_guardrail()`).
   - 0 connessioni consentite verso `vrqnbdcsavgpdgijpiic.supabase.co`.

---

## 2. Privacy e Protezione Dati (nLPD / LPDP Svizzera)

1. **Filtraggio Preventivo Atti con Dati Personali:**
   - I messaggi municipali e le risoluzioni del Consiglio Comunale riguardanti naturalizzazioni, condoni, espropri o controversie legali nominali sono preventivamente esclusi dallo scraping pubblico e marcati `contains_personal_data: true`.
   - 0 nominativi di persone fisiche presenti nel catalogo pubblico o nelle viste `api.documents`.
2. **Civic Ticket Sandbox (`POST /api/feedback`):**
   - Sanitizzazione integrale del messaggio (rimozione di tag HTML, script e caratteri ASCII di controllo).
   - Rate limiting privacy-preserving calcolato tramite hash con salt giornaliero rotativo (`SHA-256(IP + salt)`).
   - Honeypot trasparente `website_hp` per assorbimento e scarto silente dei bot spammatori.
   - Notifica email inoltrata esclusivamente lato server (`FEEDBACK_RECIPIENT_EMAIL` con fallback neutrale `curatore@ofcl.ch`), con zero esposizione dell'indirizzo nel client bundle.

---

## 3. Headers di Sicurezza HTTP & Content Security Policy (CSP)

Implementati a livello di configurazione edge in `web/next.config.ts`:
- **Content-Security-Policy (CSP):** `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; frame-src 'self' blob: data: https:; frame-ancestors 'none';`
- **X-Frame-Options:** `DENY` (prevenzione totale clickjacking).
- **X-Content-Type-Options:** `nosniff` (prevenzione attacchi MIME-confusion).
- **Referrer-Policy:** `strict-origin-when-cross-origin`.
- **Permissions-Policy:** disabilitazione esplicita per sensori intrusivi (`camera=(), microphone=(), geolocation=(), browsing-topics=()`).
- **Strict-Transport-Security (HSTS):** `max-age=63072000; includeSubDomains; preload`.

---

## 4. Storage Immutabile Cloudflare R2 (`ofcl-raw-pdfs`)

- Bucket privato non indicizzabile, senza permessi di lettura pubblica globale.
- Deduplicazione crittografica tramite hash SHA-256 dei PDF originali.
- Accesso per il download vincolato a percorsi controllati o URL presignati a scadenza oraria.
