export const LONG_ABSENCE_DAYS = 90;

export type CustomerSegment = "new" | "returning" | "long_absent";

export function getCustomerSegment(
  completedVisits: number,
  lastCompletedVisitAt: string | null,
  now = new Date(),
): CustomerSegment {
  if (completedVisits <= 1 || !lastCompletedVisitAt) return "new";
  const age = now.getTime() - new Date(lastCompletedVisitAt).getTime();
  return age > LONG_ABSENCE_DAYS * 24 * 60 * 60 * 1000
    ? "long_absent"
    : "returning";
}
