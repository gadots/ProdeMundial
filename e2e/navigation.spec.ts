import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom nav is visible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator("nav").last();
    await expect(nav).toBeVisible();
  });

  test("bottom nav links navigate to correct pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("Tu posición").waitFor({ timeout: 12000 }).catch(() => {});
    const bottomNav = page.locator("nav").last();

    await bottomNav.getByRole("link", { name: "Predicciones" }).click();
    await expect(page).toHaveURL(/\/predicciones$/);

    await bottomNav.getByRole("link", { name: "Posiciones" }).click();
    await expect(page).toHaveURL(/\/tabla/);

    await bottomNav.getByRole("link", { name: /Especiales/ }).click();
    await expect(page).toHaveURL(/\/predicciones\/especiales/);

    await bottomNav.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("predicciones especiales page loads correctly", async ({ page }) => {
    await page.goto("/predicciones/especiales");
    await expect(page.getByRole("heading", { name: "Predicciones Especiales" })).toBeVisible();
  });

  test("grupo/config page loads correctly", async ({ page }) => {
    await page.goto("/grupo");
    await expect(page.getByRole("heading", { name: /Prode|Grupo|Config/i })).toBeVisible({ timeout: 8000 });
  });

  test("perfil page loads correctly", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: /Perfil|Mi perfil/i })).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Mobile viewport chip consistency", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test("sticky phase selector fits within viewport on mobile", async ({ page }) => {
    await page.goto("/predicciones");
    const stickyHeader = page.locator(".sticky.top-\\[57px\\]");
    const box = await stickyHeader.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(390 + 1);
  });

  test("rules modal fits within mobile viewport height", async ({ page }) => {
    await page.goto("/predicciones");
    await page.getByTitle("Ver reglas completas").click();

    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThanOrEqual(844);
  });
});
