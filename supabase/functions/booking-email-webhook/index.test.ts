import assert from "node:assert/strict";
import { createHandler } from "./index.ts";
import { verifySignature } from "./signature.ts";

const secret = `whsec_${btoa("fixture-signing-key-32-bytes-long!")}`;
const now = 1_800_000_000;
async function request(payload: unknown, age = 0) {
  const body = JSON.stringify(payload);
  const timestamp = String(now - age);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("fixture-signing-key-32-bytes-long!"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(`msg_fixture.${timestamp}.${body}`),
        ),
      ),
    ),
  );
  return new Request("https://fixture.test", {
    method: "POST",
    body,
    headers: {
      "svix-id": "msg_fixture",
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
  });
}
const event = {
  type: "email.delivered",
  created_at: "2027-01-15T08:00:00Z",
  data: {
    email_id: "11111111-1111-4111-8111-111111111111",
    tags: { outbox_id: "22222222-2222-4222-8222-222222222222" },
    to: ["private@example.test"],
  },
};
function handler(fetcher: typeof fetch) {
  return createHandler({
    env: {
      get: (key) =>
        (
          ({
            RESEND_WEBHOOK_SECRET: secret,
            SUPABASE_URL: "https://fixture.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "fixture-key",
          }) as Record<string, string>
        )[key],
    },
    fetcher,
    now: () => now,
  });
}
Deno.test("official Svix vector verifies exact raw bytes", async () => {
  const body = '{"event_type":"ping","data":{"success":true}}';
  const headers = new Headers({
    "svix-id": "msg_loFOjxBNrRLzqYUf",
    "svix-timestamp": "1731705121",
    "svix-signature": "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=",
  });
  assert.equal(
    await verifySignature(
      body,
      headers,
      "whsec_plJ3nmyCDGBKInavdOK15jsl",
      1731705121,
    ),
    true,
  );
  assert.equal(
    await verifySignature(
      `${body} `,
      headers,
      "whsec_plJ3nmyCDGBKInavdOK15jsl",
      1731705121,
    ),
    false,
  );
});
Deno.test("invalid signatures and old/future timestamps never reach the database", async () => {
  let calls = 0;
  const run = handler(async () => {
    calls++;
    return Response.json("applied");
  });
  const invalid = await request(event);
  invalid.headers.set("svix-signature", "v1,invalid");
  for (const req of [
    invalid,
    await request(event, 301),
    await request(event, -301),
  ])
    assert.equal((await run(req)).status, 401);
  assert.equal(calls, 0);
});
Deno.test("persists only sanitized correlation; retries storage errors without exposing payload", async () => {
  let calls = 0;
  const run = handler(async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.p_outbox_id, event.data.tags.outbox_id);
    assert.ok(!JSON.stringify(body).includes("private@example.test"));
    return calls === 1
      ? new Response("private diagnostics", { status: 503 })
      : Response.json("duplicate");
  });
  const failed = await run(await request(event));
  assert.equal(failed.status, 503);
  assert.ok(!(await failed.text()).includes("private"));
  assert.equal((await run(await request(event))).status, 200);
});
Deno.test("ignores unsupported events and rejects malformed and oversized requests", async () => {
  let calls = 0;
  const run = handler(async () => {
    calls++;
    return Response.json("applied");
  });
  assert.equal(
    (await run(await request({ ...event, type: "email.opened" }))).status,
    200,
  );
  assert.equal(
    (await run(await request({ ...event, data: { email_id: "invalid" } })))
      .status,
    400,
  );
  assert.equal(
    (
      await run(
        new Request("https://fixture.test", {
          method: "POST",
          body: "a".repeat(65537),
        }),
      )
    ).status,
    413,
  );
  assert.equal(calls, 0);
});
