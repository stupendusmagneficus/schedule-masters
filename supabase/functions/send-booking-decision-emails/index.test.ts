import assert from "node:assert/strict";
import { createHandler } from "./index.ts";

const baseEnvironment = {
  BOOKING_EMAIL_DELIVERY_ENABLED: "true",
  BOOKING_EMAIL_FROM: "Schedule Masters <booking@example.test>",
  RESEND_API_KEY: "test-resend-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  SUPABASE_URL: "https://supabase.example.test",
};

function environment(values: Record<string, string | undefined>) {
  return { get: (name: string) => values[name] };
}

function authorizedRequest() {
  return new Request("https://edge.example.test/send-booking-decision-emails", {
    headers: { authorization: "Bearer test-service-role-key" },
    method: "POST",
  });
}

Deno.test("refuses calls without the service role bearer token", async () => {
  const handler = createHandler({ env: environment(baseEnvironment) });
  const response = await handler(
    new Request("https://edge.example.test/send-booking-decision-emails", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});

Deno.test("keeps jobs marked not configured until provider setup is enabled", async () => {
  const calls: string[] = [];
  const handler = createHandler({
    env: environment({
      ...baseEnvironment,
      BOOKING_EMAIL_DELIVERY_ENABLED: "false",
    }),
    fetcher: async (input) => {
      calls.push(String(input));
      return new Response("0", { status: 200 });
    },
  });

  const response = await handler(authorizedRequest());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: false, processed: 0 });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /mark_pending_booking_emails_not_configured/);
});

Deno.test("sends through the provider with a stable idempotency key", async () => {
  const calls: { readonly url: string; readonly init?: RequestInit }[] = [];
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      calls.push({ init, url });
      if (url.includes("claim_booking_decision_emails")) {
        return Response.json([
          {
            decision: "accepted",
            id: "outbox-job-1",
            locale: "en",
            recipient: "client@example.test",
            service_name: "Manicure",
            starts_at: "2030-01-03T09:00:00.000Z",
            timezone: "Europe/Prague",
            workspace_name: "Test Studio",
          },
        ]);
      }
      if (url === "https://api.resend.com/emails") {
        return Response.json({ id: "provider-message-1" });
      }
      if (url.includes("finish_booking_decision_email")) {
        return new Response('"accepted_by_provider"');
      }
      return new Response("unexpected", { status: 500 });
    },
  });

  const response = await handler(authorizedRequest());
  const providerCall = calls.find(
    ({ url }) => url === "https://api.resend.com/emails",
  );

  assert.deepEqual(await response.json(), {
    accepted: 1,
    failed: 0,
    processed: 1,
    retrying: 0,
  });
  assert.equal(
    new Headers(providerCall?.init?.headers).get("idempotency-key"),
    "booking-decision-outbox-job-1",
  );
  assert.equal(calls.length, 3);
});

Deno.test("retries transient provider errors and records only a safe error code", async () => {
  let finishBody: Record<string, unknown> | null = null;
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      if (url.includes("claim_booking_decision_emails")) {
        return Response.json([
          {
            decision: "declined",
            id: "outbox-job-2",
            locale: "ru",
            recipient: "client@example.test",
            service_name: "Manicure",
            starts_at: "2030-01-03T09:00:00.000Z",
            timezone: "Europe/Prague",
            workspace_name: "Test Studio",
          },
        ]);
      }
      if (url === "https://api.resend.com/emails") {
        return new Response("provider internal detail", { status: 503 });
      }
      if (url.includes("finish_booking_decision_email")) {
        finishBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response('"pending"');
      }
      return new Response("unexpected", { status: 500 });
    },
  });

  const response = await handler(authorizedRequest());

  assert.deepEqual(await response.json(), {
    accepted: 0,
    failed: 0,
    processed: 1,
    retrying: 1,
  });
  assert.deepEqual(finishBody, {
    p_error: "provider_unavailable",
    p_id: "outbox-job-2",
    p_retryable: true,
    p_success: false,
  });
});

Deno.test("does not retry permanent provider errors", async () => {
  let finishBody: Record<string, unknown> | null = null;
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      if (url.includes("claim_booking_decision_emails")) {
        return Response.json([
          {
            decision: "accepted",
            id: "outbox-job-3",
            locale: "en",
            recipient: "client@example.test",
            service_name: "Manicure",
            starts_at: "2030-01-03T09:00:00.000Z",
            timezone: "Europe/Prague",
            workspace_name: "Test Studio",
          },
        ]);
      }
      if (url === "https://api.resend.com/emails") {
        return new Response("provider response with private data", {
          status: 400,
        });
      }
      if (url.includes("finish_booking_decision_email")) {
        finishBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response('"failed"');
      }
      return new Response("unexpected", { status: 500 });
    },
  });

  const response = await handler(authorizedRequest());

  assert.deepEqual(await response.json(), {
    accepted: 0,
    failed: 1,
    processed: 1,
    retrying: 0,
  });
  assert.deepEqual(finishBody, {
    p_error: "provider_rejected",
    p_id: "outbox-job-3",
    p_retryable: false,
    p_success: false,
  });
});
