import { formatDate, type SupportedLocale } from "@schedule-app/i18n";

export function serializeDateFieldValue(value: Date) {
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0"),
    )
    .join("-");
}

export function formatDateFieldValue(value: string, locale: SupportedLocale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [year, month, day] = value.split("-").map(Number);
  return formatDate(new Date(Date.UTC(year, month - 1, day, 12)), locale, {
    dateStyle: "long",
    timeZone: "UTC",
  });
}
