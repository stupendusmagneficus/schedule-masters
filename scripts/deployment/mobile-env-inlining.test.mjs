import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Compiles apps/mobile/src/config/env.ts the way a release Metro bundle does and
// evaluates it, so a dynamic env read that Expo cannot inline fails CI.
const mobileDir = fileURLToPath(new URL("../../apps/mobile/", import.meta.url));
const envFile = `${mobileDir}src/config/env.ts`;
const require = createRequire(`${mobileDir}package.json`);
const babel = require("@babel/core");

const sentinels = {
  EXPO_PUBLIC_SUPABASE_URL: "https://sentinel-supabase.invalid",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_sentinel",
  EXPO_PUBLIC_BOOKING_WEB_URL: "https://sentinel-booking.invalid",
  EXPO_PUBLIC_AUTH_REDIRECT_URL: "schedulemasters://sentinel",
  EXPO_PUBLIC_ANALYTICS_API_KEY: "phc_sentinel",
  EXPO_PUBLIC_ANALYTICS_HOST: "https://sentinel-analytics.invalid",
};

function loadReleaseEnv(buildEnv) {
  const previous = { ...process.env };
  for (const name of Object.keys(sentinels)) delete process.env[name];
  Object.assign(process.env, buildEnv, { NODE_ENV: "production" });
  try {
    const { code } = babel.transformFileSync(envFile, {
      babelrc: false,
      configFile: false,
      presets: [require.resolve("babel-preset-expo")],
      caller: {
        name: "metro",
        bundler: "metro",
        platform: "ios",
        isDev: false,
        isServer: false,
      },
    });
    const exports = {};
    // The release device has no process.env; only inlined literals survive.
    const deviceProcess = { env: {} };
    new Function("exports", "process", "globalThis", "__DEV__", code)(
      exports,
      deviceProcess,
      { process: deviceProcess },
      false,
    );
    return exports.mobileEnv;
  } finally {
    process.env = previous;
  }
}

test("release bundle inlines every EXPO_PUBLIC_* value", () => {
  assert.deepEqual(loadReleaseEnv(sentinels), {
    analyticsApiKey: sentinels.EXPO_PUBLIC_ANALYTICS_API_KEY,
    analyticsHost: sentinels.EXPO_PUBLIC_ANALYTICS_HOST,
    authRedirectUrl: sentinels.EXPO_PUBLIC_AUTH_REDIRECT_URL,
    bookingWebUrl: sentinels.EXPO_PUBLIC_BOOKING_WEB_URL,
    supabaseUrl: sentinels.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: sentinels.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
});

test("release bundle without a booking URL does not fall back to localhost", () => {
  assert.equal(loadReleaseEnv({}).bookingWebUrl, "");
});
