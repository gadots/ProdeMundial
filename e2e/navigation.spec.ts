import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("bottom nav is visible on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    // Bottom nav has fixed positioning at the bottom
    const nav = page.locator("nav").last();
    await expect(nav).toBeVisible();
  });

  test("bottom nav links navigate to correct pages", async ({ page }) => {
    await page.goto("/dashboard");
    // Scope to the bottom nav (last nav in DOM = bottom nav on mobile)
    const bottomNav = page.locator("nav").last();

    // Navigate to Predicciones
    await bottomNav.getByRole("link", { name: "Predicciones" }).click();
    await expect(page).toHaveURL(/\/predicciones$/);

    // Navigate to Posiciones
    await bottomNav.getByRole("link", { name: "Posiciones" }).click();
    await expect(page).toHaveURL(/\/tabla/);

    // Navigate to Desafíos
    await bottomNav.getByRole("link", { name: /Desafíos/ }).click();
    await expect(page).toHaveURL(/\/desafios/);

    // Navigate back to Dashboard
    await bottomNav.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("predicciones especiales page loads correctly", async ({ page }) => {
    await page.goto("/predicciones/especiales");
    await expect(page.getByRole("heading", { name: "Predicciones Especiales" })).toBeVisible();
  });
});

test.describe("Mobile viewport chip consistency", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test("dashboard desafios chip has consistent height vs tokens chip", async ({ page }) => {
    await page.goto("/dashboard");

    const desafiosChip = page.locator('a[href="/desafios"] > div').first();
    const tokenChip = page.locator('a[href="/predicciones"]')
      .filter({ has: page.locator("span", { hasText: /token/i }) })
      .locator("> div")
      .first();

    const desafiosBox = await desafiosChip.boundingBox();
    // If token chip is visible, compare heights
    const tokenVisible = await tokenChip.isVisible().catch(() => false);
    if (tokenVisible && desafiosBox) {
      const tokenBox = await tokenChip.boundingBox();
      if (tokenBox) {
        // Heights should be within 4px of each other
        expect(Math.abs(desafiosBox.height - tokenBox.height)).toBeLessThanOrEqual(4);
      }
    } else {
      // Just verify desafios chip is a reasonable height
      expect(desafiosBox).not.toBeNull();
      expect(desafiosBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("sticky phase selector fits within viewport on mobile", async ({ page }) => {
    await page.goto("/predicciones");
    // The sticky header bar should not exceed the viewport width
    const stickyHeader = page.locator(".sticky.top-\\[57px\\]");
    const box = await stickyHeader.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(390 + 1); // +1 for rounding
  });

  test("rules modal fits within mobile viewport height", async ({ page }) => {
    await page.goto("/predicciones");
    await page.getByTitle("Ver reglas completas").click();

    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    // Modal should be at most full viewport height minus padding
    expect(box!.height).toBeLessThanOrEqual(844);
  });
});
