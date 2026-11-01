import { test, expect } from "@playwright/test";

test.describe("Tracker Crediti d'Investimento (Art. 15 LOC)", () => {
  test("Distretto (/crediti): panoramica, filtro sorpassi e verifica cifra esatta 0.01 CHF", async ({
    page,
  }) => {
    await page.goto("/crediti");

    // 1. Header e KPI di sintesi distrettuale
    await expect(page.locator("h1")).toContainText("Tracker Crediti d'Investimento (Art. 15 LOC)");
    await expect(page.getByText("Crediti Votati Complessivi")).toBeVisible();
    await expect(page.getByText("Sorpassi Rilevati (S01)")).toBeVisible();

    // 2. Filtro rapido: "Solo Sorpassi"
    const overrunsFilterBtn = page.getByRole("button", { name: "Solo Sorpassi (Art. 15 LOC)" });
    await overrunsFilterBtn.click();

    // Devono essere visibili i sorpassi noti (Tornante Jacomello, Ciclabile Locarno, Indemini)
    await expect(page.getByText("Messa in sicurezza tornante Jacomello")).toBeVisible();
    await expect(page.getByText("-16'130.65 CHF")).toBeVisible();
    await expect(page.getByText("S01 SORPASSO +4.5%")).toBeVisible();
    await expect(page.getByText("Allegato f (Controllo Crediti) · Pag. 126")).toBeVisible();

    // 3. Ricerca per conto contabile "615.5010.200"
    const searchInput = page.getByPlaceholder("Cerca opera o conto...");
    await searchInput.fill("615.5010.200");
    await expect(page.getByText("Messa in sicurezza tornante Jacomello")).toBeVisible();
  });

  test("Scheda Comune (/comuni/brione-sopra-minusio/crediti): dettaglio opere comunali", async ({
    page,
  }) => {
    await page.goto("/comuni/brione-sopra-minusio/crediti");

    // 1. Intestazione e contesto
    await expect(page.locator("h1")).toContainText("Opere & Crediti d'Investimento · Brione sopra Minusio");
    await expect(page.getByText("Attenzione: Sorpasso di Spesa Rilevato ex Art. 15 LOC")).toBeVisible();

    // 2. Verifica elenco crediti di Brione
    await expect(page.getByText("Messa in sicurezza tornante Jacomello")).toBeVisible();
    await expect(page.getByText("Risanamento canalizzazione e collettore via Contra")).toBeVisible();
    await expect(page.getByText("Digitalizzazione archivio storico e sicurezza dati")).toBeVisible();

    // 3. Verifica link di segnalazione contestuale
    const reportLink = page.getByRole("link", { name: "Segnala una discrepanza su quest'opera" }).first();
    await expect(reportLink).toBeVisible();
    await expect(reportLink).toHaveAttribute("href", /segnala\?ust=5096/);
  });
});
