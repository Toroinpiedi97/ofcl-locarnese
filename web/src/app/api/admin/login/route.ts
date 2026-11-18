import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { clientIpFrom, consume } from "@/lib/guardrails";
import { verifyServerPassword } from "@/lib/admin-auth";
import {
  CURATOR_COOKIE_NAME,
  getAllowedCuratorEmails,
  getConfiguredAdminPassword,
  hasLiveSupabaseConfig,
  isSupabaseUserCurator,
  signCuratorCookieEdge,
} from "@/lib/admin-session-edge";

const LoginBodySchema = z.object({
  email: z.string().trim().max(254).optional().default(""),
  password: z.string().min(1, "Inserisci la password.").max(256),
  redirectTo: z.string().optional().default("/admin/queue"),
});

function sanitizeRedirect(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("/admin/login")) {
    return "/admin/queue";
  }
  return raw;
}

export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const rateCheck = consume("api", `login:${ip}`);
  if (!rateCheck.ok) {
    return NextResponse.json(
      { ok: false, message: "Troppi tentativi di accesso. Riprova tra un minuto." },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Richiesta non valida (atteso JSON)." },
      { status: 400 }
    );
  }

  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message || "Credenziali non valide.",
      },
      { status: 400 }
    );
  }

  const { email, password, redirectTo } = parsed.data;
  const targetPath = sanitizeRedirect(redirectTo);
  const hasServerPassword = Boolean(getConfiguredAdminPassword());
  const hasSupabase = hasLiveSupabaseConfig();

  // 1. Verifica Password Curatore dedicata (CURATOR_PASSWORD / ADMIN_PASSWORD)
  if (hasServerPassword && verifyServerPassword(password)) {
    const allowedEmails = getAllowedCuratorEmails();
    if (
      email &&
      allowedEmails.length > 0 &&
      !allowedEmails.includes(email.toLowerCase())
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email non autorizzata per la Console Curatore.",
        },
        { status: 403 }
      );
    }

    const token = await signCuratorCookieEdge({
      sub: "00000000-0000-0000-0000-000000000002",
      email: email || allowedEmails[0] || "curatore@ofcl.ch",
      role: "curator",
      via: "password",
      exp: Date.now() + 12 * 60 * 60 * 1000, // 12 ore
    });

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          message: "Impossibile firmare la sessione curatore sul server.",
        },
        { status: 500 }
      );
    }

    const isHttps =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";

    const response = NextResponse.json({
      ok: true,
      nextPath: targetPath,
      via: "password",
    });
    response.cookies.set(CURATOR_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  }

  // 2. Verifica tramite Supabase Auth (Email + Password)
  if (hasSupabase && email) {
    const cookiesToAttach: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }> = [];

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToAttach.push(
              ...cookiesToSet.map((c) => ({
                name: c.name,
                value: c.value,
                options: c.options as Record<string, unknown>,
              }))
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        {
          ok: false,
          message:
            error?.message === "Invalid login credentials"
              ? "Email o password errati."
              : error?.message || "Credenziali non valide.",
        },
        { status: 401 }
      );
    }

    if (!isSupabaseUserCurator(data.user)) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          ok: false,
          message:
            "Account autenticato ma privo del ruolo 'curator' (o non presente in CURATOR_EMAILS).",
        },
        { status: 403 }
      );
    }

    let nextPath = targetPath;
    try {
      const { data: mfaData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData?.nextLevel === "aal2" && mfaData.currentLevel !== "aal2") {
        nextPath = "/admin/verify-mfa";
      } else if (
        process.env.ENFORCE_CURATOR_MFA === "true" &&
        mfaData?.currentLevel !== "aal2"
      ) {
        nextPath = "/admin/mfa-setup";
      }
    } catch {
      // MFA non attivo: procedi con autenticazione password
    }

    const response = NextResponse.json({
      ok: true,
      nextPath,
      via: "supabase",
    });
    for (const c of cookiesToAttach) {
      response.cookies.set(c.name, c.value, c.options);
    }
    return response;
  }

  if (!hasServerPassword && !hasSupabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Accesso curatore non configurato: imposta CURATOR_PASSWORD (o Supabase Auth) nelle variabili d'ambiente.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      message: email
        ? "Credenziali curatore non valide."
        : "Inserisci l'email istituzionale oppure la password curatore configurata.",
    },
    { status: 401 }
  );
}
