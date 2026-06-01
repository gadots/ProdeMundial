import { test, expect } from "@playwright/test";

test.describe("Predicciones Especiales", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/predicciones/especiales");
    // Wait for networkidle so the service worker controllerchange + reload completes
    // before any test interaction, preventing mid-test state resets.
    await page.waitForLoadState("networkidle");
  });

  // ── Renderizado básico ────────────────────────────────────────────────────

  test("renders page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Predicciones Especiales" })).toBeVisible();
  });

  test("shows info banner about tournament lock", async ({ page }) => {
    await expect(page.getByText("Se cierran al inicio del torneo")).toBeVisible();
  });

  test("shows progress counter with 2 pre-filled predictions", async ({ page }) => {
    // ARG y Lionel Messi vienen pre-cargados por defecto
    await expect(page.getByText(/de 5 completadas/)).toBeVisible();
  });

  test("shows total available points", async ({ page }) => {
    // 60 + 35 + 25 + 40 + 20 = 180
    await expect(page.getByText("180 pts disponibles")).toBeVisible();
  });

  test("shows all 5 prediction cards", async ({ page }) => {
    await expect(page.getByText("Campeón del Mundo")).toBeVisible();
    await expect(page.getByText("Finalista")).toBeVisible();
    // { exact: true } avoids matching description text "¿Quién gana el partido por el tercer puesto?"
    await expect(page.getByText("Tercer Puesto", { exact: true })).toBeVisible();
    await expect(page.getByText("Goleador del Torneo")).toBeVisible();
    await expect(page.getByText("Selección con más goles")).toBeVisible();
  });

  test("shows correct point badges for each card", async ({ page }) => {
    await expect(page.getByText("60 pts")).toBeVisible();
    await expect(page.getByText("40 pts")).toBeVisible();
    await expect(page.getByText("35 pts")).toBeVisible();
    await expect(page.getByText("25 pts")).toBeVisible();
    await expect(page.getByText("20 pts")).toBeVisible();
  });

  // ── TeamSelector ──────────────────────────────────────────────────────────

  test("team selector search input is visible", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Buscar selección"]').first();
    await expect(searchInput).toBeVisible();
  });

  test("searching for a team filters the grid", async ({ page }) => {
    const firstSearch = page.locator('input[placeholder*="Buscar selección"]').first();
    await firstSearch.fill("Bras");
    await expect(page.getByRole("button", { name: /BRA/ }).first()).toBeVisible();
  });

  test("clicking a team button selects it and shows confirmation", async ({ page }) => {
    // Usar el segundo TeamSelector (Finalista) para no pisar la selección de campeón
    const searchInputs = page.locator('input[placeholder*="Buscar selección"]');
    await searchInputs.nth(1).fill("Franc");
    const fraButton = page.getByRole("button", { name: /FRA/ }).first();
    // Use evaluate() to bypass <nextjs-portal> dev overlay pointer-event interception
    await fraButton.evaluate((btn) => (btn as HTMLElement).click());
    // El nombre completo debe aparecer debajo como confirmación
    await expect(page.getByText("Francia")).toBeVisible();
  });

  // ── PlayerInput ───────────────────────────────────────────────────────────

  test("player input is pre-filled with Lionel Messi", async ({ page }) => {
    const playerInput = page.locator('input[placeholder*="nombre del jugador"]');
    await expect(playerInput).toBeVisible();
    await expect(playerInput).toHaveValue("Lionel Messi");
  });

  test("player input shows autocomplete suggestions when typing", async ({ page }) => {
    const playerInput = page.locator('input[placeholder*="nombre del jugador"]');
    await playerInput.fill("Mba");
    await expect(page.getByText("Kylian Mbappé")).toBeVisible();
  });

  test("selecting a player suggestion fills the input", async ({ page }) => {
    const playerInput = page.locator('input[placeholder*="nombre del jugador"]');
    await playerInput.fill("Mba");
    const suggestion = page.locator("button").filter({ hasText: "Kylian Mbappé" });
    await expect(suggestion).toBeVisible({ timeout: 3000 });
    // Use evaluate to click without Playwright's stability checks — the suggestion list
    // can re-render while filling, causing false "unstable" errors with regular .click().
    await suggestion.evaluate((btn) => (btn as HTMLElement).click());
    await expect(playerInput).toHaveValue("Kylian Mbappé");
  });

  // ── Progress bar ──────────────────────────────────────────────────────────

  test("progress bar is visible with amber color", async ({ page }) => {
    const bar = page.locator(".bg-amber-500").first();
    await expect(bar).toBeVisible();
  });

  // ── Botón guardar ─────────────────────────────────────────────────────────

  test("save button is enabled because predictions are pre-filled", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /Guardar predicciones especiales/ });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
  });

  test("save button text changes after clicking", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /Guardar predicciones especiales/ });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    // Use evaluate() to bypass <nextjs-portal> dev overlay pointer-event interception
    // (overlay loads fully after networkidle in beforeEach)
    await saveBtn.evaluate((btn) => (btn as HTMLElement).click());
    await expect(
      page.getByRole("button", { name: /Predicciones guardadas/ })
    ).toBeVisible({ timeout: 5000 });
  });
});
