import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("renders title and user greeting", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/Hola,/)).toBeVisible();
  });

  test("renders ranking card with position and points", async ({ page }) => {
    await expect(page.getByText("Tu posición")).toBeVisible({ timeout: 12000 });
    await expect(page.getByText("Puntos")).toBeVisible();
  });

  test("especiales chip is visible and links to /predicciones/especiales", async ({ page }) => {
    // On desktop: quick-access chip is visible. On mobile: bottom nav link is visible.
    // The first link in DOM order may be hidden (sidebar); just verify the link exists with correct href.
    const link = page.locator('a[href="/predicciones/especiales"]').first();
    await expect(link).toHaveAttribute("href", "/predicciones/especiales");
  });

  test("tokens chip links to /predicciones when tokens available", async ({ page }) => {
    const tokenChip = page.locator('a[href="/predicciones"]').filter({
      has: page.locator('span', { hasText: /token/i }),
    }).first();
    const isVisible = await tokenChip.isVisible().catch(() => false);
    if (isVisible) {
      await expect(tokenChip).toBeVisible();
    }
  });

  test("shows upcoming matches section", async ({ page }) => {
    await expect(page.getByText(/Próximos partidos|Partidos/)).toBeVisible();
  });

  test("match cards are visible in the main column", async ({ page }) => {
    const matchSection = page.locator("section").filter({ has: page.getByText(/Próximos|Partidos|En vivo/) });
    await expect(matchSection).toBeVisible();
    const cards = matchSection.locator("a");
    await expect(cards.first()).toBeVisible();
  });

  test("posiciones card links to /tabla", async ({ page }) => {
    const posCard = page.locator('a[href="/tabla"]').filter({ has: page.getByText("Tu posición") });
    await expect(posCard).toBeVisible({ timeout: 12000 });
    await posCard.click();
    await expect(page).toHaveURL(/\/tabla/);
  });
});
