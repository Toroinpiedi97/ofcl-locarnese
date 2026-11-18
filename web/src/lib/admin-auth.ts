import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  CURATOR_COOKIE_NAME,
  getConfiguredAdminPassword,
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
  isSupabaseUserCurator,
  verifyCuratorCookieEdge,
} from "./admin-session-edge";

export interface CuratorSession {
  authenticated: boolean;
  via: "supabase" | "password" | "dev_sandbox" | "none";
  actorId: string;
  actorLabel: string;
  mfaLevel: "aal2" | "aal1" | "password" | "dev" | "none";
  reason?: string;
}

export function verifyServerPassword(candidate: string): boolean {
  const expected = getConfiguredAdminPassword();
  if (!expected || !candidate) return false;
  const a = crypto.createHash("sha256").update(candidate).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Restituisce lo stato di autenticazione del curatore lato server (Server Components / Server Actions).
 */
export async function getCuratorSession(): Promise<CuratorSession> {
  // 1. Verifica cookie password firmato HMAC (valido anche senza MFA se configurato CURATOR_PASSWORD / ADMIN_PASSWORD)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CURATOR_COOKIE_NAME)?.value;
    const payload = await verifyCuratorCookieEdge(token);
    if (payload) {
      return {
        authenticated: true,
        via: "password",
        actorId: payload.sub,
        actorLabel: payload.email || "Curatore OFCL",
        mfaLevel: "password",
      };
    }
  } catch {
    // Prosegue con Supabase Auth
  }

  // 2. Verifica sessione Supabase Auth (se configurata)
  if (hasLiveSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (!isSupabaseUserCurator(user)) {
          return {
            authenticated: false,
            via: "none",
            actorId: user.id,
            actorLabel: user.email || "Utente non curatore",
            mfaLevel: "none",
            reason: "forbidden_role",
          };
        }

        let mfaLevel: "aal2" | "aal1" = "aal1";
        let needsMfaVerify = false;
        let needsMfaSetup = false;

        try {
          const { data: mfaData } =
            await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (mfaData) {
            if (mfaData.currentLevel === "aal2") {
              mfaLevel = "aal2";
            } else if (mfaData.nextLevel === "aal2") {
              needsMfaVerify = true;
            } else if (process.env.ENFORCE_CURATOR_MFA === "true") {
              needsMfaSetup = true;
            }
          }
        } catch {
          // Se MFA non è abilitato sul progetto Supabase Auth, prosegue con AAL1 (password)
        }

        if (needsMfaVerify || needsMfaSetup) {
          return {
            authenticated: false,
            via: "none",
            actorId: user.id,
            actorLabel: user.email || "Curatore",
            mfaLevel: "aal1",
            reason: needsMfaVerify ? "mfa_verify_required" : "mfa_setup_required",
          };
        }

        return {
          authenticated: true,
          via: "supabase",
          actorId: user.id,
          actorLabel: user.email || "Curatore Supabase",
          mfaLevel,
        };
      }
    } catch {
      // Fallback eventuale a dev_sandbox se abilitato
    }
  }

  // 3. Sandbox esplicita per E2E / sviluppo offline
  if (isOfflineDevSandbox()) {
    return {
      authenticated: true,
      via: "dev_sandbox",
      actorId: "00000000-0000-0000-0000-000000000001",
      actorLabel: "Sandbox E2E",
      mfaLevel: "dev",
    };
  }

  return {
    authenticated: false,
    via: "none",
    actorId: "",
    actorLabel: "",
    mfaLevel: "none",
  };
}

/**
 * Restituisce il client Supabase per operazioni privilegiate della console curatore.
 * Da chiamare SOLO dopo che getCuratorSession().authenticated === true.
 */
export async function getAdminDbClient(): Promise<SupabaseClient<Database>> {
  if (hasLiveSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return createAdminClient();
  }
  return createClient();
}
