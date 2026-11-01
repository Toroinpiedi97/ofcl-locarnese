import { test, expect } from "@playwright/test";

test.describe("Comparatore Multi-Comune (/confronta)", () => {
  test("Navigazione, commutazione metriche, filtri territoriali ed ordinamento", async ({
    page,
  }) => {
    await page.goto("/confronta");

    // 1. Intestazione pagina e presenza dei 19 Comuni
    await expect(page.locator("h1")).toContainText("Comparatore Finanziario dei Comuni");
    await expect(page.getByText("19 / 19 attivi")).toBeVisible();

    // 2. Commutazione metrica su "Debito Netto pro capite"
    const debitoBtn = page.getByRole("button", { name: "Debito Netto pro capite" });
    await debitoBtn.click();
    await expect(page.getByText("Classifica Comparativa: Debito Netto pro capite")).toBeVisible();

    // 3. Filtro Territoriale: clic su "Polo Urbano (5)"
    const urbanBtn = page.getByRole("button", { name: "Polo Urbano (5)" });
    await urbanBtn.click();
    await expect(page.getByText("5 / 19 attivi")).toBeVisible();
    await expect(page.getByText("5 Comuni", { exact: true })).toBeVisible();

    // Devono essere presenti Locarno e Ascona
    await expect(page.getByRole("link", { name: "Locarno" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ascona" }).first()).toBeVisible();

    // 4. Toggle Ordinamento (Crescente <-> Decrescente)
    const sortBtn = page.getByRole("button", { name: /Ordinamento:/ });
    await sortBtn.click();
    await expect(page.getByText("Ordinamento: Decrescente")).toBeVisible();

    // 5. Verifica pulsante esportazione CSV
    const exportBtn = page.getByRole("button", { name: "Esporta Dati Confronto (Excel-CH)" });
    await expect(exportBtn).toBeVisible();

    // Intercetta l'evento di download del browser
    const downloadPromise = page.waitForEvent("download");
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("ofcl-confronto-comuni-");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
