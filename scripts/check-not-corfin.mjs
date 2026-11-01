/**
 * Guardrail C-01: Anti-Corfin Isolation Check
 * 
 * Assicura che nessun comando, migrazione o script di OFCL possa accidentalmente
 * puntare al database di produzione del CRM Corfin (vrqnbdcsavgpdgijpiic.supabase.co).
 */

const FORBIDDEN_CORFIN_REF = "vrqnbdcsavgpdgijpiic";

function checkUrl(url, sourceName) {
  if (!url) return;
  if (url.includes(FORBIDDEN_CORFIN_REF)) {
    console.error(`\x1b[31m[CRITICAL ERROR - GUARDRAIL C-01 VIOLATION]\x1b[0m`);
    console.error(`Rilevato riferimento al database di produzione Corfin in ${sourceName}:`);
    console.error(`-> ${url}`);
    console.error(`È vietato eseguire migrazioni o query verso Corfin.`);
    console.error(`Usa solo il database locale Docker ('supabase start') o il progetto dedicato 'ofcl-prod'.`);
    process.exit(1);
  }
}

const envVarsToCheck = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL"
];

let checkedCount = 0;
for (const envVar of envVarsToCheck) {
  const val = process.env[envVar];
  if (val) {
    checkUrl(val, `process.env.${envVar}`);
    checkedCount++;
  }
}

console.log(`\x1b[32m[GUARDRAIL C-01 PASS]\x1b[0m Nessun riferimento al DB Corfin rilevato (${checkedCount} variabili verificate).`);
process.exit(0);
