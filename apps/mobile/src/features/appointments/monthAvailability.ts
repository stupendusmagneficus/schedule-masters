import { addCalendarDays, getCalendarDateRange } from "../calendar/calendar";
import type { MonthAvailableSlot } from "./manualBooking";

export type MonthAvailabilityCalendar = {
  readonly dates: readonly string[];
  readonly slotsByDate: ReadonlyMap<string, readonly MonthAvailableSlot[]>;
};

export function buildMonthAvailabilityCalendar(
  selectedDate: string,
  slots: readonly MonthAvailableSlot[],
): MonthAvailabilityCalendar {
  const { fromDate, toDate } = getCalendarDateRange(selectedDate, "month");
  const firstWeekday = new Date(`${fromDate}T00:00:00.000Z`).getUTCDay() || 7;
  const lastWeekday = new Date(`${toDate}T00:00:00.000Z`).getUTCDay() || 7;
  const firstVisibleDate = addCalendarDays(fromDate, 1 - firstWeekday);
  const lastVisibleDate = addCalendarDays(toDate, 7 - lastWeekday);
  const dates: string[] = [];

  for (
    let date = firstVisibleDate;
    date <= lastVisibleDate;
    date = addCalendarDays(date, 1)
  ) {
    dates.push(date);
  }

  const slotsByDate = new Map<string, MonthAvailableSlot[]>();
  for (const slot of slots) {
    const dateSlots = slotsByDate.get(slot.available_date) ?? [];
    dateSlots.push(slot);
    slotsByDate.set(slot.available_date, dateSlots);
  }

  return { dates, slotsByDate };
}

export function getAvailableDates(
  slotsByDate: ReadonlyMap<string, readonly MonthAvailableSlot[]>,
): ReadonlySet<string> {
  return new Set(
    [...slotsByDate]
      .filter(([, dateSlots]) => dateSlots.length > 0)
      .map(([date]) => date),
  );
}
