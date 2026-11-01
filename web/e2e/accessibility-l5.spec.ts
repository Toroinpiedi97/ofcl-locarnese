import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("T059: Verifica Accessibilità L5 con @axe-core (WCAG 2.1 AA)", () => {
  test("1. Audit Accessibilità Home Page (/)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("2. Audit Accessibilità Scheda Comune (/comuni/locarno)", async ({
    page,
  }) => {
    await page.goto("/comuni/locarno");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("3. Audit Accessibilità Pagina Open Data (/open-data)", async ({
    page,
  }) => {
    await page.goto("/open-data");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("4. Audit Accessibilità Pagina Metodologia e Formule (/metodologia)", async ({
    page,
  }) => {
    await page.goto("/metodologia");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("5. Audit Accessibilità Civic Ticket Sandbox (/segnala)", async ({
    page,
  }) => {
    await page.goto("/segnala");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
