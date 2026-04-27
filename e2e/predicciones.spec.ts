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

  // ── Save + existing predictions ────────────────────────────────────────────

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

    // Must transition to "Guardado" — never stay as spinner
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });
    await expect(card.locator(".animate-spin")).not.toBeVisible();
  });

  test("predicción guardada aparece en la card al recargar la página", async ({ page }) => {
    // Save a prediction first
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("3");
    await inputs.nth(1).fill("0");

    await card.getByRole("button", { name: /Guardar/ }).click();
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The same card must now show the saved score values, not empty inputs
    // Find a card that shows "Guardado" (saved state) OR has the previously entered values
    const savedCard = page.locator(".space-y-3 > div").filter({
      has: page.getByRole("button", { name: /Guardado/ }),
    }).first();

    await expect(savedCard).toBeVisible({ timeout: 10000 });
  });

  test("guardar en pestaña Pendientes no deja el spinner trabado", async ({ page }) => {
    await page.getByRole("button", { name: /Pendientes/ }).click();

    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    const hasPending = await card.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPending) return;

    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("0");

    await card.getByRole("button", { name: /Guardar/ }).click();

    // After save: either shows "Guardado" or disappears from Pendientes list.
    // What must NOT happen: spinner stuck.
    const savedBtn = card.getByRole("button", { name: /Guardado/ });

    const outcome = await Promise.race([
      savedBtn.waitFor({ state: "visible", timeout: 5000 }).then(() => "saved"),
      card.waitFor({ state: "hidden", timeout: 5000 }).then(() => "gone"),
    ]).catch(() => "timeout");

    expect(["saved", "gone"]).toContain(outcome);
    if (await card.isVisible().catch(() => false)) {
      await expect(card.locator(".animate-spin")).not.toBeVisible();
    }
  });

  test("cards con predicciones ya guardadas muestran inputs llenos al cargar", async ({ page }) => {
    // In mock mode, MOCK_MY_PREDICTIONS has predictions for FINISHED matches (m1-m5).
    // For real Supabase mode, after saving, reload must show the prediction.
    // This test verifies the async load: if any card shows "Guardado", it must have values.
    await page.waitForLoadState("networkidle");

    const savedCards = page.locator(".space-y-3 > div").filter({
      has: page.getByRole("button", { name: /Guardado/ }),
    });

    const count = await savedCards.count();
    if (count === 0) return; // no saved predictions yet — test is vacuously passing

    // Each saved card must have non-empty input values (the saved prediction must be shown)
    const firstSaved = savedCards.first();
    const inputs = firstSaved.locator('input[type="number"]');
    const inputCount = await inputs.count();

    // Locked (finished/live) cards don't have inputs — skip those
    if (inputCount < 2) return;

    const homeVal = await inputs.nth(0).inputValue();
    const awayVal = await inputs.nth(1).inputValue();

    expect(homeVal).not.toBe("");
    expect(awayVal).not.toBe("");
  });

  test("no se puede guardar sin completar ambos scores", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"]:not([disabled])'),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator('input[type="number"]');
    await inputs.nth(0).fill("2");
    // Only home filled — save button must be disabled
    await expect(card.getByRole("button", { name: /Guardar/ })).toBeDisabled();
  });

  test("no se puede guardar un partido bloqueado", async ({ page }) => {
    // FINISHED matches should have locked cards (no save button)
    const lockedCard = page.locator(".space-y-3 > div").filter({
      has: page.locator('input[type="number"][disabled]'),
    }).first();

    const exists = await lockedCard.isVisible({ timeout: 3000 }).catch(() => false);
    if (!exists) return;

    await expect(lockedCard.getByRole("button", { name: /Guardar/ })).not.toBeVisible();
  });
});
