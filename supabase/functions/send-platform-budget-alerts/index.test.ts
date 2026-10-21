import assert from "node:assert/strict";
import { createHandler } from "./index.ts";

const serviceRoleKey = "service-role-test-key";
const baseEnvironment = {
  BOOKING_EMAIL_FROM: "Schedule Masters <ops@example.test>",
  PLATFORM_BUDGET_ALERTS_ENABLED: "true",
  PLATFORM_BUDGET_ALERT_EMAIL: "ops@example.test",
  RESEND_API_KEY: "resend-test-key",
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_URL: "https://supabase.example.test",
};

function environment(values: Record<string, string | undefined>) {
  return { get: (name: string) => values[name] };
}

function authorizedRequest() {
  return new Request("https://edge.example.test/send-platform-budget-alerts", {
    headers: { authorization: `Bearer ${serviceRoleKey}` },
    method: "POST",
  });
}

Deno.test("does not claim alert jobs unless the worker is fully configured", async () => {
  let calls = 0;
  const handler = createHandler({
    env: environment({
      ...baseEnvironment,
      PLATFORM_BUDGET_ALERTS_ENABLED: "false",
    }),
    fetcher: async () => {
      calls += 1;
      return Response.json([]);
    },
  });

  const response = await handler(authorizedRequest());

  assert.deepEqual(await response.json(), { configured: false, processed: 0 });
  assert.equal(calls, 0);
});

Deno.test("sends an idempotent alert and marks its outbox item sent", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const handler = createHandler({
    env: environment(baseEnvironment),
    fetcher: async (input, init) => {
      const url = String(input);
      calls.push({ init, url });
      if (url.includes("claim_platform_integration_budget_alerts")) {
        return Response.json([
          {
            id: "alert-1",
            limit_amount: "10.000000",
            period_start: "2030-01-01",
            period_type: "day",
            provider: "openai_translation",
            threshold: 80,
            used_amount: "8.000000",
          },
        ]);
      }
      if (url === "https://api.resend.com/emails") {
        return Response.json({ id: "provider-message-1" });
      }
      if (url.includes("finish_platform_integration_budget_alert")) {
        return Response.json(true);
      }
      return new Response("unexpected request", { status: 500 });
    },
  });

  const response = await handler(authorizedRequest());
  const email = calls.find(
    ({ url }) => url === "https://api.resend.com/emails",
  );

  assert.deepEqual(await response.json(), { failed: 0, processed: 1, sent: 1 });
  assert.equal(
    new Headers(email?.init?.headers).get("idempotency-key"),
    "platform-budget-alert-alert-1",
  );
  assert.deepEqual(JSON.parse(String(email?.init?.body)).to, [
    "ops@example.test",
  ]);
  const finish = calls.find(({ url }) =>
    url.includes("finish_platform_integration_budget_alert"),
  );
  assert.deepEqual(JSON.parse(String(finish?.init?.body)), {
    p_alert_id: "alert-1",
    p_sent: true,
  });
});

Deno.test("requires the service role bearer token", async () => {
  const handler = createHandler({ env: environment(baseEnvironment) });
  const response = await handler(
    new Request("https://edge.example.test/send-platform-budget-alerts", {
      method: "POST",
    }),
  );

  assert.equal(response.status, 401);
});
