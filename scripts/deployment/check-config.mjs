import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { validateReleaseConfig } from "./config.mjs";

try {
  const local = process.argv.includes("--local");
  const mobile = local
    ? parseEnv(readFileSync("apps/mobile/.env", "utf8"))
    : process.env;
  const booking = local
    ? parseEnv(readFileSync("apps/booking-web/.env", "utf8"))
    : process.env;
  const result = validateReleaseConfig({
    environment: process.env.RELEASE_ENVIRONMENT ?? "pilot",
    projectRef:
      process.env.SUPABASE_PROJECT_REF ??
      (local ? "jakksxrebisudkecednm" : undefined),
    mobileUrl: mobile.EXPO_PUBLIC_SUPABASE_URL,
    bookingUrl: booking.NEXT_PUBLIC_SUPABASE_URL,
    mobileKey: mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    bookingKey: booking.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    demoMode: mobile.EXPO_PUBLIC_DEMO_MODE,
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    error instanceof Error && error.code === "ENOENT"
      ? "Missing client .env file; copy each app's .env.example first"
      : error.message,
  );
  process.exitCode = 1;
}
