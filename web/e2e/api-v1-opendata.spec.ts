import { test, expect } from "@playwright/test";

test.describe("Fase 6: Open Data, Feed RSS e REST API Pubblica v1", () => {
  test("Pagina Open Data (/open-data): cataloghi, dizionario dati e tab snippet", async ({
    page,
  }) => {
    await page.goto("/open-data");

    // Intestazione e standard Frictionless
    await expect(page.locator("h1")).toContainText("Open Data & API Civica del Locarnese");
    await expect(page.getByText("Standard Frictionless Data · CC-BY-4.0")).toBeVisible();

    // Pulsanti di download
    await expect(page.getByText("Scarica Pacchetto Completo ZIP")).toBeVisible();
    await expect(page.getByText("Specifica OpenAPI 3.1")).toBeVisible();

    // 3 Dataset certificati
    await expect(page.getByRole("heading", { name: "Bilanci Consuntivi & Preventivi MCA2" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "8 Indicatori Ufficiali SEL" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tariffe Comunali e Sussidi Civici" })).toBeVisible();

    // Dizionario Campi MCA2
    await expect(page.getByText("Dizionario Dati MCA2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "ust_code" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "moltiplicatore_pf" })).toBeVisible();

    // Tab Snippet interattivi
    const pythonTab = page.getByRole("button", { name: "Python (pandas)" });
    await pythonTab.click();
    await expect(page.locator("code")).toContainText("read_parquet");

    const excelTab = page.getByRole("button", { name: "Excel-CH" });
    await excelTab.click();
    await expect(page.locator("code")).toContainText("bilanci_mca2_excel_ch.csv");
  });

  test("REST API v1: /api/v1/comuni, indicatori e crediti", async ({ request }) => {
    // 1. GET /api/v1/comuni
    const resComuni = await request.get("/api/v1/comuni");
    expect(resComuni.status()).toBe(200);
    expect(resComuni.headers()["access-control-allow-origin"]).toBe("*");
    expect(resComuni.headers()["cache-control"]).toContain("public");

    const bodyComuni = await resComuni.json();
    expect(bodyComuni.data.length).toBe(19);
    expect(bodyComuni.meta.disclaimer).toContain("art. 192 LOC");
    expect(bodyComuni.meta.license).toBe("CC-BY-4.0");

    // 2. GET /api/v1/indicatori?comune=5113 (Locarno)
    const resInd = await request.get("/api/v1/indicatori?comune=5113");
    expect(resInd.status()).toBe(200);
    const bodyInd = await resInd.json();
    expect(bodyInd.data.length).toBe(1);
    expect(bodyInd.data[0].indicators.length).toBe(8);
    const codes = bodyInd.data[0].indicators.map((i: { code: string }) => i.code);
    expect(codes).toContain("SELF_FINANCING_DEGREE");
    expect(codes).toContain("NET_DEBT_PER_CAPITA");

    // 3. GET /api/v1/crediti?overrun_only=true
    const resCred = await request.get("/api/v1/crediti?overrun_only=true");
    expect(resCred.status()).toBe(200);
    const bodyCred = await resCred.json();
    expect(bodyCred.data.length).toBeGreaterThanOrEqual(1);
    expect(bodyCred.data[0].is_overrun).toBe(true);

    // 4. GET /api/v1/openapi.json
    const resOpenApi = await request.get("/api/v1/openapi.json");
    expect(resOpenApi.status()).toBe(200);
    const openapi = await resOpenApi.json();
    expect(openapi.openapi).toBe("3.1.0");
    expect(openapi.info.title).toContain("OFCL");
  });

  test("Feed RSS/Atom (/feed.xml): sintassi XML e alert sorpassi", async ({ request }) => {
    const resFeed = await request.get("/feed.xml");
    expect(resFeed.status()).toBe(200);
    expect(resFeed.headers()["content-type"]).toContain("xml");

    const xml = await resFeed.text();
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<title>OFCL · Osservatorio Finanze Comunali del Locarnese</title>");
    expect(xml).toContain("[SORPASSO ART. 15 LOC]");
  });

  test("Endpoint /api/revalidate: rifiuto senza secret", async ({ request }) => {
    const res = await request.post("/api/revalidate", {
      data: { tag: "mca2-data" },
    });
    // Senza secret configurato o Bearer token non valido deve restituire 401 o 500
    expect([401, 500]).toContain(res.status());
  });
});
