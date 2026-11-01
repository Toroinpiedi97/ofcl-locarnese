import { test, expect } from "@playwright/test";

test.describe("Pagine di Trasparenza, Metodologia e Stato Piattaforma", () => {
  test("Biblioteca Documenti (/documenti): catalogo, filtri per tipologia e impronte SHA-256", async ({
    page,
  }) => {
    await page.goto("/documenti");

    await expect(page.locator("h1")).toContainText("Biblioteca Documenti & Fascicoli MCA2");
    await expect(page.getByText("Consuntivo 2025").first()).toBeVisible();
    await expect(page.getByText(/SHA-256:/).first()).toBeVisible();

    // Filtra per "Preventivi"
    const prevTab = page.getByRole("button", { name: "Preventivi" });
    await prevTab.click();
    await expect(page.getByText("PREVENTIVO 2026").first()).toBeVisible();

    // Cerca "Locarno"
    const searchInput = page.getByPlaceholder("Cerca per titolo o MM...");
    await searchInput.fill("Locarno");
    await expect(page.getByText("Città di Locarno").first()).toBeVisible();
  });

  test("Metodologia MCA2 (/metodologia): le 12 regole V01-V12 e gli 8 indicatori SEL", async ({
    page,
  }) => {
    await page.goto("/metodologia");

    await expect(page.locator("h1")).toContainText("Metodologia di Quadratura MCA2");
    await expect(page.getByText("Tolleranza 0.00 CHF")).toBeVisible();

    // 12 regole di quadratura
    await expect(page.getByText("V01", { exact: true })).toBeVisible();
    await expect(page.getByText("V05", { exact: true })).toBeVisible();
    await expect(page.getByText("V10", { exact: true })).toBeVisible();
    await expect(page.getByText("V11", { exact: true })).toBeVisible();

    // 8 indicatori SEL
    await expect(page.getByText("SELF_FINANCING_DEGREE")).toBeVisible();
    await expect(page.getByText("NET_DEBT_PER_CAPITA")).toBeVisible();
  });

  test("Stato Connettori (/stato): monitoraggio salute dei 19 connettori comunali", async ({
    page,
  }) => {
    await page.goto("/stato");

    await expect(page.locator("h1")).toContainText("Stato della Piattaforma & Connettori");
    await expect(page.getByText("19 / 19 Connettori Attivi")).toBeVisible();
    await expect(page.getByText("19 / 19 PASS")).toBeVisible();
    await expect(page.getByText("C-13 PASS").first()).toBeVisible();
  });

  test("Changelog Dati (/changelog-dati): registro cronologico e release v2026.11.0", async ({
    page,
  }) => {
    await page.goto("/changelog-dati");

    await expect(page.locator("h1")).toContainText("Changelog Dati & Cronologia Rilasci");
    await expect(page.getByText("data-v2026.11.0")).toBeVisible();
    await expect(page.getByText("ATTUALE")).toBeVisible();
  });
});
