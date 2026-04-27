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
    const tabsContainer = page.locator(".overflow-x-auto").first();
    const firstTab = tabsContainer.locator("button").first();
    const exists = await firstTab.isVisible().catch(() => false);
    if (exists) {
      const box = await firstTab.boundingBox();
      expect(box).not.toBeNull();
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
    const emptyState = page.getByText(/ninguna predicción|No hay partidos|Todo cargado/);
    const matchCards = page.locator(".space-y-3.px-4 > *");
    const hasContent = (await matchCards.count()) > 0 || await emptyState.isVisible().catch(() => false);
    expect(hasContent).toBe(true);
  });

  test("first active phase tab has amber highlight", async ({ page }) => {
    const tabsContainer = page.locator(".overflow-x-auto").first();
    const firstTab = tabsContainer.locator("button").first();
    const exists = await firstTab.isVisible().catch(() => false);
    if (exists) {
      await expect(firstTab).toHaveClass(/bg-amber-600/);
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

    await expect(page.getByText("Puntos por fase")).toBeVisible();
    await expect(page.getByText("Potenciadores")).toBeVisible();
    await expect(page.getByText("Bonus de racha")).toBeVisible();
    await expect(page.getByText("Predicciones especiales")).toBeVisible();
  });

  test("rules modal shows phases in table", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
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
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByText("Reglas de puntuación")).not.toBeVisible();
  });

  test("rules modal closes on backdrop click", async ({ page }) => {
    await page.getByTitle("Ver reglas completas").click();
    await expect(page.getByText("Reglas de puntuación")).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByText("Reglas de puntuación")).not.toBeVisible();
  });

  test("potenciadores bar is visible", async ({ page }) => {
    await expect(page.getByText("Mis potenciadores:")).toBeVisible();
  });

  // ── Save regression tests ──────────────────────────────────────────────────

  test("guardar predicción cambia el botón a Guardado", async ({ page }) => {
    // Find the first card with unlocked (non-disabled) score inputs
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("1");

    const saveBtn = card.getByRole("button", { name: /Guardar/ });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Button must transition to "Guardado" — not stay as spinner
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });
    await expect(card.locator(".animate-spin")).not.toBeVisible();
  });

  test("guardar en pestaña Pendientes no deja el spinner trabado", async ({ page }) => {
    await page.getByRole("button", { name: /Pendientes/ }).click();

    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    // Skip if no pending matches exist
    const hasPending = await card.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPending) return;

    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("0");

    await card.getByRole("button", { name: /Guardar/ }).click();

    // After save, either the card shows "Guardado ✓" or disappears from the list.
    // What must NOT happen is a stuck spinner.
    const savedBtn = card.getByRole("button", { name: /Guardado/ });
    const disappeared = card.isHidden();

    const resolved = await Promise.race([
      savedBtn.waitFor({ state: "visible", timeout: 5000 }).then(() => "saved"),
      disappeared.then((hidden) => hidden ? "gone" : "still-visible"),
    ]).catch(() => "timeout");

    expect(["saved", "gone"]).toContain(resolved);
    // If card is still visible it must not show a spinner
    if (await card.isVisible().catch(() => false)) {
      await expect(card.locator(".animate-spin")).not.toBeVisible();
    }
  });

  test("no se puede guardar sin completar ambos scores", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    // Fill only the home score — save button must remain disabled
    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("2");

    const saveBtn = card.getByRole("button", { name: /Guardar/ });
    await expect(saveBtn).toBeDisabled();
  });
});
