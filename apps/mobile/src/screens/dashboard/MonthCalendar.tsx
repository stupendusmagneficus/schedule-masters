import type { SupportedLocale } from "@schedule-app/i18n";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatCurrency,
  formatDate,
} from "@schedule-app/i18n";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getCalendarWorkloadLevel,
  type MonthCalendarDay,
} from "../../features/calendar/monthCalendar";
import type { CalendarMonthEntry } from "../../features/calendar/useCalendarMonthWindow";
import { colors, radii } from "../../theme/tokens";
import { typography } from "../../theme/typography";
import type { DashboardTabProps } from "./types";

const MONTH_ROW_HEIGHT = 336;

type MonthItem = CalendarMonthEntry & {
  readonly days: readonly MonthCalendarDay[];
};

type MonthCalendarProps = {
  readonly months: readonly MonthItem[];
  readonly isLoadingPrevious: boolean;
  readonly isLoadingNext: boolean;
  readonly loadPrevious: () => void;
  readonly loadNext: () => void;
  readonly locale: SupportedLocale;
  readonly onOpenSelectedDay: () => void;
  readonly onSelectDate: (date: string) => void;
  readonly selectedDate: string;
  readonly t: DashboardTabProps["t"];
  readonly timezone: string;
};

export function MonthCalendar({
  months,
  isLoadingPrevious,
  isLoadingNext,
  loadPrevious,
  loadNext,
  locale,
  onOpenSelectedDay,
  onSelectDate,
  selectedDate,
  t,
  timezone,
}: MonthCalendarProps) {
  const selectedDay = months
    .flatMap((month) => month.days)
    .find((day) => day.date === selectedDate);
  const listRef = useRef<FlatList<MonthItem>>(null);
  const scrollOffset = useRef(0);
  const firstMonth = useRef(months[0]?.month);
  useEffect(() => {
    const nextFirstMonth = months[0]?.month;
    const previousFirstMonth = firstMonth.current;
    if (
      nextFirstMonth &&
      previousFirstMonth &&
      nextFirstMonth !== previousFirstMonth
    ) {
      const addedAtStart = nextFirstMonth < previousFirstMonth;
      const offset = Math.max(
        0,
        scrollOffset.current + (addedAtStart ? 2 : -2) * MONTH_ROW_HEIGHT,
      );
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ animated: false, offset });
      });
      scrollOffset.current = offset;
    }
    firstMonth.current = nextFirstMonth;
  }, [months]);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      scrollOffset.current = contentOffset.y;
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      if (contentOffset.y < MONTH_ROW_HEIGHT * 0.55) loadPrevious();
      if (distanceFromBottom < MONTH_ROW_HEIGHT * 0.55) loadNext();
    },
    [loadNext, loadPrevious],
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={months}
        getItemLayout={(_, index) => ({
          index,
          length: MONTH_ROW_HEIGHT,
          offset: MONTH_ROW_HEIGHT * index,
        })}
        initialNumToRender={5}
        initialScrollIndex={1}
        keyExtractor={(item) => item.month}
        maxToRenderPerBatch={3}
        onEndReached={loadNext}
        onEndReachedThreshold={0.6}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator
        style={styles.monthList}
        testID="calendar-month-list"
        windowSize={5}
        renderItem={({ item }) => (
          <MonthGrid
            days={item.days}
            hasError={item.hasError}
            locale={locale}
            onSelectDate={onSelectDate}
            t={t}
          />
        )}
      />
      {isLoadingPrevious ? <MonthLoading style={styles.loadingTop} /> : null}
      {isLoadingNext ? <MonthLoading style={styles.loadingBottom} /> : null}
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

