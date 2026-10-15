import type { MasterAppointment } from "../appointments/manualBooking";

type PaidAppointment = Pick<
  MasterAppointment,
  "currency" | "paid_amount" | "status"
>;

export function sumReceivedRevenueByCurrency(
  appointments: readonly PaidAppointment[],
): Readonly<Record<string, number>> {
  const centsByCurrency: Record<string, number> = {};

  for (const appointment of appointments) {
    if (appointment.status !== "completed") continue;

    const currency = appointment.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;

    centsByCurrency[currency] ??= 0;
    const paidAmount = Number(appointment.paid_amount);
    if (Number.isFinite(paidAmount)) {
      centsByCurrency[currency] += Math.round(paidAmount * 100);
    }
  }

  return Object.fromEntries(
    Object.entries(centsByCurrency)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currency, cents]) => [currency, cents / 100]),
  );
}
