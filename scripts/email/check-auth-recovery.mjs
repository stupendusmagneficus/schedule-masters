import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { setTimeout } from "node:timers/promises";
import { completeAuthCallback } from "../../apps/mobile/src/features/auth/authRedirect.ts";
import { emailLocales } from "../../supabase/functions/_shared/confirmationEmail.ts";
import { createRecoveryEmail } from "../../supabase/functions/_shared/recoveryEmail.ts";

const { createClient } = createRequire(
  new URL("../../apps/mobile/package.json", import.meta.url),
)("@supabase/supabase-js");
const authUrl = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const captureUrl = process.env.AUTH_EMAIL_CAPTURE_URL;
assert.ok(
  authUrl && publicKey && serviceKey && captureUrl,
  "Local Auth configuration required",
);
for (const value of [authUrl, captureUrl]) {
  const url = new URL(value);
  assert.ok(
    url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname),
    "Recovery checks only run against local capture",
  );
}
const admin = createClient(authUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const callbacks = [
  "http://localhost:8081/auth/callback",
  "schedulemasters://auth/callback",
];

// Never print Auth responses, URLs, passwords, sessions or captured bodies.
for (const locale of emailLocales) {
  for (const redirectTo of callbacks) {
    const email = `sch143-${randomUUID()}@example.test`;
    const initialPassword = `Initial-${randomUUID()}!`;
    let userId;
    const messageIds = [];
    const memory = new Map();
    const client = createClient(authUrl, publicKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        autoRefreshToken: false,
        storage: {
          getItem: (key) => memory.get(key) ?? null,
          setItem: (key, value) => {
            memory.set(key, value);
          },
          removeItem: (key) => {
            memory.delete(key);
          },
        },
      },
    });
    async function capture(kind) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const found = await fetch(
          `${captureUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        assert.ok(found.ok, "Local mail search failed");
        const messages = (await found.json()).messages ?? [];
        for (const match of messages) {
          if (messageIds.includes(match.ID)) continue;
          const response = await fetch(
            `${captureUrl}/api/v1/message/${match.ID}`,
            { signal: AbortSignal.timeout(5000) },
          );
          assert.ok(response.ok, "Local mail lookup failed");
          const message = await response.json();
          const raw = message.HTML.match(
            /href="([^"]*\/auth\/v1\/verify\?[^"]*)"/,
          )?.[1];
          assert.ok(raw, "Auth action link missing");
          const link = new URL(raw.replaceAll("&amp;", "&"));
          if (link.searchParams.get("type") !== kind) continue;
          messageIds.push(match.ID);
          return { message, link };
        }
        await setTimeout(100);
      }
      throw new Error("Local Auth email was not captured");
    }
    async function follow(link) {
      const response = await fetch(link, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, 303, "Auth verify redirect failed");
      const location = response.headers.get("location");
      assert.ok(location, "Auth callback location missing");
      const callback = new URL(location);
      const expected = new URL(redirectTo);
      assert.equal(callback.host, expected.host);
      assert.equal(callback.pathname, expected.pathname);
      assert.ok(callback.searchParams.get("code"), "Auth code missing");
      return location;
    }
    try {
      const created = await admin.auth.admin.createUser({
        email,
        password: initialPassword,
        email_confirm: false,
        user_metadata: { locale },
      });
      assert.ok(
        !created.error && created.data.user,
        "Could not create local test account",
      );
      userId = created.data.user.id;
      const resend = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });
      assert.ok(!resend.error, "Confirmation resend failed");
      const confirmation = await capture("signup");
      const confirmedUrl = await follow(confirmation.link);
      assert.equal(
        await completeAuthCallback(client, confirmedUrl, redirectTo),
        "completed",
      );
      assert.ok(
        !(await client.auth.signOut()).error,
        "Confirmation sign-out failed",
      );
      assert.ok(
        !(await client.auth.resetPasswordForEmail(email, { redirectTo })).error,
        "Recovery request failed",
      );
      const { link, message } = await capture("recovery");
      const expected = createRecoveryEmail(
        locale,
        "https://example.test/reset",
      );
      assert.equal(message.Subject, expected.subject);
      assert.ok(
        message.HTML.includes(expected.preheader) &&
          !message.HTML.includes("{{"),
        "Recovery template rendering failed",
      );
      assert.ok(
        message.Text?.trim(),
        "Recovery plain-text alternative missing",
      );
      const callback = await follow(link);
      const stranger = createClient(authUrl, publicKey, {
        auth: {
          flowType: "pkce",
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      assert.equal(
        await completeAuthCallback(stranger, callback, redirectTo),
        "failed",
        "Another device must not borrow a verifier",
      );
      assert.equal(
        await completeAuthCallback(client, callback, redirectTo),
        "recovery",
      );
      assert.equal(
        await completeAuthCallback(client, callback, redirectTo),
        "failed",
        "Reused code must fail",
      );
      const password = `Recovered-${randomUUID()}!`;
      assert.ok(
        !(await client.auth.updateUser({ password })).error,
        "Recovered password update failed",
      );
      assert.ok(
        !(await client.auth.refreshSession()).error,
        "Session refresh failed",
      );
      assert.ok(
        !(await client.auth.signOut()).error,
        "Recovery sign-out failed",
      );
      assert.equal((await client.auth.getSession()).data.session, null);
      assert.ok(
        (
          await client.auth.signInWithPassword({
            email,
            password: initialPassword,
          })
        ).error,
        "Old password must stop working",
      );
      assert.ok(
        !(await client.auth.signInWithPassword({ email, password })).error,
        "Sign-in with recovered password failed",
      );
      await client.auth.signOut();
      const unknown = await client.auth.resetPasswordForEmail(
        `missing-${randomUUID()}@example.test`,
        { redirectTo },
      );
      assert.ok(
        !unknown.error,
        "Unknown-email recovery must remain non-enumerating",
      );
      console.log(
        `Auth recovery: ${locale} ${redirectTo.startsWith("http") ? "web" : "native scheme"} passed`,
      );
    } finally {
      if (userId)
        assert.ok(
          !(await admin.auth.admin.deleteUser(userId)).error,
          "Test account cleanup failed",
        );
      if (messageIds.length) {
        const deleted = await fetch(`${captureUrl}/api/v1/messages`, {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ IDs: messageIds }),
          signal: AbortSignal.timeout(5000),
        });
        assert.ok(deleted.ok, "Captured mail cleanup failed");
      }
    }
  }
}
