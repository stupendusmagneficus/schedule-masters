import { defineConfig, devices } from "@playwright/test";

// biome-ignore lint/suspicious/noUndeclaredEnvVars: Playwright runs outside Turbo tasks.
const bookingE2ePort = Number(process.env.BOOKING_E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "playwright-report" }]]
    : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "booking-web",
      testMatch: "**/booking-web.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${bookingE2ePort}`,
      },
    },
  ],
  webServer: [
    {
      command: `NEXT_PUBLIC_SUPABASE_URL=https://schedule-masters-test.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=playwright-test-key corepack yarn turbo dev --filter=@schedule-app/booking-web -- --port ${bookingE2ePort}`,
      url: `http://127.0.0.1:${bookingE2ePort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
