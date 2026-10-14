import { getIntlLocale, type SupportedLocale } from "@schedule-app/i18n";

export function moveCalendarMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
}

export function getCalendarDays(date: Date, locale: SupportedLocale): Date[] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const weekStart = locale === "en" ? 0 : 1;
  const leadingDays = (firstDay.getDay() - weekStart + 7) % 7;
  const firstVisibleDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    1 - leadingDays,
    12,
  );

  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        firstVisibleDate.getFullYear(),
        firstVisibleDate.getMonth(),
        firstVisibleDate.getDate() + index,
        12,
      ),
  );
}

export function getWeekdayLabels(locale: SupportedLocale) {
  const weekStart = locale === "en" ? 0 : 1;
  const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: "short",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const day = (weekStart + index) % 7;
    return formatter.format(new Date(2024, 0, 7 + day, 12));
  });
}

export function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
