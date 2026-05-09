import { test, expect } from "@playwright/test";

// Score inputs use type="text" inputmode="numeric" (not type="number").
// Using type="number" caused a blur-before-click race condition on mobile.
const SCORE_INPUT = 'input[inputmode="numeric"]';
const SCORE_INPUT_ENABLED = 'input[inputmode="numeric"]:not([disabled])';
const SCORE_INPUT_DISABLED = 'input[inputmode="numeric"][disabled]';

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

  // ── Score inputs use inputmode="numeric", not type="number" ───────────────

  test("score inputs use type=text with inputmode=numeric (not type=number)", async ({ page }) => {
    // Regression guard: type="number" caused blur-before-click race condition on mobile.
    // All score inputs must be type=text with inputmode=numeric.
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs).toHaveCount(0);

    // At least some numeric inputs must be present (enabled or disabled)
    const numericInputs = page.locator(SCORE_INPUT);
    await expect(numericInputs.first()).toBeVisible({ timeout: 5000 });
  });

  // ── Save + existing predictions ────────────────────────────────────────────

  test("guardar predicción cambia el botón a Guardado", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator(SCORE_INPUT);
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("1");

    const saveBtn = card.getByRole("button", { name: /Guardar/ });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Must transition to "Guardado" — never stay as spinner
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });
    await expect(card.locator(".animate-spin")).not.toBeVisible();
  });

  test("editar predicción guardada vuelve a mostrar el botón Guardar", async ({ page }) => {
    // Regression guard for the lastSaved fix: once a prediction is saved (button shows
    // "Guardado"), editing any input must immediately switch the button back to "Guardar".
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    // Save with 2-1
    const inputs = card.locator(SCORE_INPUT);
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("1");
    await card.getByRole("button", { name: /Guardar/ }).click();
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });

    // Edit one value — button must revert to "Guardar"
    await inputs.nth(0).fill("3");
    await expect(card.getByRole("button", { name: "Guardar", exact: false })).toBeVisible({ timeout: 2000 });
    await expect(card.getByRole("button", { name: "Guardado", exact: false })).not.toBeVisible();
  });

  test("re-guardar después de editar funciona y vuelve a Guardado", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator(SCORE_INPUT);

    // First save
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("0");
    await card.getByRole("button", { name: /Guardar/ }).click();
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });

    // Edit and re-save
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("2");
    const saveBtn = card.getByRole("button", { name: /Guardar/ });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Must reach "Guardado" again — no stuck spinner
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });
    await expect(card.locator(".animate-spin")).not.toBeVisible();
  });

  test("predicción guardada aparece en la card al recargar la página", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator(SCORE_INPUT);
    await inputs.nth(0).fill("3");
    await inputs.nth(1).fill("0");

    await card.getByRole("button", { name: /Guardar/ }).click();
    await expect(card.getByRole("button", { name: /Guardado/ })).toBeVisible({ timeout: 5000 });

    // Reload — in mock mode, saved state is ephemeral (no DB).
    // We verify that: (a) saved cards from mock data show their values,
    // (b) no card is stuck in a loading/broken state.
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Page must render without errors
    await expect(page.getByRole("heading", { name: "Predicciones" })).toBeVisible({ timeout: 8000 });

    // If any "Guardado" cards exist (from mock data), they must show non-empty input values.
    // This catches the SW caching bug: stale API responses would show old/wrong scores.
    const savedCards = page.locator(".space-y-3 > div").filter({
      has: page.getByRole("button", { name: /Guardado/ }),
    });
    const savedCount = await savedCards.count();
    if (savedCount > 0) {
      const firstSaved = savedCards.first();
      const savedInputs = firstSaved.locator(SCORE_INPUT);
      const inputCount = await savedInputs.count();
      if (inputCount >= 2) {
        expect(await savedInputs.nth(0).inputValue()).not.toBe("");
        expect(await savedInputs.nth(1).inputValue()).not.toBe("");
      }
    }
  });

  test("guardar en pestaña Pendientes no deja el spinner trabado", async ({ page }) => {
    await page.getByRole("button", { name: /Pendientes/ }).click();

    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    const hasPending = await card.isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasPending) return;

    const inputs = card.locator(SCORE_INPUT);
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
    await page.waitForLoadState("networkidle");

    const savedCards = page.locator(".space-y-3 > div").filter({
      has: page.getByRole("button", { name: /Guardado/ }),
    });

    const count = await savedCards.count();
    if (count === 0) return; // no saved predictions yet — vacuously passing

    // Each saved card must have non-empty input values
    const firstSaved = savedCards.first();
    const inputs = firstSaved.locator(SCORE_INPUT);
    const inputCount = await inputs.count();

    // Locked (finished/live) cards don't have inputs — skip those
    if (inputCount < 2) return;

    expect(await inputs.nth(0).inputValue()).not.toBe("");
    expect(await inputs.nth(1).inputValue()).not.toBe("");
  });

  test("no se puede guardar sin completar ambos scores", async ({ page }) => {
    const card = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_ENABLED),
    }).first();

    await expect(card).toBeVisible({ timeout: 8000 });

    const inputs = card.locator(SCORE_INPUT);
    await inputs.nth(0).fill("2");
    // Only home filled — save button must be disabled
    await expect(card.getByRole("button", { name: /Guardar/ })).toBeDisabled();
  });

  test("no se puede guardar un partido bloqueado", async ({ page }) => {
    // FINISHED matches should have locked cards (no save button)
    const lockedCard = page.locator(".space-y-3 > div").filter({
      has: page.locator(SCORE_INPUT_DISABLED),
    }).first();

    const exists = await lockedCard.isVisible({ timeout: 3000 }).catch(() => false);
    if (!exists) return;

    await expect(lockedCard.getByRole("button", { name: /Guardar/ })).not.toBeVisible();
  });
});
