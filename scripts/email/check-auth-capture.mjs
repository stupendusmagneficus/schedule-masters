import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import {
  createConfirmationEmail,
  emailLocales,
} from "../../supabase/functions/_shared/confirmationEmail.ts";

const authUrl = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const captureUrl = process.env.AUTH_EMAIL_CAPTURE_URL;
const isLoopback = (value) => {
  const url = new URL(value);
  return (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  );
};
assert.ok(
  authUrl && captureUrl && publicKey && serviceKey,
  "Local Auth/capture configuration is required",
);
assert.ok(
  isLoopback(authUrl) && isLoopback(captureUrl),
  "Auth email smoke tests only run against local mail capture",
);

// Never print response bodies: the captured email contains a confirmation token.
for (const locale of [...emailLocales, undefined, 42]) {
  const mailbox = `sch144-${randomUUID()}`;
  let userId;
  let messageId;
  try {
    const signup = await fetch(`${authUrl}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: publicKey, "content-type": "application/json" },
      body: JSON.stringify({
        email: `${mailbox}@example.test`,
        password: `Test-${randomUUID()}!`,
        data: locale === undefined ? {} : { locale },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(signup.status, 200, `Local signup returned ${signup.status}`);
    const result = await signup.json();
    userId = result.user?.id ?? result.id;
    assert.equal(
      typeof userId,
      "string",
      "Local signup must return a test user",
    );
    assert.ok(
      !result.access_token,
      "Local Auth must require email confirmation",
    );
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(
        `${captureUrl}/api/v1/search?query=${encodeURIComponent(`to:${mailbox}@example.test`)}`,
        {
          signal: AbortSignal.timeout(5_000),
        },
      );
      assert.ok(response.ok, "Local Mailpit search failed");
      const matches = await response.json();
      messageId = matches.messages?.[0]?.ID;
      if (messageId) break;
      await setTimeout(100);
    }
    assert.equal(
      typeof messageId,
      "string",
      "Auth email was not captured locally",
    );
    const response = await fetch(`${captureUrl}/api/v1/message/${messageId}`, {
      signal: AbortSignal.timeout(5_000),
    });
    assert.ok(response.ok, "Local Mailpit message lookup failed");
    const message = await response.json();
    const expected = createConfirmationEmail(
      locale,
      "https://example.test/confirm",
    );
    const language = emailLocales.includes(locale)
      ? locale === "cz"
        ? "cs"
        : locale
      : "en";
    assert.equal(message.Subject, expected.subject);
    assert.ok(
      message.HTML.includes(`<html lang="${language}">`),
      "Auth email HTML language mismatch",
    );
    assert.ok(
      message.HTML.includes(expected.preheader),
      "Auth email preheader mismatch",
    );
    assert.ok(
      message.HTML.includes("/auth/v1/verify?"),
      "Auth email confirmation link is missing",
    );
    assert.ok(
      !message.HTML.includes("{{"),
      "Auth email contains unrendered Go directives",
    );
    assert.ok(
      message.Text?.trim(),
      "Auth email must have a plain-text alternative",
    );
    console.log(`Auth capture: ${String(locale ?? "missing locale")} passed`);
  } finally {
    if (userId) {
      const deleted = await fetch(`${authUrl}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      assert.ok(deleted.ok, "Test Auth user cleanup failed");
    }
    if (messageId) {
      const deleted = await fetch(`${captureUrl}/api/v1/messages`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ IDs: [messageId] }),
        signal: AbortSignal.timeout(5_000),
      });
      assert.ok(deleted.ok, "Test email cleanup failed");
    }
  }
}
