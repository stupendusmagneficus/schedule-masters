export type PlatformBudgetReservation = {
  readonly allowed: boolean;
  readonly reason?: "not_configured" | "limit_reached";
  readonly reservationId?: string;
};

export function parseBudgetReservation(
  value: unknown,
): PlatformBudgetReservation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.allowed !== "boolean") return null;
  if (
    payload.reason !== undefined &&
    payload.reason !== "not_configured" &&
    payload.reason !== "limit_reached"
  ) {
    return null;
  }
  if (
    payload.allowed &&
    (typeof payload.reservationId !== "string" ||
      payload.reservationId.length === 0)
  ) {
    return null;
  }
  return {
    allowed: payload.allowed,
    reason: payload.reason as PlatformBudgetReservation["reason"],
    reservationId: payload.reservationId as string | undefined,
  };
}

export function calculateOpenAiCostUsd(
  value: unknown,
  inputUsdPerMillion: number | undefined,
  outputUsdPerMillion: number | undefined,
): number | null {
  if (
    !Number.isFinite(inputUsdPerMillion) ||
    !Number.isFinite(outputUsdPerMillion) ||
    inputUsdPerMillion === undefined ||
    outputUsdPerMillion === undefined ||
    inputUsdPerMillion < 0 ||
    outputUsdPerMillion < 0 ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const usage = (value as Record<string, unknown>).usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
  const { prompt_tokens: inputTokens, completion_tokens: outputTokens } =
    usage as Record<string, unknown>;
  if (
    typeof inputTokens !== "number" ||
    typeof outputTokens !== "number" ||
    !Number.isSafeInteger(inputTokens) ||
    !Number.isSafeInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    return null;
  }

  return Number(
    (
      (inputTokens * inputUsdPerMillion + outputTokens * outputUsdPerMillion) /
      1_000_000
    ).toFixed(6),
  );
}

export async function triggerPlatformBudgetAlerts(
  fetcher: typeof fetch,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  try {
    await fetcher(`${supabaseUrl}/functions/v1/send-platform-budget-alerts`, {
      body: "{}",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    });
  } catch {
    // The alert remains in its durable outbox and can be retried by the worker.
  }
}
