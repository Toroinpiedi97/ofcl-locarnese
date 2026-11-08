import { test, expect } from "@playwright/test";

test.describe("Stress-Test Avversariale: Scorciatoie Tastiera SplitViewCurator", () => {
  test("Combinazioni con tasti modificatori (Ctrl+A, Meta+A, Ctrl+P, Meta+P, Ctrl+J, Alt+A) non attivano le azioni curatore", async ({
    page,
  }) => {
    let dialogTriggered = false;
    let dialogMessage = "";

    page.on("dialog", (dialog) => {
      dialogTriggered = true;
      dialogMessage = dialog.message();
      dialog.dismiss();
    });

    await page.goto("/admin/review/168f1f85-c517-0156-0f1c-b3d06cb74f9c");
    await expect(page.getByText("Brione sopra Minusio (UST 5096)")).toBeVisible();

    // Verifica cella iniziale (indice 0)
    await expect(page.getByText("Cella attiva: Spese Operative (Stadio 1)")).toBeVisible();

    // 1. Pressione di Ctrl+A (Select All) non deve innescare l'approvazione fascicolo
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 2. Pressione di Meta+A (Cmd+A su macOS) non deve innescare l'approvazione fascicolo
    await page.keyboard.press("Meta+a");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 3. Pressione di Alt+A non deve innescare l'approvazione fascicolo
    await page.keyboard.press("Alt+a");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 4. Pressione di Ctrl+P (Print del browser) non deve aprire il prompt nLPD PII
    await page.keyboard.press("Control+p");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 5. Pressione di Meta+P (Cmd+P su macOS) non deve aprire il prompt nLPD PII
    await page.keyboard.press("Meta+p");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 6. Pressione di Alt+P non deve aprire il prompt nLPD PII
    await page.keyboard.press("Alt+p");
    await page.waitForTimeout(100);
    expect(dialogTriggered).toBe(false);

    // 7. Pressione di Ctrl+J o Alt+J non deve navigare tra le righe
    await page.keyboard.press("Control+j");
    await page.waitForTimeout(100);
    await expect(page.getByText("Cella attiva: Spese Operative (Stadio 1)")).toBeVisible();

    await page.keyboard.press("Alt+j");
    await page.waitForTimeout(100);
    await expect(page.getByText("Cella attiva: Spese Operative (Stadio 1)")).toBeVisible();

    // Conferma che nessun dialog modale è mai apparso durante i tentativi con modificatori
    expect(dialogTriggered).toBe(false);
    expect(dialogMessage).toBe("");
  });

  test("Focus su elementi input/textarea/select inibisce al 100% le scorciatoie curatore (A, P, J, K, E)", async ({
    page,
  }) => {
    let dialogTriggered = false;

    page.on("dialog", (dialog) => {
      dialogTriggered = true;
      dialog.dismiss();
    });

    await page.goto("/admin/review/168f1f85-c517-0156-0f1c-b3d06cb74f9c");
    await expect(page.getByText("Brione sopra Minusio (UST 5096)")).toBeVisible();

    // Apri la modalità rettifica cliccando sul pulsante
    const rettificaBtn = page.getByRole("button", { name: "Rettifica Cifra" });
    await expect(rettificaBtn).toBeVisible();
    await rettificaBtn.click();

    const reasonInput = page.getByPlaceholder("Motivo rettifica (obbligatorio, min 10 caratteri ex audit trigger)");
    await expect(reasonInput).toBeVisible();

    // Sposta il focus sul campo motivo rettifica
    await reasonInput.focus();

    // Digita una stringa contenente tutte le lettere calde: 'a', 'p', 'j', 'k', 'e'
    // Queste lettere NON devono attivare approve, toggle PII o navigazione righe
    await page.keyboard.type("appalto per pavimentazione km 3 e collaudo");
    await page.waitForTimeout(100);

    // Nessun dialog confirm/prompt deve essere stato sollevato
    expect(dialogTriggered).toBe(false);

    // Il testo deve essere stato regolarmente inserito nell'input
    await expect(reasonInput).toHaveValue("appalto per pavimentazione km 3 e collaudo");

    // La cella attiva deve essere rimasta la prima (indice 0), non avanzata con 'j' o retrocessa con 'k'
    await expect(page.getByText("Cella attiva: Spese Operative (Stadio 1)")).toBeVisible();

    // Test su elemento contenteditable dinamico per verificare copertura completa del guardrail
    await page.evaluate(() => {
      const ce = document.createElement("div");
      ce.id = "test-contenteditable";
      ce.contentEditable = "true";
      ce.style.position = "fixed";
      ce.style.top = "10px";
      ce.style.right = "10px";
      ce.style.zIndex = "9999";
      ce.textContent = "editable";
      document.body.appendChild(ce);
    });

    const ceLocator = page.locator("#test-contenteditable");
    await ceLocator.focus();

    // Digita 'a' e 'p' nel contenteditable
    await page.keyboard.press("a");
    await page.keyboard.press("p");
    await page.waitForTimeout(100);

    // Nessun dialog
    expect(dialogTriggered).toBe(false);
  });
});
