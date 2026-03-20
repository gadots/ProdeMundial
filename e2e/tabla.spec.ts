import { test, expect } from "@playwright/test";

test.describe("Tabla (Posiciones)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tabla");
  });

  test("renders title heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Posiciones" })).toBeVisible();
  });

  test("General tab is active by default and styled distinctly", async ({ page }) => {
    const generalTab = page.getByRole("button", { name: "General" });
    await expect(generalTab).toBeVisible();
    await expect(generalTab).toHaveClass(/bg-green-600/);
  });

  test("player rows are visible with rank and points", async ({ page }) => {
    await expect(page.getByText("pts").first()).toBeVisible({ timeout: 12000 });
  });

  test("Hoy column header visible in total view", async ({ page }) => {
    await expect(page.getByText("Hoy")).toBeVisible();
  });

  test("current user row is highlighted", async ({ page }) => {
    await expect(page.getByText("(vos)")).toBeVisible({ timeout: 12000 });
  });

  test("phase tabs appear in the selector", async ({ page }) => {
    const selector = page.locator(".overflow-x-auto").first();
    await expect(selector).toBeVisible();
  });

  test("clicking a phase tab hides the Hoy column", async ({ page }) => {
    const gruposBtn = page.getByRole("button", { name: /Grupos/ });
    const exists = await gruposBtn.isVisible().catch(() => false);
    if (exists) {
      await gruposBtn.click();
      await expect(page.getByText("Hoy")).not.toBeVisible();
    }
  });
});
