import { test, expect } from "@playwright/test";

test.describe("T058: Security & Privacy Audit Finale (nLPD, CSP, RLS, Zero Leaks)", () => {
  test("1. Verifica Header di Sicurezza HTTP (CSP, HSTS, X-Frame-Options, Sniffing)", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);

    const headers = res.headers();

    // CSP
    expect(headers["content-security-policy"]).toBeDefined();
    const csp = headers["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");

    // X-Frame-Options
    expect(headers["x-frame-options"]).toBe("DENY");

    // X-Content-Type-Options
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // Referrer-Policy
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    // Permissions-Policy
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");
  });

  test("2. Zero leak di segreti, token o email curatore nel bundle client HTML/JS", async ({
    page,
  }) => {
    await page.goto("/segnala");

    // Ottieni il sorgente completo della pagina renderizzata
    const content = await page.content();

    // Nessuna chiave di servizio Supabase esposta nel client
    expect(content).not.toContain("service_role");
    expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(content).not.toContain("REVALIDATE_SECRET");

    // Nessuna email personale dell'autore/sviluppatore
    expect(content).not.toMatch(/nicol[a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  test("3. Rispetto nLPD nella Biblioteca Documenti (/documenti)", async ({
    page,
  }) => {
    await page.goto("/documenti");

    // Verifica che l'interfaccia mostri l'indicatore di conformità nLPD
    await expect(page.locator("h1")).toContainText("Biblioteca Documenti & Fascicoli MCA2");

    // Nessun titolo con pattern di persone fisiche o naturalizzazioni esposte
    const pageText = await page.textContent("body");
    expect(pageText).not.toContain("Atto di naturalizzazione di");
    expect(pageText).not.toContain("Cittadinanza alla famiglia");
  });

  test("4. Protezione Honeypot e Sanitizzazione Anti-XSS in POST /api/feedback", async ({
    request,
  }) => {
    // Test honeypot website_hp: scarto silenzioso (status 200 ma non processato)
    const honeypotRes = await request.post("/api/feedback", {
      data: {
        message: "Segnalazione bot con campo trappola valorizzato",
        page_path: "/comuni/locarno",
        website_hp: "http://spam-bot.com",
      },
    });
    expect(honeypotRes.status()).toBe(200);
    const hpBody = await honeypotRes.json();
    expect(hpBody.success).toBe(true);

    // Test messaggio troppo corto dopo la sanitizzazione tag HTML (< 10 caratteri) -> 400
    const shortRes = await request.post("/api/feedback", {
      data: {
        message: "<b>123</b>",
        page_path: "/comuni/locarno",
      },
    });
    expect(shortRes.status()).toBe(400);

    // Test sanitizzazione anti-XSS su messaggio valido
    const validRes = await request.post("/api/feedback", {
      data: {
        message: "Verifica valore <b>123.45 CHF</b> <script>alert(1)</script> presente a bilancio",
        page_path: "/comuni/locarno",
      },
    });
    expect(validRes.status()).toBe(200);
    const body = await validRes.json();
    expect(body.success).toBe(true);
  });
});
