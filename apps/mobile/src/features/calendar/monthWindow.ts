import { isCalendarDate } from "./calendar";

export const MONTH_WINDOW_SIZE = 11;
export const MONTH_WINDOW_PAGE_SIZE = 2;

export function getCalendarMonth(date: string): string {
  if (!isCalendarDate(date)) throw new Error("Invalid calendar date");
  return date.slice(0, 7);
}

export function shouldResetCalendarMonthWindow(
  months: readonly string[],
  selectedMonth: string,
): boolean {
  return !months.includes(selectedMonth);
}

export function shiftCalendarMonth(month: string, offset: number): string {
  if (!/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(offset)) {
    throw new Error("Invalid calendar month");
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return shifted.toISOString().slice(0, 7);
}

export function createInitialMonthWindow(selectedDate: string): string[] {
  const currentMonth = getCalendarMonth(selectedDate);
  return Array.from({ length: 3 }, (_, index) =>
    shiftCalendarMonth(currentMonth, index - 1),
  );
}

export function prependCalendarMonths(months: readonly string[]): string[] {
  const firstMonth = months[0];
  if (!firstMonth) return [];
  const previousMonths = Array.from(
    { length: MONTH_WINDOW_PAGE_SIZE },
    (_, index) =>
      shiftCalendarMonth(firstMonth, index - MONTH_WINDOW_PAGE_SIZE),
  );
  return [...previousMonths, ...months].slice(0, MONTH_WINDOW_SIZE);
}

export function appendCalendarMonths(months: readonly string[]): string[] {
  const lastMonth = months.at(-1);
  if (!lastMonth) return [];
  const nextMonths = Array.from(
    { length: MONTH_WINDOW_PAGE_SIZE },
    (_, index) => shiftCalendarMonth(lastMonth, index + 1),
  );
  return [...months, ...nextMonths].slice(-MONTH_WINDOW_SIZE);
}

export function isMonthRequestCurrent(
  requestGeneration: number,
  activeGeneration: number,
  activeMonths: readonly string[],
  month: string,
): boolean {
  return requestGeneration === activeGeneration && activeMonths.includes(month);
}
