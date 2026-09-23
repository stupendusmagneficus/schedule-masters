export const bookingStatuses = [
  "pending",
  "confirmed",
  "cancelled_by_customer",
  "cancelled_by_master",
  "completed",
  "no_show",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export const bookingEventTypes = [
  "created",
  "confirmed",
  "rescheduled",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type BookingEventType = (typeof bookingEventTypes)[number];

const allowedTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled_by_master"],
  confirmed: ["cancelled_by_master", "completed", "no_show"],
  cancelled_by_customer: [],
  cancelled_by_master: [],
  completed: [],
  no_show: [],
};

export function canTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return from === to || allowedTransitions[from].includes(to);
}
