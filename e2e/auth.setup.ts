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

  // Esperar que el login redirija al dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  // Guardar estado de auth (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
