import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const FORBIDDEN_CORFIN_HOST = "vrqnbdcsavgpdgijpiic.supabase.co";

/**
 * Client Supabase anonimo e stateless per la lettura delle viste pubbliche api.* e ref.*
 * Rispettoso del Guardrail C-01 (isolamento totale da Corfin) e ottimizzato per ISR/unstable_cache (zero-cookies).
 */
export function createPublicAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ofcl-local.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

  if (url.includes(FORBIDDEN_CORFIN_HOST)) {
    throw new Error(
      "[C-01 VIOLATION PREVENTED] Tentativo di connessione vietato verso Corfin (vrqnbdcsavgpdgijpiic). OFCL opera in isolamento totale."
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => {
        // Timeout rapido di 1.5s per non bloccare mai il rendering SSR se Docker locale non è avviato
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        // Se init ha già un signal, collegalo
        if (init?.signal) {
          init.signal.addEventListener("abort", () => controller.abort());
        }

        return fetch(input, {
          ...init,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
  });
}
