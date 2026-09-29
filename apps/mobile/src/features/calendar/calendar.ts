import { formatDateInTimeZone } from "../availability/personalBlocks";

export const calendarViews = ["day", "week", "month", "feed"] as const;

export type CalendarView = (typeof calendarViews)[number];

export type CalendarDateRange = {
  readonly fromDate: string;
  readonly toDate: string;
};

export function getCalendarDateRange(
  selectedDate: string,
  view: CalendarView,
): CalendarDateRange {
  const date = parseCalendarDate(selectedDate);

  if (view === "day") {
    return { fromDate: selectedDate, toDate: selectedDate };
  }

  if (view === "week") {
    const weekday = date.getUTCDay() || 7;
    const fromDate = addCalendarDays(selectedDate, 1 - weekday);
    return { fromDate, toDate: addCalendarDays(fromDate, 6) };
  }

  if (view === "month") {
    const fromDate = toCalendarDate(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    );
    const toDate = toCalendarDate(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
    );
    return { fromDate, toDate };
  }

  return { fromDate: selectedDate, toDate: addCalendarDays(selectedDate, 89) };
}

export function moveCalendarDate(
  selectedDate: string,
  view: CalendarView,
  direction: -1 | 1,
): string {
  if (view === "day") return addCalendarDays(selectedDate, direction);
  if (view === "week") return addCalendarDays(selectedDate, direction * 7);
  if (view === "feed") return addCalendarDays(selectedDate, direction * 30);

  const date = parseCalendarDate(selectedDate);
  return toCalendarDate(
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1),
    ),
  );
}

export function getTodayCalendarDate(
  timezone: string,
  now = new Date(),
): string {
  return formatDateInTimeZone(now, timezone);
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toCalendarDate(date);
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    return toCalendarDate(parseCalendarDate(value)) === value;
  } catch {
    return false;
  }
}

function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid calendar date");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toCalendarDate(date) !== value) {
    throw new Error("Invalid calendar date");
  }
  return date;
}

function toCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
