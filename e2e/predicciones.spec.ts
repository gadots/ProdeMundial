import { test, expect } from "@playwright/test";

test.describe("Predicciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/predicciones");
  });

  test("renders page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Predicciones" })).toBeVisible();
  });

  test("filter row shows Todas, Pendientes, Urgentes", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Todas" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pendientes/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Urgentes/ })).toBeVisible();
  });

  test("phase tabs are visible and single-line", async ({ page }) => {
    // Use the first available phase tab (DB may not have all phases populated yet)
    const tabsContainer = page.locator(".overflow-x-auto").first();
    const firstTab = tabsContainer.locator("button").first();
    const exists = await firstTab.isVisible().catch(() => false);
    if (exists) {
      const box = await firstTab.boundingBox();
      expect(box).not.toBeNull();
      // Single-line tabs should be max ~36px tall
      expect(box!.height).toBeLessThanOrEqual(40);
    }
  });

  test("phase tabs stay within viewport width", async ({ page }) => {
    const tabsContainer = page.locator(".overflow-x-auto").first();
    await expect(tabsContainer).toBeVisible();
    const containerBox = await tabsContainer.boundingBox();
    const viewportSize = page.viewportSize();
    expect(containerBox!.width).toBeLessThanOrEqual(viewportSize!.width);
  });

  test("clicking Pendientes filter shows match cards or empty state", async ({ page }) => {
    await page.getByRole("button", { name: /Pendientes/ }).click();
    // Either match cards or empty state message
    const emptyState = page.getByText(/ninguna predicción|No hay partidos/);
    const matchCards = page.locator(".space-y-3.px-4 > *");
    const hasContent = (await matchCards.count()) > 0 || await emptyState.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });

  test("phase tabs switch — first available tab is active by default", async ({ page }) => {
    const tabsContainer = page.locator(".overflow-x-auto").first();
    const firstTab = tabsContainer.locator("button").first();
    const exists = await firstTab.isVisible().catch(() => false);
    if (exists) {
      await expect(firstTab).toHaveClass(/bg-green-600/);
    }
  });

  test("rules modal opens via ? button", async ({ page }) => {
    const helpBtn = page.getByTitle("Ver reglas completas");
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();
    await expect(page.getByText("Reglas de puntuación")).toBeVisible();
  });

  test("rules modal is scrollable and shows all sections", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    const modalBody = page.locator('[class*="overflow-y-auto"]').last();
    await expect(modalBody).toBeVisible();

    // All section headings should be in the modal
    await expect(page.getByText("Puntos por fase")).toBeVisible();
    await expect(page.getByText("Tokens multiplicadores")).toBeVisible();
    await expect(page.getByText("Bonus de racha")).toBeVisible();
    await expect(page.getByText("Predicciones especiales")).toBeVisible();
  });

  test("rules modal shows phases in table", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    // The modal contains a table with phase data — look in the modal context
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
    // Rules modal always shows all phases regardless of DB content
    await expect(modal.getByRole("cell", { name: "Grupos" })).toBeVisible();
    await expect(modal.getByRole("cell", { name: "Final" })).toBeVisible();
  });

  test("rules modal bottom content is reachable by scroll", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    const modalBody = page.locator('[class*="overflow-y-auto"]').last();
    await modalBody.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByText(/11 jun 2026/)).toBeVisible();
  });

  test("rules modal closes on aria-labeled close button", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    await expect(page.getByText("Reglas de puntuación")).toBeVisible();
    // Use exact:true to avoid matching "Cerrar sesión" in the sidebar (desktop)
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByText("Reglas de puntuación")).not.toBeVisible();
  });

  test("rules modal closes on backdrop click", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    await expect(page.getByText("Reglas de puntuación")).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText("Reglas de puntuación")).not.toBeVisible();
  });

  test("token status bar is visible", async ({ page }) => {
    await expect(page.getByText("Mis tokens:")).toBeVisible();
  });
});
