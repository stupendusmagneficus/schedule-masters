export const bookingIntervalOptions = [15, 30, 60] as const;

export type BookingIntervalMinutes = (typeof bookingIntervalOptions)[number];

export const defaultBookingIntervalMinutes: BookingIntervalMinutes = 30;

export function isBookingIntervalMinutes(
  value: number,
): value is BookingIntervalMinutes {
  return bookingIntervalOptions.some((option) => option === value);
}
