import type { BookingDecisionEmail } from "./emailContent.ts";
import { lifecycleCopy } from "./lifecycleCopy.ts";

export function validateBookingBaseUrl(
  value: string | undefined,
): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export type PreparedDelivery =
  | { readonly deliver: false }
  | { readonly deliver: true; readonly message: BookingDecisionEmail };
export function parsePreparedDelivery(
  value: unknown,
  bookingUrl: string,
): PreparedDelivery | null {
  if (!value || typeof value !== "object" || !("deliver" in value)) return null;
  if (value.deliver === false) return { deliver: false };
  const data = value as Record<string, unknown>;
  const decision = data.decision as BookingDecisionEmail["decision"];
  const locale = data.locale as BookingDecisionEmail["locale"];
  if (
    data.deliver !== true ||
    !Object.hasOwn(lifecycleCopy, locale) ||
    !(
      decision === "accepted" ||
      decision === "declined" ||
      Object.hasOwn(lifecycleCopy[locale].events, decision)
    )
  )
    return null;
  for (const field of [
    "recipient",
    "serviceName",
    "workspaceName",
    "startsAt",
    "timezone",
    "currency",
  ])
    if (typeof data[field] !== "string" || !data[field]) return null;
  if (
    !Number.isFinite(Date.parse(data.startsAt as string)) ||
    !Number.isInteger(data.durationMinutes) ||
    (data.durationMinutes as number) < 1 ||
    typeof data.priceAmount !== "number" ||
    !Number.isFinite(data.priceAmount) ||
    data.priceAmount < 0
  )
    return null;
  if (
    !Array.isArray(data.occurrenceStarts) ||
    data.occurrenceStarts.length < 1 ||
    data.occurrenceStarts.length > 24 ||
    data.occurrenceStarts.some(
      (item) => typeof item !== "string" || !Number.isFinite(Date.parse(item)),
    )
  )
    return null;
  let manageUrl: string | undefined;
  if (decision === "accepted" || decision === "customer_confirmed") {
    if (
      typeof data.manageToken !== "string" ||
      !/^[0-9a-f]{128}$/.test(data.manageToken)
    )
      return null;
    const url = new URL(bookingUrl);
    url.hash = new URLSearchParams({ token: data.manageToken }).toString();
    manageUrl = url.toString();
  } else if (data.manageToken != null) return null;
  try {
    new Intl.DateTimeFormat(locale === "cz" ? "cs" : locale, {
      timeZone: data.timezone as string,
    }).format();
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: data.currency as string,
    }).format(0);
  } catch {
    return null;
  }
  return {
    deliver: true,
    message: {
      decision,
      locale,
      recipient: data.recipient as string,
      serviceName: data.serviceName as string,
      workspaceName: data.workspaceName as string,
      startsAt: data.startsAt as string,
      timezone: data.timezone as string,
      currency: data.currency as string,
      durationMinutes: data.durationMinutes as number,
      priceAmount: data.priceAmount,
      customerName:
        typeof data.customerName === "string" ? data.customerName : undefined,
      occurrenceStarts: data.occurrenceStarts as string[],
      manageUrl,
    },
  };
}
