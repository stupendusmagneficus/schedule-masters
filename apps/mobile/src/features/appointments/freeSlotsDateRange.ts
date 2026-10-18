const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
function getDateRangeDayCount(startDate: string, endDate: string) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) return null;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (end < start) return null;
  return Math.floor((end - start) / DAY_IN_MILLISECONDS) + 1;
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
