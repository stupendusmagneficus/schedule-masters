import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report" }]]
    : "list",
  testMatch: "**/mobile-web.spec.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:19006",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= corepack yarn turbo dev --filter=@schedule-app/mobile -- --web --port 19006",
    url: "http://127.0.0.1:19006",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
