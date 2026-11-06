import { test, expect } from "@playwright/test";

test.describe("Scheda Comune Estesa (/comuni/[slug]) & Simulatore Imposte", () => {
  test("Scheda Brione sopra Minusio: 30s Card, sorpassi crediti, e 5 quadranti Bento", async ({
    page,
  }) => {
    await page.goto("/comuni/brione-sopra-minusio");

    // 1. Header Comune e Dati Anagrafici
    await expect(page.locator("h1")).toContainText("Comune di Brione sopra Minusio");
    await expect(page.getByText("UST 5096").first()).toBeVisible();
    await expect(page.getByText("Circolo di Navegna").first()).toBeVisible();
    await expect(page.getByText("78%").first()).toBeVisible(); // Moltiplicatore 2026

    // 2. Banner Sorpasso Crediti d'Opera (Art. 15 LOC)
    await expect(page.getByText("S01 SORPASSO")).toBeVisible();
    await expect(page.getByText("Sistemazione tornante Jacomello")).toBeVisible();
    await expect(page.getByText("-16'130.65 CHF")).toBeVisible();

    // 3. Verifica Serie Storica Moltiplicatore (2022–2026)
    await expect(page.getByText("Anno 2026")).toBeVisible();
    await expect(page.getByText("Anno 2022")).toBeVisible();

    // 4. Verifica Presenza 5 Quadranti Bento (Civic Deep Dive)
    await expect(page.getByText("Tariffe di Causalità & Rifiuti")).toBeVisible();
    await expect(page.getByText("110.00 CHF/anno").first()).toBeVisible(); // Tassa base rifiuti Brione certificata
    await expect(page.getByText("Famiglie, Infanzia & Scuola")).toBeVisible();
    await expect(page.getByText("Assegno Parentale di Nascita")).toBeVisible();
    await expect(page.getByText(/3['’]?000\.00 CHF/)).toBeVisible();
    await expect(page.getByText("Terza Età, Salute & Sociale")).toBeVisible();
    await expect(page.getByText("Clima, Energia & Mobilità")).toBeVisible();
    await expect(page.getByText("Sportello Comunale & Recapiti Ufficiali")).toBeVisible();
  });

  test("Simulatore d'Imposta (TaxImpactSimulator): calcolo centesimale esatto e toggle PF/PG", async ({
    page,
  }) => {
    // Test sul comune di Locarno che ha moltiplicatori differenziati (90% PF / 97% PG)
    await page.goto("/comuni/locarno");

    await expect(page.locator("h1")).toContainText("Comune di Locarno");
    await expect(page.getByText("Quanto incide il Moltiplicatore a Locarno?")).toBeVisible();

    // 1. Calcolo predefinito (Base 4'000 CHF, PF 90% -> 3'600.00 CHF)
    await expect(page.getByText("3'600.00 CHF")).toBeVisible();

    // 2. Clic sul preset 2'000 CHF -> Imposta = 2'000 * 90% = 1'800.00 CHF
    const preset2k = page.getByRole("button", { name: /^2'000 CHF/ });
    await preset2k.click();
    await expect(page.getByText("1'800.00 CHF")).toBeVisible();

    // 3. Switch a Soggetto Aziendale (PG 97% differenziato) -> Imposta = 2'000 * 97% = 1'940.00 CHF
    const togglePg = page.getByRole("button", { name: "Aziende (PG)" });
    await togglePg.click();
    await expect(page.getByText("1'940.00 CHF")).toBeVisible();

    // 4. Includi Tassa Base Rifiuti (Locarno = 110.00 CHF) -> Totale = 1'940.00 + 110.00 = 2'050.00 CHF
    const wasteCheckbox = page.getByLabel(/Includi Tassa Base Rifiuti/);
    if (await wasteCheckbox.isVisible()) {
      await wasteCheckbox.check();
      await expect(page.getByText("2'050.00 CHF")).toBeVisible();
    }
  });
});
