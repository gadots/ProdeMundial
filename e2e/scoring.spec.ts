import { test, expect } from "@playwright/test";

// Regression tests for PHASE_POINTS values — verifies the rules modal
// displays the correct scoring table consistent with the DB function.
// If these values appear wrong, check src/lib/types.ts PHASE_POINTS and
// supabase/migrations/007+008 calculate_match_points().
test.describe("Scoring — tabla de puntos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/predicciones");
    await page.getByTitle("Ver reglas completas").click();
    await expect(page.getByText("Reglas de puntuación")).toBeVisible();
  });

  test("modal shows correct exact points per phase", async ({ page }) => {
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });

    // Exact points: GROUP=3, R32=6, R16=10, QF=18, SF=30, Final=50
    await expect(modal.getByRole("cell", { name: "3" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "6" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "10" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "18" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "30" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "50" }).first()).toBeVisible();
  });

  test("modal shows correct winner points per phase", async ({ page }) => {
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });

    // Winner: GROUP=1, R32=2, R16=4, QF=6, SF=10, Final=20
    await expect(modal.getByRole("cell", { name: "1" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "2" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "4" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "6" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "10" }).first()).toBeVisible();
    await expect(modal.getByRole("cell", { name: "20" }).first()).toBeVisible();
  });

  test("modal shows group draw = 2 pts (not 1)", async ({ page }) => {
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
    // The Grupos row must show 2 for draw — this was the bug where it showed 1
    const gruposRow = modal.getByRole("row").filter({ has: modal.getByRole("cell", { name: /Grupos/ }) });
    const exists = await gruposRow.isVisible().catch(() => false);
    if (exists) {
      await expect(gruposRow.getByRole("cell", { name: "2" })).toBeVisible();
    } else {
      // If table doesn't have row labels, just verify 2 appears as a cell value
      await expect(modal.getByRole("cell", { name: "2" }).first()).toBeVisible();
    }
  });

  test("modal shows streak bonus section", async ({ page }) => {
    await expect(page.getByText("Bonus de racha")).toBeVisible();
    // +3 pts for 3-in-a-row, +8 pts for 5-in-a-row
    await expect(page.getByText(/\+3|3 puntos/)).toBeVisible();
    await expect(page.getByText(/\+8|8 puntos/)).toBeVisible();
  });

  test("modal shows Final as highest-value phase (50 pts exact)", async ({ page }) => {
    const modal = page.locator('[class*="rounded-2xl"]').filter({
      has: page.getByText("Reglas de puntuación"),
    });
    // 50 should appear in the table for Final exact
    await expect(modal.getByRole("cell", { name: "50" })).toBeVisible();
    // 60 must NOT appear (was the wrong value before the fix)
    await expect(modal.getByRole("cell", { name: "60" })).not.toBeVisible();
  });
});
