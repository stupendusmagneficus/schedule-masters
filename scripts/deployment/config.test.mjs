import assert from "node:assert/strict";
import test from "node:test";
import { validateReleaseConfig } from "./config.mjs";

const pilot = {
  environment: "pilot",
  projectRef: "jakksxrebisudkecednm",
  mobileUrl: "https://jakksxrebisudkecednm.supabase.co",
  bookingUrl: "https://jakksxrebisudkecednm.supabase.co",
  mobileKey: "public-key",
  bookingKey: "public-key",
  demoMode: "false",
};

test("accepts aligned pilot clients without exposing keys", () => {
  const result = validateReleaseConfig(pilot);
  assert.equal(result.projectRef, pilot.projectRef);
  assert.equal(JSON.stringify(result).includes("public-key"), false);
});

test("rejects divergent client projects and missing keys", () => {
  assert.throws(
    () =>
      validateReleaseConfig({
        ...pilot,
        bookingUrl: "https://other.supabase.co",
      }),
    /same project/,
  );
  assert.throws(
    () => validateReleaseConfig({ ...pilot, mobileKey: "" }),
    /public keys/,
  );
});

test("rejects demo, invalid targets and non-HTTPS hosted URLs", () => {
  assert.throws(
    () => validateReleaseConfig({ ...pilot, demoMode: "true" }),
    /demo/,
  );
  assert.throws(
    () => validateReleaseConfig({ ...pilot, environment: "preview" }),
    /environment/,
  );
  assert.throws(
    () =>
      validateReleaseConfig({
        ...pilot,
        mobileUrl: pilot.mobileUrl.replace("https:", "http:"),
      }),
    /same project/,
  );
});

test("production cannot target the shared pilot project", () => {
  assert.throws(
    () => validateReleaseConfig({ ...pilot, environment: "production" }),
    /separate/,
  );
  const ref = "abcdefghijklmnopqrst";
  assert.equal(
    validateReleaseConfig({
      ...pilot,
      environment: "production",
      projectRef: ref,
      mobileUrl: `https://${ref}.supabase.co`,
      bookingUrl: `https://${ref}.supabase.co`,
    }).environment,
    "production",
  );
});

test("rejects server credentials accidentally used in a client", () => {
  assert.throws(
    () => validateReleaseConfig({ ...pilot, mobileKey: "sb_secret_wrong" }),
    /server/,
  );
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role" }),
  ).toString("base64url");
  assert.throws(
    () =>
      validateReleaseConfig({
        ...pilot,
        bookingKey: `header.${payload}.signature`,
      }),
    /server/,
  );
});
