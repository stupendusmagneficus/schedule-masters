export const bookingIntervalOptions = [15, 30, 45, 60, 90] as const;

export type BookingIntervalMinutes = number;

export const defaultBookingIntervalMinutes: BookingIntervalMinutes = 30;

export function isBookingIntervalMinutes(
  value: number,
): value is BookingIntervalMinutes {
  return (
    Number.isInteger(value) && value >= 5 && value <= 420 && value % 5 === 0
  );
}
