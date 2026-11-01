import { test, expect } from "@playwright/test";

test.describe("Civic Ticket Sandbox (POST /api/feedback & /segnala)", () => {
  test("API: validazione rigorosa Zod, lunghezza (10-500 car.) e honeypot", async ({
    request,
  }) => {
    // 1. Errore con messaggio troppo corto (< 10 caratteri)
    const resShort = await request.post("/api/feedback", {
      data: {
        page_path: "/comuni/locarno",
        message: "Breve",
      },
    });
    expect(resShort.status()).toBe(400);
    const dataShort = await resShort.json();
    expect(dataShort.success).toBe(false);

    // 2. Errore con messaggio troppo lungo (> 500 caratteri)
    const longMsg = "A".repeat(505);
    const resLong = await request.post("/api/feedback", {
      data: {
        page_path: "/comuni/locarno",
        message: longMsg,
      },
    });
    expect(resLong.status()).toBe(400);

    // 3. Honeypot: se website_hp è compilato, scarta come bot
    const resBot = await request.post("/api/feedback", {
      data: {
        page_path: "/comuni/locarno",
        message: "Messaggio valido ma inviato con honeypot compilato da un bot automatico",
        website_hp: "http://spam-link.ru",
      },
    });
    expect(resBot.status()).toBe(200);

    // 4. Invio valido con sanitizzazione HTML
    const resValid = await request.post("/api/feedback", {
      data: {
        page_path: "/comuni/brione-sopra-minusio",
        message: "<b>Segnalazione contabile:</b> riscontrato refuso sul consuntivo 2025 pagina 12.",
        target_metric: "Residuo negativo tornante Jacomello",
        ust_code: 5096,
        reporter_email: "cittadino.attivo@gmail.ch",
      },
    });
    expect(resValid.status()).toBe(200);
    const dataValid = await resValid.json();
    expect(dataValid.success).toBe(true);
    expect(dataValid.message).toContain("Grazie");
  });

  test("UI /segnala: compilazione modulo e invio con esito positivo", async ({ page }) => {
    // Navigazione alla pagina /segnala con parametri pre-compilati da Brione
    await page.goto("/segnala?ust=5096&comune=brione-sopra-minusio&metrica=Tornante");

    await expect(page.locator("h1")).toContainText("Segnala una Discrepanza");

    // Verifica che il comune 5096 sia selezionato nel dropdown
    const select = page.locator("select");
    await expect(select).toHaveValue("5096");

    // Compila il messaggio (>= 10 caratteri)
    const textarea = page.locator("textarea");
    await textarea.fill("Verificato sul messaggio municipale 566: il credito votato era di 360'000 CHF.");

    // Clicca su Invia Segnalazione
    const submitBtn = page.getByRole("button", { name: "Invia Segnalazione" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Schermata di successo
    await expect(page.getByText("Segnalazione Ricevuta")).toBeVisible();
    await expect(page.getByText("Grazie per il tuo contributo alla trasparenza civica!")).toBeVisible();
  });
});
