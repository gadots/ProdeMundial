import { test, expect } from "@playwright/test";

test.describe("Desafíos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/desafios");
  });

  test("renders title heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Desafíos" })).toBeVisible();
  });

  test("shows intro banner with wildcards description", async ({ page }) => {
    await expect(page.getByText("Wildcards semanales")).toBeVisible();
  });

  test("tab switcher shows Abiertos and Cerrados", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Abiertos/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cerrados/ })).toBeVisible();
  });

  test("clicking Cerrados tab activates it", async ({ page }) => {
    const closedTab = page.getByRole("button", { name: /Cerrados/ });
    await closedTab.click();
    await expect(closedTab).toHaveClass(/bg-purple-600/);
  });

  test("link to predicciones especiales is visible", async ({ page }) => {
    await expect(page.getByText("Predicciones especiales")).toBeVisible();
    // Use the card link (not the sidebar link) — it's the one with the Star icon
    const link = page.locator('a[href="/predicciones/especiales"]').last();
    await expect(link).toBeVisible();
  });
});
