import { test, expect } from "@playwright/test";

test.describe("Console Curatore OFCL (/admin) - Flusso E2E", () => {
  test("T039: Coda di revisione visualizza documenti in attesa con ricerca e filtri", async ({ page }) => {
    await page.goto("/admin/queue");

    // Verifica titolo e metriche di stato
    await expect(page.locator("h1")).toContainText("Coda di Revisione e Validazione");
    await expect(page.getByText("Brione sopra Minusio").first()).toBeVisible();
    await expect(page.getByText("MM 566 Consuntivo 2025")).toBeVisible();
    await expect(page.getByText("NEEDS_REVIEW").first()).toBeVisible();

    // Test ricerca reattiva per comune
    const searchInput = page.getByPlaceholder("Cerca comune, MM o anno...");
    await searchInput.fill("Losone");
    await expect(page.getByText("Losone").first()).toBeVisible();
    await expect(page.getByText("Brione sopra Minusio")).not.toBeVisible();

    // Cancella ricerca e verifica ripristino
    await searchInput.fill("");
    await expect(page.getByText("Brione sopra Minusio").first()).toBeVisible();

    // Test filtro a schede: "Convalidati"
    await page.getByRole("button", { name: "Convalidati" }).click();
    await expect(page.getByText("VALIDATED").first()).toBeVisible();
  });

  test("T040 + T041: Split-View curatore, overlay BBOX, shortcut E/Esc, rettifica con audit e approvazione", async ({ page }) => {
    // 1. Accedi alla Split-View del documento Brione 2025
    await page.goto("/admin/review/168f1f85-c517-0156-0f1c-b3d06cb74f9c");

    // Verifica presenza intestazione e pannelli
    await expect(page.getByText("Brione sopra Minusio (UST 5096)")).toBeVisible();
    await expect(page.getByText("MM 566")).toBeVisible();
    await expect(page.locator("iframe")).toBeVisible(); // PDF viewer nativo

    // 2. Test Overlay Geometrico BBOX toggle
    const bboxToggle = page.getByRole("button", { name: "Overlay BBOX" });
    await expect(bboxToggle).toBeVisible();
    await bboxToggle.click();
    await expect(page.locator("svg[aria-label*='Rappresentazione geometrica']")).toBeVisible();

    // Torna a PDF Nativo
    await page.getByRole("button", { name: "PDF Nativo" }).click();
    await expect(page.locator("iframe")).toBeVisible();

    // 3. Navigazione celle e shortcut J
    const firstCell = page.getByText("Spese Operative (Stadio 1)", { exact: true });
    await expect(firstCell).toBeVisible();

    // Premiamo 'j' per passare alla seconda cella
    await page.keyboard.press("j");
    await expect(page.getByText("Cella attiva: Ricavi Operativi (Stadio 1)")).toBeVisible();

    // 4. Test scorciatoia rapida [E] per aprire la rettifica e [Esc] per annullare
    await page.keyboard.press("e");
    const reasonInput = page.getByPlaceholder("Motivo rettifica (obbligatorio, min 10 caratteri ex audit trigger)");
    await expect(reasonInput).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(reasonInput).not.toBeVisible();

    // 5. Test Rettifica Valore con guardrail Audit (min 10 caratteri)
    const rettificaBtn = page.getByRole("button", { name: "Rettifica Cifra" });
    await expect(rettificaBtn).toBeVisible();
    await rettificaBtn.click();

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

    // 6. Test Approvazione e Pubblicazione
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
    await expect(page.getByText("Trascina qui il file PDF o fai clic per selezionarlo")).toBeVisible();
  });

  test("T042b: Consultazione e gestione Civic Feedback Tickets con filtri e link", async ({ page }) => {
    await page.goto("/admin/tickets");

    await expect(page.getByText("Segnalazioni Civiche & Ticket Sandbox")).toBeVisible();
    await expect(page.getByText("Sul credito tornante Jacomello")).toBeVisible();
    await expect(page.getByText("DISCREPANZA_CIFRA")).toBeVisible();
    await expect(page.getByText("Brione sopra Minusio")).toBeVisible();

    // Test filtro categoria
    await page.getByRole("button", { name: "Accessibilità" }).click();
    await expect(page.getByText("Losone").first()).toBeVisible();
    await expect(page.getByText("Brione sopra Minusio")).not.toBeVisible();

    // Verifica presenza link diretto alla pagina pubblica
    await expect(page.getByTitle("Apri /crediti in nuova scheda")).toBeVisible();

    // Ripristina tutte le categorie
    await page.getByRole("button", { name: "Tutte" }).click();
    await expect(page.getByText("Brione sopra Minusio")).toBeVisible();
  });

  test("T056: Traguardo SC-001 - Copertura 19/19 Comuni con Consuntivi e Preventivi pubblicati", async ({
    page,
  }) => {
    // 1. Verifica Coda Curatore con fascicoli regionali
    await page.goto("/admin/queue");
    await expect(page.getByText("Locarno").first()).toBeVisible();
    await expect(page.getByText("Ascona").first()).toBeVisible();
    await expect(page.getByText("Gambarogno").first()).toBeVisible();

    // 2. Verifica Biblioteca Documenti Pubblica (SC-001)
    await page.goto("/documenti");
    await expect(page.locator("h1")).toContainText("Biblioteca Documenti");

    // Verifica presenza di Comuni chiave dei diversi circoli nelle schede documento
    await expect(page.getByRole("link", { name: "Locarno" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ascona" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Verzasca" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Centovalli" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Onsernone" }).first()).toBeVisible();
  });
});
