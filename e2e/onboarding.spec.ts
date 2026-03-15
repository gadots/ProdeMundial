import { test, expect } from "@playwright/test";

test.describe("Onboarding — join/crear prode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
  });

  test("muestra los dos tabs: Unirme y Crear", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Unirme/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Crear/i })).toBeVisible();
  });

  test("tab Unirme muestra input para código de invitación", async ({ page }) => {
    await page.getByRole("button", { name: /Unirme/i }).click();
    await expect(page.getByPlaceholder("MUNDIAL26")).toBeVisible();
  });

  test("tab Crear muestra input para nombre del prode", async ({ page }) => {
    await page.getByRole("button", { name: /Crear/i }).click();
    await expect(page.getByPlaceholder(/Los Pibes/i)).toBeVisible();
  });

  test("unirse con código inválido muestra error", async ({ page }) => {
    await page.getByRole("button", { name: /Unirme/i }).click();
    await page.fill('input[placeholder="MUNDIAL26"]', "INVALIDO");
    await page.getByRole("button", { name: /Unirme al prode/i }).click();
    await expect(page.getByText(/inválido|no encontrado/i)).toBeVisible({ timeout: 8000 });
  });

  test("el botón Crear está deshabilitado con nombre muy corto", async ({ page }) => {
    await page.getByRole("button", { name: /Crear/i }).click();
    await page.fill('input[placeholder*="Pibes"]', "A");
    const btn = page.getByRole("button", { name: /Crear prode/i });
    await expect(btn).toBeDisabled();
  });

  test("el botón Unirme está deshabilitado con código muy corto", async ({ page }) => {
    await page.getByRole("button", { name: /Unirme/i }).click();
    await page.fill('input[placeholder="MUNDIAL26"]', "AB");
    const btn = page.getByRole("button", { name: /Unirme al prode/i });
    await expect(btn).toBeDisabled();
  });
});
