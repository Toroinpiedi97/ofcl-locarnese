import { test, expect } from "@playwright/test";

test.describe("Portale Pubblico OFCL (/) - Desktop & Mobile Master-Detail", () => {
  test("Desktop Master-Detail: selezione reattiva in-place e switch Tabella/Mappa", async ({
    page,
  }) => {
    // Imposta viewport desktop standard
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. Verifica Hero Section e Grandi Cifre Distrettuali
    await expect(page.locator("h1")).toContainText("Osservatorio Finanze Comunali del Locarnese");
    await expect(page.getByText("19 / 19")).toBeVisible();
    await expect(page.getByText(/64['’]?[0-9]{3}\s+ab\./)).toBeVisible();

    // 2. Verifica selezione predefinita (Città di Locarno)
    const quickCard = page.getByLabel(/Scheda Analitica MCA2/);
    await expect(quickCard).toBeVisible();
    await expect(quickCard.getByRole("heading", { name: "Locarno" })).toBeVisible();

    // 3. Selezione in-place di un altro comune (Ascona) dalla tabella
    const asconaRow = page.getByRole("row", { name: /5091\s+Ascona/ });
    await expect(asconaRow).toBeVisible();
    await asconaRow.click();

    // La Scheda Analitica a destra si aggiorna istantaneamente senza ricaricare la pagina
    await expect(page.getByLabel("Scheda Analitica MCA2 Ascona")).toBeVisible();
    await expect(quickCard.getByText("UST 5091")).toBeVisible();
    await expect(quickCard.getByText("75.0%")).toBeVisible(); // Moltiplicatore Ascona

    // 4. Selezione di un comune con sorpassi crediti (Brione sopra Minusio) nell'esercizio 2025
    const yr2025Btn = page.getByRole("button", { name: "2025" }).first();
    await yr2025Btn.click();
    const brioneRow = page.getByRole("row", { name: /5096\s+Brione/ });
    await brioneRow.click();
    await expect(page.getByLabel("Scheda Analitica MCA2 Brione sopra Minusio")).toBeVisible();
    await expect(page.getByText("Sorpasso crediti d'opera rilevato")).toBeVisible();

    // 5. Cambio vista in Mappa SVG Vettoriale
    const mapTabBtn = page.getByRole("button", { name: "Mappa" });
    await mapTabBtn.click();

    const svgMap = page.locator("svg").filter({ hasText: "Lago Maggiore" });
    await expect(svgMap).toBeVisible();

    // Clic su un comune nella mappa (es. Verzasca)
    const verzascaPolygon = page.locator('path[id="mun-path-5399"]');
    await expect(verzascaPolygon).toBeVisible();
    await verzascaPolygon.click();

    // La Scheda a destra si aggiorna per Verzasca
    await expect(page.getByLabel("Scheda Analitica MCA2 Verzasca")).toBeVisible();
    await expect(quickCard.getByText("UST 5399")).toBeVisible();
  });

  test("Mobile Pipeline: lista card touch-friendly e Bottom Sheet drawer scorrevole", async ({
    page,
  }) => {
    // Imposta viewport mobile standard (iPhone 14 / 15 / modern Android)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // 1. Verifica che la barra di ricerca mobile sia visibile
    const searchInput = page.getByPlaceholder("Cerca comune o codice UST (es. Locarno, 5091)...");
    await expect(searchInput).toBeVisible();

    // 2. Filtra per "Minusio"
    await searchInput.fill("Minusio");

    // Devono essere visibili "Minusio" e "Brione sopra Minusio"
    await expect(page.getByRole("button", { name: /Minusio/ }).first()).toBeVisible();

    // 3. Tocco su "Brione sopra Minusio" per aprire il Bottom Sheet
    const brioneBtn = page.locator("button", { hasText: "Brione sopra Minusio" });
    await expect(brioneBtn).toBeVisible();
    await brioneBtn.click();

    // 4. Verifica apertura del Drawer modale
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Brione sopra Minusio").first()).toBeVisible();
    await expect(drawer.getByText("UST 5096")).toBeVisible();
    await expect(drawer.getByText("S01 SORPASSO")).toBeVisible();

    // Link alla scheda completa presente
    const fullLink = drawer.getByRole("link", { name: "Apri Scheda Completa" });
    await expect(fullLink).toBeVisible();
    await expect(fullLink).toHaveAttribute("href", "/comuni/brione-sopra-minusio");

    // 5. Chiusura del Bottom Sheet tramite tasto X
    const closeBtn = drawer.getByRole("button", { name: "Chiudi scheda" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Il drawer si chiude
    await expect(drawer).not.toBeVisible();
  });

  test("Mobile App UX: Top Bar fissa, Hero presentazione collassabile e Menu Hamburger Drawer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // 1. Verifica Top Bar mobile e logo OFL
    const topBar = page.getByRole("banner", { name: "Barra superiore mobile" });
    await expect(topBar).toBeVisible();
    await expect(topBar.getByText("OFL")).toBeVisible();
    await expect(topBar.getByRole("button", { name: "Imposta lingua italiana" })).toBeVisible();

    // 2. Verifica Hero di presentazione mobile
    await expect(page.getByText("PRESIDIO CIVICO INDIPENDENTE")).toBeVisible();
    await expect(page.getByText("I Bilanci dei 19 Comuni del Locarnese")).toBeVisible();
    await expect(page.getByText("Comuni UST")).toBeVisible();

    // Espansione e compressione della guida rapida
    const guideToggle = page.getByText("Come esplorare i dati? (30 secondi)");
    await expect(guideToggle).toBeVisible();
    await guideToggle.click();
    await expect(
      page.getByText(/Tocca un comune dalla lista per aprire la/)
    ).toBeVisible();

    // 3. Verifica apertura Drawer Menu Hamburger
    const menuBtn = page.getByRole("button", { name: "Apri menu navigazione" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Drawer modale visibile
    const menuDrawer = page.getByRole("dialog", { name: "Menu di navigazione principale" });
    await expect(menuDrawer).toBeVisible();
    await expect(menuDrawer.getByRole("link", { name: /Controllo Crediti d'Opera/ })).toBeVisible();
    await expect(menuDrawer.getByRole("link", { name: /Atti, Delibere & PDF/ })).toBeVisible();
    await expect(menuDrawer.getByRole("link", { name: /Metodologia MCA2/ })).toBeVisible();

    // Chiusura del drawer tramite tasto X
    const closeMenuBtn = menuDrawer.getByRole("button", { name: "Chiudi menu" });
    await expect(closeMenuBtn).toBeVisible();
    await closeMenuBtn.click();
    await expect(menuDrawer).not.toBeVisible();
  });
});
