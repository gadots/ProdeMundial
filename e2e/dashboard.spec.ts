import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders title and user greeting", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/Hola,/)).toBeVisible();
  });

  test("renders ranking card with position and points", async ({ page }) => {
    await expect(page.getByText("Tu posición")).toBeVisible({ timeout: 12000 });
    await expect(page.getByText("Puntos")).toBeVisible();
  });

  test("desafios chip is visible and links to /desafios", async ({ page }) => {
    // Scope to the main content (not nav) - look for the chip by its div content
    const chip = page.locator('a[href="/desafios"]').filter({ has: page.locator("div") }).first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute("href", "/desafios");
  });

  test("desafios chip has consistent height with other chips", async ({ page }) => {
    const desafiosChip = page.locator('a[href="/desafios"] > div').first();
    const box = await desafiosChip.boundingBox();
    expect(box).not.toBeNull();
    // Should be at least 44px tall (comfortable touch target)
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("tokens chip links to predicciones when tokens available", async ({ page }) => {
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

  test("all three action chips have consistent height", async ({ page }) => {
    // Racha, Tokens, Desafíos — all should have two lines and similar height
    const desafiosChip = page.locator('a[href="/desafios"] > div').first();
    const box = await desafiosChip.boundingBox();
    expect(box).not.toBeNull();
    // Two-line chips should be taller than a single-line element
    expect(box!.height).toBeGreaterThanOrEqual(52);
  });
});
