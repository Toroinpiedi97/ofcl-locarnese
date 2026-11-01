import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
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
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protezione dedicata alla Console Curatore (/admin/*)
  if (pathname.startsWith("/admin")) {
    const isPublicAdminRoute =
      pathname === "/admin/login" ||
      pathname === "/admin/mfa-setup" ||
      pathname === "/admin/verify-mfa";

    // Bypass di emergenza per sviluppo locale offline se esplicitamente abilitato
    if (process.env.ALLOW_DEV_ADMIN === "true") {
      return response;
    }

    if (!user) {
      if (!isPublicAdminRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(url);
      }
      return response;
    }

    // 1. Controllo Ruolo Server-Side (app_metadata.role === 'curator')
    const role = (user.app_metadata as { role?: string })?.role;
    if (role !== "curator" && role !== "admin") {
      return new NextResponse(
        "Accesso Negato: il tuo account non dispone dei privilegi di curatore certificato OFCL (Ruolo mancante: 'curator').",
        { status: 403 }
      );
    }

    // 2. Controllo Obbligo MFA TOTP (Assurance Level AAL2)
    const { data: mfaData, error: mfaError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (!mfaError && mfaData) {
      // Se l'utente ha configurato il TOTP ma è ancora a livello AAL1 (solo password)
      if (
        mfaData.nextLevel === "aal2" &&
        mfaData.currentLevel !== "aal2" &&
        pathname !== "/admin/verify-mfa"
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/verify-mfa";
        return NextResponse.redirect(url);
      }

      // Se l'utente non ha ancora configurato l'MFA TOTP
      if (mfaData.nextLevel === "aal1" && pathname !== "/admin/mfa-setup") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/mfa-setup";
        return NextResponse.redirect(url);
      }
    }

    // Se già loggato e verificato, non serve rivedere login o verify-mfa
    if (
      (pathname === "/admin/login" || pathname === "/admin/verify-mfa") &&
      mfaData?.currentLevel === "aal2"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/queue";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
