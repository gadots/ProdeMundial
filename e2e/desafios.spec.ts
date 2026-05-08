import { test, expect } from "@playwright/test";

// La página /desafios fue eliminada del MVP.
// Este archivo ahora cubre la página /grupo (Config — quinto item del nav).
test.describe("Grupo / Config", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/grupo");
  });

  test("renders the group/prode page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Prode|Grupo|Config/i })).toBeVisible({ timeout: 8000 });
  });

  test("shows invite code section", async ({ page }) => {
    await expect(page.getByText(/Código|Invitar|Invitación/i)).toBeVisible({ timeout: 8000 });
  });

  test("shows member list", async ({ page }) => {
    await expect(page.getByText(/Miembros|Participantes/i)).toBeVisible({ timeout: 8000 });
  });

  test("invite code is copyable", async ({ page }) => {
    // A copy button or code display should be present
    const copyBtn = page.getByRole("button", { name: /Copiar|Copy/i });
    const codeDisplay = page.locator("code, kbd, [data-testid='invite-code']");
    const hasCopy = await copyBtn.isVisible().catch(() => false);
    const hasCode = await codeDisplay.isVisible().catch(() => false);
    expect(hasCopy || hasCode).toBe(true);
  });
});
