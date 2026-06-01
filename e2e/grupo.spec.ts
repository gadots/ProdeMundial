import { test, expect } from "@playwright/test";

test.describe("Grupo / Config page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/grupo");
    await page.waitForLoadState("networkidle");
  });

  test("renders the group/prode page heading", async ({ page }) => {
    // Multiple headings match /Prode|Grupo|Config/i; take the first (TopBar h1)
    await expect(page.getByRole("heading", { name: /Prode|Grupo|Config/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("shows invite code section", async ({ page }) => {
    await expect(page.getByText(/Código|Invitar|Invitación/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("shows member list", async ({ page }) => {
    await expect(page.getByText(/Participantes/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("copy button or invite code display is present", async ({ page }) => {
    // Sharing section has a "Compartir" button and displays the invite code
    const shareBtn = page.getByRole("button", { name: /Compartir/i });
    const inviteCode = page.getByText(/MUNDIAL/i);
    const hasShare = await shareBtn.isVisible().catch(() => false);
    const hasCode = await inviteCode.first().isVisible().catch(() => false);
    expect(hasShare || hasCode).toBe(true);
  });

  test("shows at least one member name", async ({ page }) => {
    // Mock data has "Guido G." as the current user member
    await expect(page.getByText("Guido G.").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Join / Create flows (UI)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");
  });

  test("join page has Unirme and Crear tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Unirme", exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: /Crear/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test("Unirme tab shows invite code input", async ({ page }) => {
    const codeInput = page.getByPlaceholder(/MUNDIAL|código|code/i)
      .or(page.locator("input[maxlength='12']"));
    await expect(codeInput.first()).toBeVisible({ timeout: 8000 });
  });

  test("Crear tab shows prode name input", async ({ page }) => {
    await page.goto("/join?tab=crear");
    await page.waitForLoadState("networkidle");
    const nameInput = page.getByPlaceholder(/pibes|nombre|prode/i)
      .or(page.locator("input[maxlength='50']"));
    await expect(nameInput.first()).toBeVisible({ timeout: 8000 });
  });

  test("code input pre-fills when code is in URL", async ({ page }) => {
    await page.goto("/join?code=TEST99");
    await page.waitForLoadState("networkidle");
    const input = page.locator("input").first();
    await expect(input).toHaveValue("TEST99", { timeout: 5000 });
  });
});
