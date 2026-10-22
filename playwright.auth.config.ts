import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.AUTH_E2E_PORT ?? 19047);
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/auth-web.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-auth-report" }]]
    : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    // This test server uses a deliberately unreachable local API; every Auth
    // response in the tests is intercepted. No real credentials or account.
    command: `EXPO_NO_DOTENV=1 EXPO_PUBLIC_DEMO_MODE=false EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=auth-e2e-fixture EXPO_PUBLIC_AUTH_REDIRECT_URL=http://127.0.0.1:${port}/auth/callback corepack yarn turbo dev --filter=@schedule-app/mobile -- --web --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
