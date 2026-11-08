import { test, expect } from "@playwright/test";
import * as fs from "fs";

test.describe("Esportazione Grafici OFCL", () => {
  test("Download grafico serie storica in formato SVG contiene la serie contabile e non l'icona", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    // Cerca il pulsante Scarica del grafico serie storica tramite description/title
    const downloadBtn = page.getByRole("button", {
      name: "Scarica",
      description: "Esporta questo grafico in PNG, JPEG o SVG direttamente dal browser",
    });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Clicca sull'opzione Vettoriale SVG nel popover
    const svgOption = page.getByRole("button", { name: "Vettoriale SVG" });
    await expect(svgOption).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await svgOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("ofcl-andamento-spese-");
    expect(download.suggestedFilename()).toMatch(/\.svg$/);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, "utf-8");
      expect(content).toContain("Grafico andamento spese");
      expect(content).not.toContain("lucide-download");
      expect(content).toContain("<path");
    }
  });

  test("Download grafico serie storica in formato PNG genera un'immagine valida", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const downloadBtn = page.getByRole("button", {
      name: "Scarica",
      description: "Esporta questo grafico in PNG, JPEG o SVG direttamente dal browser",
    });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Clicca sull'opzione PNG
    const pngOption = page.getByRole("button", { name: /Immagine PNG/ });
    await expect(pngOption).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await pngOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("ofcl-andamento-spese-");
    expect(download.suggestedFilename()).toMatch(/\.png$/);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const stats = fs.statSync(downloadPath);
      // Il file PNG del grafico reale contiene diversi kilobyte di dati (molto più di una semplice icona di 14px)
      expect(stats.size).toBeGreaterThan(5000);
    }
  });

  test("Download grafico spesa settoriale gerarchica in formato SVG", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const downloadBtn = page.getByRole("button", {
      name: "Scarica",
      description: "Esporta grafico gerarchico in PNG, JPEG o SVG",
    });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    const svgOption = page.getByRole("button", { name: "Vettoriale SVG" });
    await expect(svgOption).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await svgOption.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("ofcl-spesa-mca2-");
    expect(download.suggestedFilename()).toMatch(/\.svg$/);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, "utf-8");
      expect(content).not.toContain("lucide-folder-tree");
      expect(content).toContain("<rect");
    }
  });
});
