export function parseAppointmentPayment(
  value: string,
  maximum: number,
): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > maximum) return null;
  return amount;
}
