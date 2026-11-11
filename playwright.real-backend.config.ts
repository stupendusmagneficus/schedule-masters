// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: standalone opt-in test configuration, not a Turbo task.
import { defineConfig, devices } from "@playwright/test";

const apiUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (
  process.env.REAL_BACKEND_E2E !== "1" ||
  !apiUrl ||
  !publishableKey ||
  !serviceRoleKey
) {
  throw new Error(
    "Real-backend E2E requires explicit opt-in and local Supabase credentials",
  );
}
const parsed = new URL(apiUrl);
if (
  parsed.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  parsed.username ||
  parsed.password
) {
  throw new Error(
    "Real-backend E2E only permits an isolated local Supabase URL",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/real-{booking,onboarding,payment}.spec.ts",
  workers: 1,
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3102" },
  webServer: [
    {
      command: "node node_modules/next/dist/bin/next dev --port 3102",
      cwd: "./apps/booking-web",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: apiUrl,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        NEXT_PUBLIC_ANALYTICS_API_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    },
    {
      command:
        "EXPO_NO_DOTENV=1 corepack yarn turbo dev --filter=@schedule-app/mobile -- --web --port 19057",
      url: "http://127.0.0.1:19057",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        EXPO_PUBLIC_DEMO_MODE: "false",
        EXPO_PUBLIC_SUPABASE_URL: apiUrl,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    },
  ],
});
