import { test, expect } from "@playwright/test";

test.describe("Perfil page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/perfil");
    await page.waitForLoadState("networkidle");
  });

  test("renders the profile heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Perfil|Mi perfil/i })).toBeVisible({ timeout: 8000 });
  });

  test("shows user display name or avatar", async ({ page }) => {
    // h2 shows the user's display name; an <img> appears if avatarUrl is set
    const displayNameH2 = page.locator("h2").first();
    const avatarImg = page.locator("img[alt]");
    const hasH2 = await displayNameH2.isVisible().catch(() => false);
    const hasImg = await avatarImg.first().isVisible().catch(() => false);
    expect(hasH2 || hasImg).toBe(true);
  });

  test("shows display name input for editing", async ({ page }) => {
    // Input has placeholder "Tu nombre" (no explicit type attribute on shadcn Input)
    const nameInput = page.getByPlaceholder("Tu nombre");
    await expect(nameInput).toBeVisible({ timeout: 8000 });
  });

  test("shows logout button", async ({ page }) => {
    // Scoped to <main> to avoid the hidden sidebar duplicate on mobile
    const logoutBtn = page.locator("main").getByRole("button", { name: /Cerrar sesión/i });
    await expect(logoutBtn).toBeVisible({ timeout: 8000 });
  });

  test("shows change password section or button", async ({ page }) => {
    const passSection = page.getByText(/Contraseña|Password|contraseña/i);
    await expect(passSection.first()).toBeVisible({ timeout: 8000 });
  });

  test("shows points or rank stats", async ({ page }) => {
    // Stats like "pts", "racha" appear in badges and stat cards
    const stats = page.getByText(/pts|racha|Puntos|Ranking/i);
    await expect(stats.first()).toBeVisible({ timeout: 8000 });
  });
});
