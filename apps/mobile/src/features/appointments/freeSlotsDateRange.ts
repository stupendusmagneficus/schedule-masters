const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
export const MAX_FREE_SLOTS_SHARE_DAYS = 90;

export function getDateRangeDayCount(startDate: string, endDate: string) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (end < start) return null;
  return Math.floor((end - start) / DAY_IN_MILLISECONDS) + 1;
}

export function getMonthStartsInDateRange(
  startDate: string,
  endDate: string,
): string[] {
  if (getDateRangeDayCount(startDate, endDate) === null) return [];
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  const monthStarts: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    monthStarts.push(`${year}-${String(month).padStart(2, "0")}-01`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return monthStarts;
}

export function getDatesInDateRange(startDate: string, endDate: string) {
  const dayCount = getDateRangeDayCount(startDate, endDate);
  if (dayCount === null) return [];
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  return Array.from({ length: dayCount }, (_, index) => {
    return new Date(start + index * DAY_IN_MILLISECONDS)
      .toISOString()
      .slice(0, 10);
  });
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
