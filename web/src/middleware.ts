import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { bucketForPath, clientIpFrom, consume } from "@/lib/guardrails";
import {
  CURATOR_COOKIE_NAME,
  hasLiveSupabaseConfig,
  isOfflineDevSandbox,
  isSupabaseUserCurator,
  verifyCuratorCookieEdge,
} from "@/lib/admin-session-edge";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Guardrail di quota giornaliera: API pubbliche e download open data.
  const bucket = bucketForPath(pathname);
  if (bucket) {
    if (request.method === "OPTIONS") return NextResponse.next();
    const verdict = consume(bucket, clientIpFrom(request.headers));
    if (!verdict.ok) {
      return new NextResponse(
        JSON.stringify({
          error:
            verdict.reason === "ip_rate"
              ? "Troppe richieste: rallenta e riprova."
              : "Quota giornaliera del servizio esaurita: riprova dopo mezzanotte UTC.",
        }),
        {
          status: verdict.reason === "ip_rate" ? 429 : 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(verdict.retryAfter),
            "Cache-Control": "no-store",
          },
        }
      );
    }
    return NextResponse.next();
  }

  // 2. Le pagine pubbliche non hanno sessione: evita overhead Auth.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isPublicAdminRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/mfa-setup" ||
    pathname === "/admin/verify-mfa";

  // 3. Bypass esplicito SOLO per E2E / sviluppo locale offline
  if (isOfflineDevSandbox()) {
    return response;
  }

  // 4. Verifica sessione tramite cookie HMAC (CURATOR_PASSWORD / ADMIN_PASSWORD)
  const passwordCookie = request.cookies.get(CURATOR_COOKIE_NAME)?.value;
  if (passwordCookie) {
    const validSession = await verifyCuratorCookieEdge(passwordCookie);
    if (validSession) {
      if (isPublicAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/queue";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return response;
    }
  }

  // 5. Verifica tramite Supabase Auth (se configurata)
  if (hasLiveSupabaseConfig()) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (!isSupabaseUserCurator(user)) {
        return new NextResponse(
          "Accesso Negato: il tuo account non dispone dei privilegi di curatore certificato OFCL.",
          { status: 403 }
        );
      }

      let currentLevel: string | null = "aal1";
      let nextLevel: string | null = "aal1";
      try {
        const { data: mfaData, error: mfaError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!mfaError && mfaData) {
          currentLevel = mfaData.currentLevel;
          nextLevel = mfaData.nextLevel;
        }
      } catch {
        // MFA non attivo sul progetto: resta su aal1
      }

      // Richiede TOTP solo se l'utente ha effettivamente configurato un fattore (nextLevel === 'aal2')
      if (
        nextLevel === "aal2" &&
        currentLevel !== "aal2" &&
        pathname !== "/admin/verify-mfa"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/verify-mfa";
        return NextResponse.redirect(url);
      }

      // Solo se ENFORCE_CURATOR_MFA=true forza la configurazione TOTP
      if (
        process.env.ENFORCE_CURATOR_MFA === "true" &&
        nextLevel === "aal1" &&
        pathname !== "/admin/mfa-setup"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/mfa-setup";
        return NextResponse.redirect(url);
      }

      if (pathname === "/admin/login" || pathname === "/admin/verify-mfa") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/queue";
        url.search = "";
        return NextResponse.redirect(url);
      }

      return response;
    }
  }

  // 6. Fail-closed: qualsiasi richiesta /admin/* non autenticata viene reindirizzata al login
  if (!isPublicAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/:path*", "/feed.xml", "/data/opendata/:path*"],
};
