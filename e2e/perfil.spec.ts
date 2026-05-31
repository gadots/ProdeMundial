import { test, expect } from "@playwright/test";

test.describe("Perfil page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/perfil");
  });

  test("renders the profile heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Perfil|Mi perfil/i })).toBeVisible({ timeout: 8000 });
  });

  test("shows user display name or avatar", async ({ page }) => {
    await page.waitForTimeout(1500);
    // Either an avatar image, initials badge, or display name text
    const avatar = page.locator("img[alt], [class*='avatar'], [class*='Avatar']");
    const displayName = page.locator("[class*='display'], input[type='text']").first();
    const hasAvatar = await avatar.first().isVisible().catch(() => false);
    const hasName = await displayName.isVisible().catch(() => false);
    expect(hasAvatar || hasName).toBe(true);
  });

  test("shows display name input for editing", async ({ page }) => {
    await page.waitForTimeout(1500);
    const nameInput = page.locator("input[type='text']").first();
    await expect(nameInput).toBeVisible({ timeout: 8000 });
  });

  test("shows logout button", async ({ page }) => {
    const logoutBtn = page.getByRole("button", { name: /Cerrar sesión|Salir|Logout/i })
      .or(page.getByText(/Cerrar sesión|Salir/i));
    await expect(logoutBtn.first()).toBeVisible({ timeout: 8000 });
  });

  test("shows change password section or button", async ({ page }) => {
    const passSection = page.getByText(/Contraseña|Password/i)
      .or(page.getByRole("button", { name: /Cambiar contraseña|contraseña/i }));
    await expect(passSection.first()).toBeVisible({ timeout: 8000 });
  });

  test("shows points or rank stats", async ({ page }) => {
    await page.waitForTimeout(1500);
    // Stats like "pts", "puesto", "racha"
    const stats = page.getByText(/pts|puesto|racha|Puntos|Ranking/i);
    await expect(stats.first()).toBeVisible({ timeout: 8000 });
  });
});
