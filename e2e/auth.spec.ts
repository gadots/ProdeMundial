import { test, expect } from "@playwright/test";

test.describe("Auth — middleware y redirects", () => {
  test("usuario NO autenticado que accede a /dashboard es redirigido a /", async ({ browser }) => {
    // Contexto fresco sin cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/", { timeout: 8000 });
    await context.close();
  });

  test("usuario NO autenticado que accede a /predicciones es redirigido a /", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/predicciones");
    await expect(page).toHaveURL("/", { timeout: 8000 });
    await context.close();
  });

  test("usuario autenticado que visita / es redirigido a /dashboard", async ({ page }) => {
    // Este test corre con storageState (autenticado)
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8000 });
  });

  test("página de login tiene formulario de email y password", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await context.close();
  });
});
