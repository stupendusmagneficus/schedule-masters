import { formatCurrency, type SupportedLocale } from "@schedule-app/i18n";

/** Formats per-currency totals; an empty period reads as zero in the fallback currency, not a dash. */
export function formatAmountsByCurrency(
  amounts: Readonly<Record<string, number>>,
  locale: SupportedLocale,
  fallbackCurrency: string,
): string {
  const entries = Object.entries(amounts);
  if (entries.length === 0) return formatCurrency(0, locale, fallbackCurrency);
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatCurrency(amount, locale, currency))
    .join(" · ");
}
