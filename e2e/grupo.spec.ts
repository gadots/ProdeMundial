import { test, expect } from "@playwright/test";

test.describe("Grupo / Config page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/grupo");
  });

  test("renders the group/prode page heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Prode|Grupo|Config/i })).toBeVisible({ timeout: 8000 });
  });

  test("shows invite code section", async ({ page }) => {
    await expect(page.getByText(/Código|Invitar|Invitación/i)).toBeVisible({ timeout: 8000 });
  });

  test("shows member list", async ({ page }) => {
    await expect(page.getByText(/Miembros|Participantes/i)).toBeVisible({ timeout: 8000 });
  });

  test("copy button or invite code display is present", async ({ page }) => {
    const copyBtn = page.getByRole("button", { name: /Copiar|Copy/i });
    const codeDisplay = page.locator("code, kbd, [data-testid='invite-code']");
    const hasCopy = await copyBtn.isVisible().catch(() => false);
    const hasCode = await codeDisplay.isVisible().catch(() => false);
    expect(hasCopy || hasCode).toBe(true);
  });

  test("shows share or link button", async ({ page }) => {
    const shareOrLink = page.getByRole("button", { name: /Compartir|Share|Link|Invitar/i })
      .or(page.getByRole("link", { name: /Compartir|Invitar/i }));
    await expect(shareOrLink.first()).toBeVisible({ timeout: 8000 });
  });

  test("shows at least one member name", async ({ page }) => {
    // wait for members list to load
    await page.waitForTimeout(2000);
    const memberItems = page.locator("li, [class*='member'], [class*='Member']");
    const count = await memberItems.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Join / Create flows (UI)", () => {
  test("join page has Unirme and Crear tabs", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByRole("button", { name: /Unirme/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: /Crear/i })).toBeVisible({ timeout: 8000 });
  });

  test("Unirme tab shows invite code input", async ({ page }) => {
    await page.goto("/join");
    const codeInput = page.getByPlaceholder(/MUNDIAL|código|code/i)
      .or(page.locator("input[maxlength='12']"));
    await expect(codeInput.first()).toBeVisible({ timeout: 8000 });
  });

  test("Crear tab shows prode name input", async ({ page }) => {
    await page.goto("/join?tab=crear");
    const nameInput = page.getByPlaceholder(/pibes|nombre|prode/i)
      .or(page.locator("input[maxlength='50']"));
    await expect(nameInput.first()).toBeVisible({ timeout: 8000 });
  });

  test("code input pre-fills when code is in URL", async ({ page }) => {
    await page.goto("/join?code=TEST99");
    const input = page.locator("input").first();
    await expect(input).toHaveValue("TEST99", { timeout: 5000 });
  });
});
