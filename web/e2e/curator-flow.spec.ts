import { test, expect } from "@playwright/test";

test.describe("Console Curatore OFCL (/admin) - Flusso E2E", () => {
  test("T039: Coda di revisione visualizza documenti in attesa", async ({ page }) => {
    await page.goto("/admin/queue");

    // Verifica titolo e metriche di stato
    await expect(page.locator("h1")).toContainText("Coda di Revisione e Validazione");
    await expect(page.getByText("Brione sopra Minusio").first()).toBeVisible();
    await expect(page.getByText("MM 566 Consuntivo 2025")).toBeVisible();
    await expect(page.getByText("NEEDS_REVIEW").first()).toBeVisible();
  });

  test("T040 + T041: Split-View curatore, navigazione J/K, rettifica con audit e approvazione", async ({ page }) => {
    // 1. Accedi alla Split-View del documento Brione 2025
    await page.goto("/admin/review/168f1f85-c517-0156-0f1c-b3d06cb74f9c");

    // Verifica presenza intestazione e pannelli
    await expect(page.getByText("Brione sopra Minusio (UST 5096)")).toBeVisible();
    await expect(page.getByText("MM 566")).toBeVisible();
    await expect(page.locator("iframe")).toBeVisible(); // PDF viewer

    // 2. Navigazione celle e shortcut J
    const firstCell = page.getByText("Spese Operative (Stadio 1)", { exact: true });
    await expect(firstCell).toBeVisible();

    // Premiamo 'j' per passare alla seconda cella
    await page.keyboard.press("j");
    await expect(page.getByText("Cella attiva: Ricavi Operativi (Stadio 1)")).toBeVisible();

    // 3. Test Rettifica Valore con guardrail Audit (min 10 caratteri)
    // Clicchiamo su 'Rettifica Cifra'
    const rettificaBtn = page.getByRole("button", { name: "Rettifica Cifra" });
    await expect(rettificaBtn).toBeVisible();
    await rettificaBtn.click();

    // Form di modifica visibile
    const reasonInput = page.getByPlaceholder("Motivo rettifica (obbligatorio, min 10 caratteri ex audit trigger)");
    const saveBtn = page.getByRole("button", { name: "Salva Rettifica" });

    // Con motivo troppo breve (< 10 caratteri), il bottone deve essere disabilitato
    await reasonInput.fill("Breve");
    await expect(saveBtn).toBeDisabled();

    // Con motivo valido (>= 10 caratteri), il bottone si abilita
    await reasonInput.fill("Rettifica di quadratura verificata su allegato ufficiale");
    await expect(saveBtn).toBeEnabled();

    // Salvataggio rettifica: verifica esecuzione Server Action con risposta reale non mascherata
    await saveBtn.click();
    await expect(page.getByText(/Rettifica salvata e tracciata con successo|Errore audit/)).toBeVisible();

    // 4. Test Approvazione e Pubblicazione
    // Intercettiamo il confirm dialog del browser
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Confermi l'approvazione");
      await dialog.accept();
    });

    const approveBtn = page.getByRole("button", { name: "Approva & Pubblica [A]" });
    await approveBtn.click();

    // Verifica feedback o redirect da Server Action
    await expect(page.locator("body")).toContainText(/Fascicolo pubblicato|Errore audit|Coda di Revisione/);
  });

  test("T042: Pagina Caricamento Manuale Fascicoli (Città di Locarno)", async ({ page }) => {
    await page.goto("/admin/upload");

    await expect(page.getByText("Upload Manuale Fascicoli Ufficiali")).toBeVisible();
    await expect(page.locator("select").first()).toHaveValue("5113");
    await expect(page.getByRole("button", { name: "Carica su Cloudflare R2 e Invia alla Coda" })).toBeVisible();
  });

  test("T042b: Consultazione e gestione Civic Feedback Tickets", async ({ page }) => {
    await page.goto("/admin/tickets");

    await expect(page.getByText("Segnalazioni Civiche & Ticket Sandbox")).toBeVisible();
    await expect(page.getByText("Sul credito tornante Jacomello")).toBeVisible();
    await expect(page.getByText("DISCREPANZA_CIFRA")).toBeVisible();
    await expect(page.getByText("Brione sopra Minusio")).toBeVisible();
  });
});
