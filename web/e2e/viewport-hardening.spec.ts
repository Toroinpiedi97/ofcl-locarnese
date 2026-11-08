import { test, expect, Page } from "@playwright/test";

/**
 * Suite di Hardening Viewport & Stress Test Anti-Overflow
 * Verifica l'assenza assoluta di overflow orizzontale (scrollWidth <= clientWidth)
 * su tutti i breakpoint target: 320px (stress test), 360px, 375px, 390px, 768px, 820px, 1024px.
 */

const VIEWPORT_MATRIX = [
  { name: "320x568 (Stress Test Mobile)", width: 320, height: 568 },
  { name: "360x800 (Android Compatto)", width: 360, height: 800 },
  { name: "375x667 (iPhone SE)", width: 375, height: 667 },
  { name: "390x844 (iPhone 14)", width: 390, height: 844 },
  { name: "768x1024 (iPad Portrait)", width: 768, height: 1024 },
  { name: "820x1180 (iPad Air Portrait)", width: 820, height: 1180 },
  { name: "1024x768 (Tablet Landscape)", width: 1024, height: 768 },
];

async function assertZeroHorizontalOverflow(page: Page, expectedWidth: number) {
  // 1. Nessun overflow sul root HTML o BODY
  const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(docScrollWidth).toBeLessThanOrEqual(expectedWidth);

  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyScrollWidth).toBeLessThanOrEqual(expectedWidth);

  // 2. Nessun elemento .ofl-card con contenuto che sfora i bordi
  const overflowingElements = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".ofl-card"));
    const issues: string[] = [];
    for (const card of cards) {
      if (card.closest("[data-scroll-x='true']")) continue;
      // Tolleranza di 1px per arrotondamenti sub-pixel dei motori di rendering
      if (card.scrollWidth > card.clientWidth + 1) {
        issues.push(
          `${card.tagName}.${card.className.slice(0, 30)} (scrollWidth: ${card.scrollWidth} > clientWidth: ${card.clientWidth})`
        );
      }
    }
    return issues;
  });

  expect(overflowingElements).toEqual([]);
}

test.describe("Hardening Layout & Viewport Anti-Overflow Matrix", () => {
  for (const vp of VIEWPORT_MATRIX) {
    test(`Home Page (/) @ ${vp.name}: zero overflow orizzontale`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");

      await assertZeroHorizontalOverflow(page, vp.width);
    });

    test(`Scheda Comune (/comuni/brione-sopra-minusio) @ ${vp.name}: zero overflow con Nivo e Simulator`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/comuni/brione-sopra-minusio");
      await page.waitForLoadState("domcontentloaded");

      // Verifica intestazione con nome comune lungo
      await expect(page.locator("h1")).toContainText("Comune di Brione sopra Minusio");

      await assertZeroHorizontalOverflow(page, vp.width);
    });

    test(`Opere e Crediti (/comuni/brione-sopra-minusio/crediti) @ ${vp.name}: zero overflow con barre MCA2`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/comuni/brione-sopra-minusio/crediti");
      await page.waitForLoadState("domcontentloaded");

      await assertZeroHorizontalOverflow(page, vp.width);
    });
  }

  test("Mobile Drawer Hamburger & Bottom Sheet: verifica contenimento dinamico a 360px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Apri Menu Hamburger
    const menuBtn = page.getByRole("button", { name: "Apri menu navigazione" });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await page.waitForTimeout(200);
    await assertZeroHorizontalOverflow(page, 360);

    // Chiudi Menu
    const closeBtn = page.getByRole("button", { name: "Chiudi menu" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(200);

    // 2. Apri Bottom Sheet cliccando sul primo comune nella lista mobile
    const firstMuniBtn = page.locator("button.ofl-card").first();
    await expect(firstMuniBtn).toBeVisible();
    await firstMuniBtn.click();
    await page.waitForTimeout(250);

    const sheetDialog = page.getByRole("dialog");
    await expect(sheetDialog).toBeVisible();
    await assertZeroHorizontalOverflow(page, 360);

    const closeSheetBtn = page.getByRole("button", { name: "Chiudi scheda" });
    await closeSheetBtn.click();
  });
});
