import type { SupportedLocale } from "@schedule-app/i18n";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatCurrency,
  formatDate,
} from "@schedule-app/i18n";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MonthCalendarDay } from "../../features/calendar/monthCalendar";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { DashboardTabProps } from "./types";

type MonthCalendarProps = {
  readonly days: readonly MonthCalendarDay[];
  readonly locale: SupportedLocale;
  readonly onOpenSelectedDay: () => void;
  readonly onSelectDate: (date: string) => void;
  readonly selectedDate: string;
  readonly t: DashboardTabProps["t"];
  readonly timezone: string;
};

export function MonthCalendar({
  days,
  locale,
  onOpenSelectedDay,
  onSelectDate,
  selectedDate,
  t,
  timezone,
}: MonthCalendarProps) {
  const selectedDay = days.find((day) => day.date === selectedDate);
  const monthLabel = formatDate(
    new Date(`${selectedDate.slice(0, 7)}-15T12:00:00.000Z`),
    locale,
    { month: "long", timeZone: "UTC", year: "numeric" },
  );
  const weekdays = days.slice(0, 7);

  return (
    <View
      accessibilityLabel={t("mobile.calendarMonthView")}
      style={styles.root}
    >
      <Text style={styles.monthTitle}>{monthLabel}</Text>
      <View style={styles.weekdayRow}>
        {weekdays.map((day) => (
          <Text key={day.date} style={styles.weekday}>
            {formatDate(new Date(`${day.date}T12:00:00.000Z`), locale, {
              timeZone: "UTC",
              weekday: "short",
            }).replace(/\.$/, "")}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {days.map((day) => (
          <Pressable
            accessibilityLabel={getDayAccessibilityLabel(day, locale, t)}
            accessibilityRole="button"
            accessibilityState={{ selected: day.isSelected }}
            key={day.date}
            onPress={() => {
              onSelectDate(day.date);
              onOpenSelectedDay();
            }}
            style={({ pressed }) => [
              styles.dayCell,
              day.isClosed && styles.closedDay,
              !day.isCurrentMonth && styles.outsideDay,
              day.isToday && styles.todayDay,
              day.isSelected && styles.selectedDay,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.dayNumber,
                !day.isCurrentMonth && styles.outsideDayText,
                day.isSelected && styles.selectedDayText,
              ]}
            >
              {Number(day.date.slice(-2))}
            </Text>
            <View style={styles.indicators}>
              {day.bookingCount > 0 ? (
                <Text
                  style={[
                    styles.bookingCount,
                    day.isSelected && styles.selectedIndicator,
                  ]}
                >
                  {day.bookingCount}
                </Text>
              ) : null}
              {day.blockCount > 0 ? (
                <Text
                  style={[
                    styles.blockCount,
                    day.isSelected && styles.selectedIndicator,
                  ]}
                >
                  {day.blockCount}
                </Text>
              ) : null}
              {day.isClosed ? (
                <Text
                  style={[
                    styles.closedIndicator,
                    day.isSelected && styles.selectedIndicator,
                  ]}
                >
                  ×
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {selectedDay ? (
        <View style={styles.summary}>
          <View style={styles.summaryCopy}>
            <Text
              accessibilityLabel={formatAccessibleDate(
                new Date(`${selectedDay.date}T12:00:00.000Z`),
                locale,
                timezone,
              )}
              style={styles.summaryDate}
            >
              {formatCompactDate(
                new Date(`${selectedDay.date}T12:00:00.000Z`),
                locale,
                { timeZone: timezone },
              )}
            </Text>
            <Text style={styles.summaryDetails}>
              {selectedDay.isClosed
                ? t("mobile.calendarClosed")
                : selectedDay.bookingCount
                  ? `${selectedDay.bookingCount} ${t("mobile.monthBookings")}`
                  : t("mobile.monthNoBookings")}
              {selectedDay.blockCount > 0
                ? ` · ${selectedDay.blockCount} ${t("mobile.monthBlocks")}`
                : ""}
            </Text>
            <Text style={styles.summaryRevenue}>
              {t("mobile.expectedRevenue")}:{" "}
              {formatRevenue(selectedDay, locale)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSelectedDay}
            style={({ pressed }) => [
              styles.openDayButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.openDayText}>{t("mobile.monthOpenDay")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function formatRevenue(day: MonthCalendarDay, locale: SupportedLocale): string {
  const currencies = Object.entries(day.expectedRevenueByCurrency);
  if (currencies.length === 0) return formatCurrency(0, locale, "CZK");
  return currencies
    .map(([currency, amount]) => formatCurrency(amount, locale, currency))
    .join(" · ");
}

function getDayAccessibilityLabel(
  day: MonthCalendarDay,
  locale: SupportedLocale,
  t: MonthCalendarProps["t"],
) {
  const parts = [
    formatDate(new Date(`${day.date}T12:00:00.000Z`), locale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }),
    day.isToday ? t("mobile.today") : "",
    day.isClosed ? t("mobile.calendarClosed") : "",
    day.bookingCount
      ? `${day.bookingCount} ${t("mobile.monthBookings")}`
      : t("mobile.monthNoBookings"),
    day.blockCount ? `${day.blockCount} ${t("mobile.monthBlocks")}` : "",
  ];
  return parts.filter(Boolean).join(", ");
}

const styles = StyleSheet.create({
  blockCount: {
    backgroundColor: colors.subtleSurface,
    borderColor: colors.secondaryText,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.secondaryText,
    fontSize: 8,
    lineHeight: 11,
    minWidth: 12,
    overflow: "hidden",
    textAlign: "center",
  },
  bookingCount: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
    minWidth: 10,
    textAlign: "center",
  },
  closedDay: { backgroundColor: colors.subtleSurface },
  closedIndicator: {
    color: colors.secondaryText,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  dayCell: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: radii.control,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: "14.2857%",
  },
  dayNumber: {
    color: colors.primaryText,
    fontSize: 12,
    lineHeight: 15,
  },
  indicators: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    height: 12,
    justifyContent: "center",
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthTitle: {
    color: colors.primaryText,
    marginBottom: 10,
    textAlign: "center",
    ...typography.section,
  },
  openDayButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  openDayText: {
    color: colors.actionText,
    ...typography.caption,
    fontWeight: "700",
  },
  outsideDay: { opacity: 0.42 },
  outsideDayText: { color: colors.secondaryText },
  pressed: { opacity: 0.7 },
  root: { minWidth: 0 },
  selectedDay: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectedDayText: { color: colors.actionText, fontWeight: "700" },
  selectedIndicator: {
    color: colors.actionText,
    borderColor: colors.actionText,
  },
  summary: {
    alignItems: "center",
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
  },
  summaryCopy: { flex: 1, gap: 3, minWidth: 0 },
  summaryDate: {
    color: colors.primaryText,
    ...typography.label,
    fontWeight: "700",
  },
  summaryDetails: { color: colors.secondaryText, ...typography.caption },
  summaryRevenue: { color: colors.primaryText, ...typography.caption },
  todayDay: { borderColor: colors.accent, borderWidth: 1 },
  weekday: {
    color: colors.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    width: "14.2857%",
  },
  weekdayRow: { flexDirection: "row", marginBottom: 3 },
});
