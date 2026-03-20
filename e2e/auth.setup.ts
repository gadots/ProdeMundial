import { test as setup, expect } from "@playwright/test";
import { AUTH_FILE } from "./constants";

setup("autenticar usuario de test", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_TEST_EMAIL y E2E_TEST_PASSWORD deben estar definidos en .env.local para correr los tests E2E con auth."
    );
  }

  await page.goto("/");

  // Completar login
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Esperar que redirija a dashboard o join (si el usuario no tiene prode)
  await expect(page).toHaveURL(/\/(dashboard|join)/, { timeout: 15000 });

  // Si redirigió a /join, crear un prode de test
  if (page.url().includes("/join")) {
    await page.getByRole("button", { name: /Crear/i }).click();
    await page.fill('input[placeholder*="Pibes"]', "E2E Test Prode");
    await page.getByRole("button", { name: /Crear prode/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  }

  // Esperar a que los datos del prode carguen antes de guardar el estado
  // (para que los tests que dependen de prode data encuentren el contenido)
  await page.getByText("Tu posición").waitFor({ timeout: 12000 }).catch(() => {});

  // Guardar estado de auth (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
