import assert from "node:assert/strict";
import { createHandler } from "./index.ts";

const baseEnvironment = {
  BOOKING_EMAIL_BOOKING_URL: "https://book.example.test/",
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
    env: environment({
      ...baseEnvironment,
      BOOKING_EMAIL_TEST_RECIPIENTS: " Owner@Example.Test, owner@example.test ",
      BOOKING_EMAIL_REPLY_TO: "support@example.test",
    }),
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
      if (url.includes("prepare_booking_email_delivery"))
        return Response.json(preparedJob());
      if (url.includes("reserve_platform_integration_usage")) {
        return Response.json({ allowed: true, reservationId: "budget-1" });
      }
      if (url === "https://api.resend.com/emails") {
        return Response.json({ id: "provider-message-1" });
      }
      if (url.includes("settle_platform_integration_usage")) {
        return Response.json({ alertsPending: false });
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
    budgetDeferred: false,
    failed: 0,
    processed: 1,
    retrying: 0,
    superseded: 0,
  });
  assert.equal(
    new Headers(providerCall?.init?.headers).get("idempotency-key"),
    "booking-decision-outbox-job-1",
  );
  const claimCall = calls.find(({ url }) =>
    url.includes("claim_booking_decision_emails"),
  );
  assert.deepEqual(JSON.parse(String(claimCall?.init?.body)), {
    p_batch_size: 20,
    p_recipient_allowlist: ["owner@example.test"],
  });
  assert.equal(calls.length, 6);
  const providerBody = JSON.parse(String(providerCall?.init?.body));
  assert.equal(providerBody.reply_to, "support@example.test");
  assert.match(providerBody.html, /mailto:support@example.test/);
  assert.match(providerBody.text, /support@example.test/);
});

Deno.test("rejects malformed reply-to before claiming or sending emails", async () => {
  let calls = 0;
  const handler = createHandler({
    env: environment({
      ...baseEnvironment,
      BOOKING_EMAIL_REPLY_TO: "support@example.test\r\nBcc: other@example.test",
    }),
    fetcher: async () => {
      calls += 1;
      return Response.json([]);
    },
  });
  const response = await handler(authorizedRequest());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "invalid_reply_to" });
  assert.equal(calls, 0);
});

Deno.test("defers queued emails without provider calls when the global cap is reached", async () => {
  const calls: string[] = [];
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("claim_booking_decision_emails")) {
        return Response.json([
          {
            decision: "accepted",
            id: "outbox-job-budget",
            locale: "en",
            recipient: "client@example.test",
            service_name: "Manicure",
            starts_at: "2030-01-03T09:00:00.000Z",
            timezone: "Europe/Prague",
            workspace_name: "Test Studio",
          },
        ]);
      }
      if (url.includes("prepare_booking_email_delivery"))
        return Response.json(preparedJob());
      if (url.includes("reserve_platform_integration_usage")) {
        return Response.json({ allowed: false, reason: "limit_reached" });
      }
      if (url.includes("defer_booking_decision_email_for_budget")) {
        return Response.json(true);
      }
      return new Response("unexpected request", { status: 500 });
    },
  });

  const response = await handler(authorizedRequest());

  assert.deepEqual(await response.json(), {
    accepted: 0,
    budgetDeferred: true,
    failed: 0,
    processed: 1,
    retrying: 0,
    superseded: 0,
  });
  assert.equal(
    calls.some((url) => url === "https://api.resend.com/emails"),
    false,
  );
  assert.equal(
    calls.some((url) =>
      url.includes("defer_booking_decision_email_for_budget"),
    ),
    true,
  );
});

