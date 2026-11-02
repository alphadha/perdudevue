import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = process.env.PDV_FRONTEND_URL ?? "http://localhost:3000";
const API_URL = process.env.PDV_API_URL ?? "http://localhost:8000/api/v1";
const BACKEND_URL = process.env.PDV_BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  metadata: {
    apiURL: API_URL,
    backendURL: BACKEND_URL,
    cahier: "docs/Cahier_de_recette_Perdues_de_Vue.xlsx",
  },
});
