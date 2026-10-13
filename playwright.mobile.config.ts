import { defineConfig, devices } from "@playwright/test";

const mobileE2ePort = Number(process.env.MOBILE_E2E_PORT ?? 19007);

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
    baseURL: `http://127.0.0.1:${mobileE2ePort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `EXPO_NO_DOTENV=1 EXPO_PUBLIC_DEMO_MODE=false EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY= corepack yarn turbo dev --filter=@schedule-app/mobile -- --web --port ${mobileE2ePort}`,
    url: `http://127.0.0.1:${mobileE2ePort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