Deno.test("rejects an invalid smoke-test allowlist without claiming jobs", async () => {
  const calls: string[] = [];
  const handler = createHandler({
    env: environment({
      ...baseEnvironment,
      BOOKING_EMAIL_TEST_RECIPIENTS: "",
    }),
    fetcher: async (input) => {
      calls.push(String(input));
      return Response.json([]);
    },
  });

  const response = await handler(authorizedRequest());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "invalid_test_recipient_allowlist",
  });
  assert.equal(calls.length, 0);
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
      if (url.includes("prepare_booking_email_delivery"))
        return Response.json(preparedJob());
      if (url.includes("reserve_platform_integration_usage")) {
        return Response.json({ allowed: true, reservationId: "budget-2" });
      }
      if (url === "https://api.resend.com/emails") {
        return new Response("provider internal detail", { status: 503 });
      }
      if (url.includes("settle_platform_integration_usage")) {
        return Response.json({ alertsPending: false });
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
    budgetDeferred: false,
    failed: 0,
    processed: 1,
    retrying: 1,
    superseded: 0,
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
      if (url.includes("prepare_booking_email_delivery"))
        return Response.json(preparedJob());
      if (url.includes("reserve_platform_integration_usage")) {
        return Response.json({ allowed: true, reservationId: "budget-3" });
      }
      if (url === "https://api.resend.com/emails") {
        return new Response("provider response with private data", {
          status: 400,
        });
      }
      if (url.includes("settle_platform_integration_usage")) {
        return Response.json({ alertsPending: false });
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
    budgetDeferred: false,
    failed: 1,
    processed: 1,
    retrying: 0,
    superseded: 0,
  });
  assert.deepEqual(finishBody, {
    p_error: "provider_rejected",
    p_id: "outbox-job-3",
    p_retryable: false,
    p_success: false,
  });
});

function preparedJob() {
  return {
    deliver: true,
    decision: "accepted",
    locale: "en",
    recipient: "client@example.test",
    serviceName: "Manicure",
    workspaceName: "Test Studio",
    startsAt: "2030-01-03T09:00:00.000Z",
    timezone: "Europe/Prague",
    durationMinutes: 60,
    priceAmount: 500,
    currency: "CZK",
    occurrenceStarts: ["2030-01-03T09:00:00.000Z"],
    manageToken: "a".repeat(128),
  };
}
Deno.test("rechecks a claimed event before sending and releases its budget if superseded", async () => {
  let sent = false;
  let settlement: unknown;
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      if (url.includes("claim_booking_decision_emails"))
        return Response.json([{ id: "old-confirmation", attempts: 2 }]);
      if (url.includes("reserve_platform_integration_usage"))
        return Response.json({ allowed: true, reservationId: "reserved" });
      if (url.includes("prepare_booking_email_delivery")) {
        assert.deepEqual(JSON.parse(String(init?.body)), {
          p_id: "old-confirmation",
          p_attempt: 2,
        });
        return Response.json({ deliver: false });
      }
      if (url.includes("settle_platform_integration_usage")) {
        settlement = JSON.parse(String(init?.body));
        return Response.json({ alertsPending: false });
      }
      sent = true;
      return new Response("unexpected", { status: 500 });
    },
  });
  const response = await handler(authorizedRequest());
  assert.equal(sent, false);
  assert.deepEqual(settlement, {
    p_actual_amount: 0,
    p_reservation_id: "reserved",
  });
  assert.deepEqual(await response.json(), {
    accepted: 0,
    budgetDeferred: false,
    failed: 0,
    processed: 1,
    retrying: 0,
    superseded: 1,
  });
});
Deno.test("rejects a booking URL with a demo query before claiming", async () => {
  let calls = 0;
  const response = await createHandler({
    env: environment({
      ...baseEnvironment,
      BOOKING_EMAIL_BOOKING_URL: "https://book.example.test/?demo=1",
    }),
    fetcher: async () => {
      calls++;
      return Response.json([]);
    },
  })(authorizedRequest());
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
});

Deno.test("fails closed on malformed prepared payload and never sends its private contents", async () => {
  let providerCalled = false;
  let finished: unknown;
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      if (url.includes("claim_booking_decision_emails"))
        return Response.json([{ id: "invalid-ready", attempts: 1 }]);
      if (url.includes("reserve_platform_integration_usage"))
        return Response.json({
          allowed: true,
          reservationId: "budget-invalid",
        });
      if (url.includes("prepare_booking_email_delivery"))
        return Response.json({
          ...preparedJob(),
          locale: "unsupported",
          manageToken: "private-diagnostic-do-not-log",
        });
      if (url.includes("settle_platform_integration_usage"))
        return Response.json({ alertsPending: false });
      if (url.includes("finish_booking_decision_email")) {
        finished = JSON.parse(String(init?.body));
        return new Response('"pending"');
      }
      providerCalled = true;
      return new Response("unexpected", { status: 500 });
    },
  });
  const result = await handler(authorizedRequest());
  assert.equal(providerCalled, false);
  assert.ok(!(await result.text()).includes("private-diagnostic"));
  assert.deepEqual(finished, {
    p_id: "invalid-ready",
    p_success: false,
    p_retryable: true,
    p_error: "invalid_response",
  });
});