function MonthGrid({
  days,
  hasError,
  locale,
  onSelectDate,
  t,
}: {
  readonly days: readonly MonthCalendarDay[];
  readonly hasError: boolean;
  readonly locale: SupportedLocale;
  readonly onSelectDate: (date: string) => void;
  readonly t: MonthCalendarProps["t"];
}) {
  const month = days.find((day) => day.isCurrentMonth)?.date ?? days[0]?.date;
  if (!month) return <View style={styles.monthRow} />;
  const monthLabel = formatDate(
    new Date(`${month.slice(0, 7)}-15T12:00:00.000Z`),
    locale,
    { month: "long", timeZone: "UTC", year: "numeric" },
  );
  const weekdays = days.slice(0, 7);

  return (
    <View style={styles.monthRow}>
      <View style={styles.monthHeading}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        {hasError ? (
          <Text style={styles.error}>{t("common.error")}</Text>
        ) : null}
      </View>
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
            onPress={() => onSelectDate(day.date)}
            style={({ pressed }) => [
              styles.dayCell,
              !day.isCurrentMonth && styles.outsideDay,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.dayCircle,
                day.isClosed && styles.closedDay,
                day.isToday && styles.todayDay,
                day.isSelected && styles.selectedDay,
              ]}
            >
              {day.bookingCount > 0 ? (
                <View
                  accessibilityElementsHidden
                  style={[
                    getWorkloadRingStyle(
                      day.bookingCount,
                      day.isSelected
                        ? colors.actionText
                        : getWorkloadColor(day.bookingCount),
                    ),
                  ]}
                />
              ) : null}
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
                      {
                        color: day.isSelected
                          ? colors.actionText
                          : getWorkloadColor(day.bookingCount),
                      },
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
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MonthLoading({ style }: { readonly style: object }) {
  return (
    <View style={[styles.loadingRow, style]}>
      <ActivityIndicator color={colors.accent} size="small" />
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

function getWorkloadColor(bookingCount: number): string {
  switch (getCalendarWorkloadLevel(bookingCount)) {
    case "high":
      return colors.danger;
    case "medium":
      return colors.pendingText;
    default:
      return colors.accent;
  }
}

function getWorkloadRingStyle(bookingCount: number, color: string) {
  return [
    styles.workloadRing,
    {
      borderBottomColor: bookingCount >= 3 ? color : "transparent",
      borderLeftColor: bookingCount >= 4 ? color : "transparent",
      borderRightColor: bookingCount >= 2 ? color : "transparent",
      borderTopColor: color,
    },
  ];
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
    height: 42,
    justifyContent: "center",
    width: "14.2857%",
  },
  dayCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderRadius: radii.control,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
    width: 42,
  },
  dayNumber: { color: colors.primaryText, fontSize: 12, lineHeight: 15 },
  error: { ...typography.caption, color: colors.danger },
  indicators: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    height: 12,
    justifyContent: "center",
  },
  loadingRow: { alignItems: "center", height: 28, justifyContent: "center" },
  loadingBottom: { bottom: 2, left: 0, position: "absolute", right: 0 },
  loadingTop: { left: 0, position: "absolute", right: 0, top: 2 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 32,
    marginBottom: 6,
  },
  monthList: { flex: 1 },
  monthRow: { height: MONTH_ROW_HEIGHT, paddingBottom: 18 },
  monthTitle: {
    color: colors.primaryText,
    flex: 1,
    ...typography.label,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  openDayButton: {
    alignItems: "center",
    backgroundColor: colors.action,
    borderRadius: radii.control,
    justifyContent: "center",
    minHeight: 44,
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
  root: { flex: 1, minHeight: 0 },
  selectedDay: { backgroundColor: colors.accent, borderColor: colors.accent },
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
    marginTop: 8,
    paddingTop: 10,
  },
  summaryCopy: { flex: 1, gap: 2, minWidth: 0 },
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
  weekdayRow: { flexDirection: "row", height: 20, marginBottom: 4 },
  workloadRing: {
    borderRadius: radii.control,
    borderWidth: 2,
    height: 38,
    left: 1,
    position: "absolute",
    top: 1,
    width: 38,
  },
});
