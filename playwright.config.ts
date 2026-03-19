import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./e2e/constants";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Proyecto de setup: corre auth.setup.ts primero, guarda cookies
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
