import {
  parseBudgetReservation,
  triggerPlatformBudgetAlerts,
} from "../_shared/platformBudget.ts";
import {
  parsePreparedDelivery,
  validateBookingBaseUrl,
} from "./deliveryContract.ts";
import { createBookingDecisionEmail } from "./emailContent.ts";

type ClaimedEmail = { readonly attempts: number; readonly id: string };

type Environment = { get(name: string): string | undefined };

type Dependencies = {
  readonly env: Environment;
  readonly fetcher?: typeof fetch;
};

function getTestRecipientAllowlist(env: Environment): string[] | null {
  const configured = env.get("BOOKING_EMAIL_TEST_RECIPIENTS");
  if (configured === undefined) return null;

  const recipients = [
    ...new Set(
      configured
        .split(",")
        .map((recipient) => recipient.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (
    recipients.length === 0 ||
    recipients.some(
      (recipient) =>
        recipient.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient),
    )
  ) {
    throw new Error("invalid_test_recipient_allowlist");
  }
  return recipients;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

export function createHandler({ env, fetcher = fetch }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const supabaseUrl = env.get("SUPABASE_URL");
    const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "worker_not_configured" }, 503);
    }
    if (request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const emailApiKey = env.get("RESEND_API_KEY");
    const from = env.get("BOOKING_EMAIL_FROM");
    const replyTo = env.get("BOOKING_EMAIL_REPLY_TO")?.trim();
    if (
      replyTo !== undefined &&
      (replyTo.length > 254 ||
        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(replyTo))
    ) {
      return jsonResponse({ error: "invalid_reply_to" }, 503);
    }
    const enabled = env.get("BOOKING_EMAIL_DELIVERY_ENABLED") === "true";
    let testRecipientAllowlist: string[] | null;
    try {
      testRecipientAllowlist = getTestRecipientAllowlist(env);
    } catch {
      return jsonResponse({ error: "invalid_test_recipient_allowlist" }, 503);
    }
    if (!enabled || !emailApiKey || !from) {
      const response = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "mark_pending_booking_emails_not_configured",
        {},
      );
      if (!response.ok) {
        return jsonResponse({ error: "queue_update_failed" }, 502);
      }
      return jsonResponse({ configured: false, processed: 0 });
    }

    const bookingUrl = validateBookingBaseUrl(
      env.get("BOOKING_EMAIL_BOOKING_URL"),
    );
    if (!bookingUrl) return jsonResponse({ error: "invalid_booking_url" }, 503);

    const claimResponse = await callRpc(
      fetcher,
      supabaseUrl,
      serviceRoleKey,
      "claim_booking_decision_emails_for_delivery",
      {
        p_batch_size: 20,
        p_recipient_allowlist: testRecipientAllowlist,
      },
    );
    if (!claimResponse.ok) {
      return jsonResponse({ error: "queue_claim_failed" }, 502);
    }
    const jobs = (await claimResponse.json()) as ClaimedEmail[];
    let accepted = 0;
    let failed = 0;
    let retrying = 0;
    let budgetDeferred = false;
    let superseded = 0;

    for (const [jobIndex, job] of jobs.entries()) {
      const reservationResponse = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "reserve_platform_integration_usage",
        { p_amount: 1, p_provider: "resend_email" },
      );
      let reservation: ReturnType<typeof parseBudgetReservation> = null;
      if (reservationResponse.ok) {
        try {
          reservation = parseBudgetReservation(
            await reservationResponse.json(),
          );
        } catch {
          reservation = null;
        }
      }
      if (!reservation?.allowed || !reservation.reservationId) {
        for (const deferredJob of jobs.slice(jobIndex)) {
          const deferResponse = await callRpc(
            fetcher,
            supabaseUrl,
            serviceRoleKey,
            "defer_booking_decision_email_for_budget",
            { p_id: deferredJob.id },
          );
          if (!deferResponse.ok) failed += 1;
        }
        budgetDeferred = true;
        break;
      }

      const prepareResponse = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "prepare_booking_email_delivery",
        { p_id: job.id, p_attempt: job.attempts ?? 1 },
      );
      let prepared: ReturnType<typeof parsePreparedDelivery> = null;
      if (prepareResponse.ok) {
        try {
          prepared = parsePreparedDelivery(
            await prepareResponse.json(),
            bookingUrl,
          );
        } catch {
          prepared = null;
        }
      }
      if (!prepared?.deliver) {
        await callRpc(
          fetcher,
          supabaseUrl,
          serviceRoleKey,
          "settle_platform_integration_usage",
          { p_actual_amount: 0, p_reservation_id: reservation.reservationId },
        );
        if (prepared && !prepared.deliver) superseded++;
        else {
          const finish = await callRpc(
            fetcher,
            supabaseUrl,
            serviceRoleKey,
            "finish_booking_decision_email",
            {
              p_id: job.id,
              p_success: false,
              p_retryable: true,
              p_error: "invalid_response",
            },
          );
          if (finish.ok) retrying++;
          else failed++;
        }
        continue;
      }
      const message = createBookingDecisionEmail({
        ...prepared.message,
        supportEmail: replyTo,
      });

      let success = false;
      let retryable = false;
      let errorCode: string | null = null;
      try {
        const providerResponse = await fetcher(
          "https://api.resend.com/emails",
          {
            body: JSON.stringify({
              from,
              ...(replyTo ? { reply_to: replyTo } : {}),
              html: message.html,
              subject: message.subject,
              to: [prepared.message.recipient],
              text: message.text,
            }),
            headers: {
              authorization: `Bearer ${emailApiKey}`,
              "content-type": "application/json",
              "idempotency-key": `booking-decision-${job.id}`,
            },
            method: "POST",
          },
        );
        if (providerResponse.ok) {
          const providerResult = (await providerResponse.json()) as {
            readonly id?: unknown;
          };
          success = typeof providerResult.id === "string";
          if (!success) {
            retryable = true;
            errorCode = "invalid_response";
          }
        } else {
          retryable =
            providerResponse.status === 429 || providerResponse.status >= 500;
          errorCode = retryable ? "provider_unavailable" : "provider_rejected";
        }
      } catch {
        retryable = true;
        errorCode = "provider_unavailable";
      }

      const settlement = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "settle_platform_integration_usage",
        { p_actual_amount: 1, p_reservation_id: reservation.reservationId },
      );
      if (settlement.ok) {
        try {
          const result = (await settlement.json()) as {
            alertsPending?: unknown;
          };
          if (result.alertsPending === true) {
            await triggerPlatformBudgetAlerts(
              fetcher,
              supabaseUrl,
              serviceRoleKey,
            );
          }
        } catch {
          // The reservation continues to count against the budget if settlement parsing fails.
        }
      }

      const finishResponse = await callRpc(
        fetcher,
        supabaseUrl,
        serviceRoleKey,
        "finish_booking_decision_email",
        {
          p_error: errorCode,
          p_id: job.id,
          p_retryable: retryable,
          p_success: success,
        },
      );
      if (!finishResponse.ok) {
        failed += 1;
        continue;
      }
      const status = await finishResponse.text();
      if (status.includes("accepted_by_provider")) accepted += 1;
      else if (status.includes("pending")) retrying += 1;
      else failed += 1;
    }

    return jsonResponse({
      accepted,
      budgetDeferred,
      failed,
      processed: jobs.length,
      retrying,
      superseded,
    });
  };
}

async function callRpc(
  fetcher: typeof fetch,
  supabaseUrl: string,
  serviceRoleKey: string,
  name: string,
  body: Record<string, unknown>,
) {
  try {
    return await fetcher(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      body: JSON.stringify(body),
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

if (import.meta.main) {
  Deno.serve(createHandler({ env: Deno.env }));
}
