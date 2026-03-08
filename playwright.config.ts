import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// Load .env.local so test helpers (global-setup, specs) have access to
// Supabase keys and other secrets. In CI these come from GitHub Secrets instead.
config({ path: ".env.local" });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // In CI, the server is started externally before Playwright runs.
  // Locally, Playwright starts the dev server automatically.
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PLAYWRIGHT_TEST_MODE: "true",
        },
      },

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
});
