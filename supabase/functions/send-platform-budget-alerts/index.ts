type Environment = { get(name: string): string | undefined };
type Alert = {
  readonly id: string;
  readonly provider: "openai_translation" | "resend_email";
  readonly period_type: "day" | "month";
  readonly period_start: string;
  readonly threshold: 80 | 100;
  readonly used_amount: number;
  readonly limit_amount: number;
};

function parseAlert(value: unknown): Alert | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const used =
    typeof item.used_amount === "number"
      ? item.used_amount
      : Number(item.used_amount);
  const limit =
    typeof item.limit_amount === "number"
      ? item.limit_amount
      : Number(item.limit_amount);
  if (
    typeof item.id !== "string" ||
    (item.provider !== "openai_translation" &&
      item.provider !== "resend_email") ||
    (item.period_type !== "day" && item.period_type !== "month") ||
    typeof item.period_start !== "string" ||
    (item.threshold !== 80 && item.threshold !== 100) ||
    !Number.isFinite(used) ||
    !Number.isFinite(limit) ||
    used < 0 ||
    limit <= 0
  ) {
    return null;
  }
  return {
    id: item.id,
    provider: item.provider,
    period_type: item.period_type,
    period_start: item.period_start,
    threshold: item.threshold,
    used_amount: used,
    limit_amount: limit,
  };
}

type Dependencies = { env: Environment; fetcher?: typeof fetch };

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

async function callRpc(
  fetcher: typeof fetch,
  supabaseUrl: string,
  serviceRoleKey: string,
  name: string,
  body: Record<string, unknown>,
) {
  return await fetcher(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    body: JSON.stringify(body),
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function alertSubject(alert: Alert): string {
  const provider =
    alert.provider === "openai_translation" ? "OpenAI" : "Resend";
  const period = alert.period_type === "day" ? "daily" : "monthly";
  return `Schedule Masters: ${provider} ${period} budget at ${alert.threshold}%`;
}

function alertText(alert: Alert): string {
  const provider =
    alert.provider === "openai_translation"
      ? "OpenAI translations"
      : "Resend email";
  const period = alert.period_type === "day" ? "day" : "month";
  const unit = alert.provider === "openai_translation" ? "USD" : "emails";
  const used = alert.used_amount.toFixed(
    alert.provider === "openai_translation" ? 4 : 0,
  );
  const limit = alert.limit_amount.toFixed(
    alert.provider === "openai_translation" ? 4 : 0,
  );
  return `${provider} usage reached ${alert.threshold}% of the ${period} limit for ${alert.period_start}: ${used} / ${limit} ${unit}.`;
}

export function createHandler({ env, fetcher = fetch }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST")
      return jsonResponse({ error: "method_not_allowed" }, 405);

    const supabaseUrl = env.get("SUPABASE_URL");
    const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey)
      return jsonResponse({ error: "worker_not_configured" }, 503);
    if (request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const enabled = env.get("PLATFORM_BUDGET_ALERTS_ENABLED") === "true";
    const recipient = env.get("PLATFORM_BUDGET_ALERT_EMAIL");
    const resendKey = env.get("RESEND_API_KEY");
    const from = env.get("BOOKING_EMAIL_FROM");
    if (!enabled || !recipient || !resendKey || !from) {
      return jsonResponse({ configured: false, processed: 0 });
    }

    const claimResponse = await callRpc(
      fetcher,
      supabaseUrl,
      serviceRoleKey,
      "claim_platform_integration_budget_alerts",
      { p_batch_size: 20 },
    );
    if (!claimResponse.ok)
      return jsonResponse({ error: "alert_claim_failed" }, 502);
    const rawAlerts: unknown = await claimResponse.json();
    if (!Array.isArray(rawAlerts))
      return jsonResponse({ error: "invalid_alert_response" }, 502);
    let sent = 0;
    let failed = 0;

    for (const rawAlert of rawAlerts) {
      const alert = parseAlert(rawAlert);
      if (!alert) {
        failed += 1;
        continue;
      }
      const text = alertText(alert);
      let delivered = false;
      try {
        const response = await fetcher("https://api.resend.com/emails", {
          body: JSON.stringify({
            from,
            subject: alertSubject(alert),
            text,
            to: [recipient],
          }),
          headers: {
            authorization: `Bearer ${resendKey}`,
            "content-type": "application/json",
            "idempotency-key": `platform-budget-alert-${alert.id}`,
          },
          method: "POST",
        });
        if (response.ok) {
          const providerResult = (await response.json()) as { id?: unknown };
          delivered = typeof providerResult.id === "string";
        }
      } catch {
        delivered = false;
      }

      const finishResponse = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "finish_platform_integration_budget_alert",
        { p_alert_id: alert.id, p_sent: delivered },
      );
      if (!finishResponse.ok) {
        failed += 1;
        continue;
      }
      if (delivered) sent += 1;
      else failed += 1;
    }

    return jsonResponse({ failed, processed: rawAlerts.length, sent });
  };
}

if (import.meta.main) {
  Deno.serve(createHandler({ env: Deno.env }));
}
